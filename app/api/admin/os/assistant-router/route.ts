import { NextRequest, NextResponse } from "next/server";
import { POST as askAssistant } from "@/app/api/admin/os/assistant/route";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  stock_quantity: number;
  allow_purchase: boolean;
};

type Variant = {
  id: string;
  variant_key: string;
  label: string;
  stock_quantity: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function confirmed(question: string) {
  return /\bconfirm\b/i.test(question) || /أكد التنفيذ|اكد التنفيذ|تنفيذ مؤكد/.test(question);
}

function stripConfirmation(question: string) {
  return question
    .replace(/\bconfirm\b/gi, "")
    .replace(/أكد التنفيذ|اكد التنفيذ|تنفيذ مؤكد/g, "")
    .trim();
}

function parseCommand(question: string) {
  const q = stripConfirmation(question);

  const checkout = q.match(/^checkout\s*=\s*(on|off)$/i);
  if (checkout) return { kind: "checkout" as const, enabled: checkout[1].toLowerCase() === "on" };

  const stock = q.match(/^stock\s+([a-z0-9-]+)(?::([a-z0-9-]+))?\s*=\s*(\d+)$/i);
  if (stock) {
    return {
      kind: "stock" as const,
      slug: stock[1].toLowerCase(),
      variantKey: stock[2]?.toLowerCase() || null,
      quantity: Number(stock[3]),
    };
  }

  const price = q.match(/^price\s+([a-z0-9-]+)\s*=\s*(\d+(?:\.\d+)?)$/i);
  if (price) {
    return {
      kind: "price" as const,
      slug: price[1].toLowerCase(),
      price: Number(price[2]),
    };
  }

  const sale = q.match(/^sale\s+([a-z0-9-]+)\s*=\s*(on|off)$/i);
  if (sale) {
    return {
      kind: "sale" as const,
      slug: sale[1].toLowerCase(),
      enabled: sale[2].toLowerCase() === "on",
    };
  }

  return null;
}

async function getProduct(slug: string) {
  const rows = await supabaseAdminJson<Product[]>(
    `products?slug=eq.${postgrestValue(slug)}&select=id,name,slug,price,stock_quantity,allow_purchase&limit=1`
  );
  return rows[0] || null;
}

async function forwardToAssistant(request: NextRequest, question: string) {
  const forwarded = new NextRequest(new URL("/api/admin/os/assistant", request.url), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ question }),
  });
  return askAssistant(forwarded);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "assistant")) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const question = clean(body.question).slice(0, 700);
    if (!question) {
      return NextResponse.json({ success: false, message: "Ask a question first." }, { status: 400 });
    }

    const command = parseCommand(question);
    if (!command) return forwardToAssistant(request, question);

    if (!hasAdminPermission(request, "inventory")) {
      return NextResponse.json({ success: false, message: "Your role cannot change commerce settings." }, { status: 403 });
    }

    if (!confirmed(question)) {
      let preview = "";
      if (command.kind === "checkout") preview = `turn checkout ${command.enabled ? "ON" : "OFF"}`;
      if (command.kind === "stock") preview = `set ${command.slug}${command.variantKey ? `:${command.variantKey}` : ""} stock to ${command.quantity}`;
      if (command.kind === "price") preview = `set ${command.slug} price to ${command.price.toLocaleString("en-GB")} EGP`;
      if (command.kind === "sale") preview = `turn ${command.slug} sale ${command.enabled ? "ON" : "OFF"}`;

      return NextResponse.json({
        success: true,
        ai: false,
        answer: `Ready to ${preview}. Nothing changed yet. Add “confirm” to the same command to execute it.`,
        action: { type: "confirmation_required", command: `${stripConfirmation(question)} confirm` },
      });
    }

    if (command.kind === "checkout") {
      await supabaseAdminJson("commerce_settings?id=eq.default", {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ checkout_enabled: command.enabled, updated_at: new Date().toISOString() }),
      });
      await auditAdminAction(request, "ai_checkout_toggle", "commerce_settings", "default", { checkout_enabled: command.enabled });
      return NextResponse.json({
        success: true,
        ai: false,
        answer: `Done. Checkout is now ${command.enabled ? "OPEN" : "PAUSED"}.`,
        action: { type: "commerce_update", target: "checkout", value: command.enabled },
      });
    }

    const product = await getProduct(command.slug);
    if (!product) {
      return NextResponse.json({ success: false, message: `Product ${command.slug} was not found.` }, { status: 404 });
    }

    if (command.kind === "stock") {
      if (!Number.isInteger(command.quantity) || command.quantity < 0 || command.quantity > 100000) {
        return NextResponse.json({ success: false, message: "Invalid stock quantity." }, { status: 400 });
      }

      const variants = await supabaseAdminJson<Variant[]>(
        `product_variants?product_id=eq.${postgrestValue(product.id)}&select=id,variant_key,label,stock_quantity&order=display_order.asc,created_at.asc`
      );

      if (variants.length && !command.variantKey) {
        return NextResponse.json({
          success: true,
          ai: false,
          answer: `${product.name} uses variant stock. Choose one: ${variants.map((variant) => `${variant.variant_key} (${variant.stock_quantity})`).join(", ")}. Example: Stock ${product.slug}:${variants[0].variant_key} = 5 confirm`,
        });
      }

      if (command.variantKey) {
        const variant = variants.find((item) => item.variant_key.toLowerCase() === command.variantKey);
        if (!variant) {
          return NextResponse.json({ success: false, message: `Variant ${command.variantKey} was not found for ${product.name}.` }, { status: 404 });
        }
        await supabaseAdminJson(`product_variants?id=eq.${postgrestValue(variant.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ stock_quantity: command.quantity, updated_at: new Date().toISOString() }),
        });
        await auditAdminAction(request, "ai_variant_stock_update", "product_variant", variant.id, {
          product: product.slug,
          variant: variant.variant_key,
          from: variant.stock_quantity,
          to: command.quantity,
        });
        return NextResponse.json({
          success: true,
          ai: false,
          answer: `Done. ${product.name} · ${variant.label} stock changed from ${variant.stock_quantity} to ${command.quantity}.`,
          action: { type: "commerce_update", target: "variant_stock", productSlug: product.slug, variantKey: variant.variant_key, value: command.quantity },
        });
      }

      await supabaseAdminJson(`products?id=eq.${postgrestValue(product.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ stock_quantity: command.quantity, updated_at: new Date().toISOString() }),
      });
      await auditAdminAction(request, "ai_product_stock_update", "product", product.id, { from: product.stock_quantity, to: command.quantity });
      return NextResponse.json({
        success: true,
        ai: false,
        answer: `Done. ${product.name} stock changed from ${product.stock_quantity} to ${command.quantity}.`,
        action: { type: "commerce_update", target: "stock", productSlug: product.slug, value: command.quantity },
      });
    }

    if (command.kind === "price") {
      if (!Number.isFinite(command.price) || command.price < 0 || command.price > 10000000) {
        return NextResponse.json({ success: false, message: "Invalid product price." }, { status: 400 });
      }
      await supabaseAdminJson(`products?id=eq.${postgrestValue(product.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ price: command.price, updated_at: new Date().toISOString() }),
      });
      await auditAdminAction(request, "ai_product_price_update", "product", product.id, { from: Number(product.price || 0), to: command.price });
      return NextResponse.json({
        success: true,
        ai: false,
        answer: `Done. ${product.name} price changed from ${Number(product.price || 0).toLocaleString("en-GB")} to ${command.price.toLocaleString("en-GB")} EGP.`,
        action: { type: "commerce_update", target: "price", productSlug: product.slug, value: command.price },
      });
    }

    await supabaseAdminJson(`products?id=eq.${postgrestValue(product.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ allow_purchase: command.enabled, updated_at: new Date().toISOString() }),
    });
    await auditAdminAction(request, "ai_product_sale_toggle", "product", product.id, { from: product.allow_purchase, to: command.enabled });
    return NextResponse.json({
      success: true,
      ai: false,
      answer: `Done. ${product.name} is now ${command.enabled ? "available for sale" : "blocked from sale"}.`,
      action: { type: "commerce_update", target: "sale", productSlug: product.slug, value: command.enabled },
    });
  } catch (error) {
    console.error("ORVIX AI commerce router error:", error);
    return NextResponse.json({ success: false, message: "ORVIX AI could not complete this action." }, { status: 500 });
  }
}
