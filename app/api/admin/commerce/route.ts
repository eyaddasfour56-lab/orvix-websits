import { NextRequest, NextResponse } from "next/server";
import {
  isAdminAuthenticated,
  readAdminRole,
} from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  low_stock_limit: number;
  allow_purchase: boolean;
  status: string;
  available_from?: string | null;
  available_until?: string | null;
};

function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

function forbidden() {
  return NextResponse.json(
    { success: false, message: "Owner or Manager access is required." },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function number(value: unknown, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function nullableDate(value: unknown) {
  const cleaned = text(value);
  if (!cleaned) return null;
  const date = new Date(cleaned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function loadDashboard() {
  const [settingsRows, products, variants, schedules, jobs, health] = await Promise.all([
    supabaseAdminJson<Array<Record<string, unknown>>>(
      "commerce_settings?id=eq.default&select=*"
    ),
    supabaseAdminJson<ProductRow[]>(
      "products?select=id,name,slug,price,stock_quantity,low_stock_limit,allow_purchase,status,available_from,available_until&order=display_order.asc,created_at.asc"
    ),
    supabaseAdminJson<Array<Record<string, unknown>>>(
      "product_variants?select=*&order=product_id.asc,display_order.asc,created_at.asc"
    ),
    supabaseAdminJson<Array<Record<string, unknown>>>(
      "product_price_schedules?select=*&order=starts_at.desc,created_at.desc&limit=100"
    ),
    supabaseAdminJson<Array<Record<string, unknown>>>(
      "commerce_jobs?status=in.(pending,processing,dead)&select=*&order=created_at.desc&limit=50"
    ),
    supabaseAdminJson<Record<string, unknown>>(
      "rpc/orvix_health_snapshot",
      { method: "POST", body: "{}" }
    ),
  ]);

  return {
    settings: settingsRows[0] || {},
    products,
    variants,
    schedules,
    jobs,
    health,
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
    const data = await loadDashboard();
    return NextResponse.json(
      { success: true, ...data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Commerce admin GET error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load Commerce Control." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (readAdminRole(request) === "orders") return forbidden();

  try {
    const body = await request.json();
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.checkoutEnabled === "boolean") payload.checkout_enabled = body.checkoutEnabled;
    if (typeof body.queueEnabled === "boolean") payload.queue_enabled = body.queueEnabled;
    if (body.maxQuantityPerOrder !== undefined) {
      payload.max_quantity_per_order = Math.max(1, Math.min(Math.round(number(body.maxQuantityPerOrder, 10)), 100));
    }
    if (body.rateLimitPerMinute !== undefined) {
      payload.rate_limit_per_minute = Math.max(1, Math.min(Math.round(number(body.rateLimitPerMinute, 20)), 1000));
    }
    if (body.duplicateWindowSeconds !== undefined) {
      payload.duplicate_window_seconds = Math.max(60, Math.min(Math.round(number(body.duplicateWindowSeconds, 600)), 86400));
    }

    await supabaseAdminJson(
      "commerce_settings?id=eq.default",
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      }
    );

    await auditAdminAction(request, "update_commerce_settings", "commerce_settings", "default", payload);
    const data = await loadDashboard();
    return NextResponse.json({ success: true, message: "Commerce settings updated.", ...data });
  } catch (error) {
    console.error("Commerce admin PATCH error:", error);
    return NextResponse.json(
      { success: false, message: "Could not update Commerce settings." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
    const body = await request.json();
    const action = text(body.action);
    const role = readAdminRole(request);

    if (action === "create_variant") {
      if (role === "orders") return forbidden();
      const productId = text(body.productId);
      const variantKey = text(body.variantKey).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const label = text(body.label);
      if (!productId || !variantKey || !label) {
        return NextResponse.json({ success: false, message: "Product, variant key and label are required." }, { status: 400 });
      }
      const payload = {
        product_id: productId,
        variant_key: variantKey,
        label,
        stock_quantity: Math.max(0, Math.round(number(body.stockQuantity))),
        low_stock_limit: Math.max(0, Math.round(number(body.lowStockLimit, 2))),
        allow_purchase: body.allowPurchase !== false,
        active: body.active !== false,
        display_order: Math.round(number(body.displayOrder)),
        updated_at: new Date().toISOString(),
      };
      await supabaseAdminJson("product_variants", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "create_product_variant", "product", productId, payload);
    } else if (action === "update_variant") {
      if (role === "orders") return forbidden();
      const id = text(body.id);
      if (!id) return NextResponse.json({ success: false, message: "Variant ID is required." }, { status: 400 });
      const payload = {
        label: text(body.label),
        stock_quantity: Math.max(0, Math.round(number(body.stockQuantity))),
        low_stock_limit: Math.max(0, Math.round(number(body.lowStockLimit, 2))),
        allow_purchase: Boolean(body.allowPurchase),
        active: Boolean(body.active),
        display_order: Math.round(number(body.displayOrder)),
        updated_at: new Date().toISOString(),
      };
      await supabaseAdminJson(`product_variants?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "update_product_variant", "product_variant", id, payload);
    } else if (action === "create_schedule") {
      if (role === "orders") return forbidden();
      const productId = text(body.productId);
      const price = number(body.price, -1);
      const startsAt = nullableDate(body.startsAt);
      const endsAt = nullableDate(body.endsAt);
      if (!productId || price < 0 || !startsAt) {
        return NextResponse.json({ success: false, message: "Product, valid price and start date are required." }, { status: 400 });
      }
      if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
        return NextResponse.json({ success: false, message: "End time must be after start time." }, { status: 400 });
      }
      const compareAt = text(body.compareAtPrice) ? Math.max(0, number(body.compareAtPrice)) : null;
      const payload = {
        product_id: productId,
        price: Math.max(0, price),
        compare_at_price: compareAt,
        starts_at: startsAt,
        ends_at: endsAt,
        priority: Math.round(number(body.priority)),
        active: body.active !== false,
        updated_at: new Date().toISOString(),
      };
      await supabaseAdminJson("product_price_schedules", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "create_price_schedule", "product", productId, payload);
    } else if (action === "toggle_schedule") {
      if (role === "orders") return forbidden();
      const id = text(body.id);
      if (!id) return NextResponse.json({ success: false, message: "Schedule ID is required." }, { status: 400 });
      const payload = { active: Boolean(body.active), updated_at: new Date().toISOString() };
      await supabaseAdminJson(`product_price_schedules?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "toggle_price_schedule", "price_schedule", id, payload);
    } else if (action === "update_product_window") {
      if (role === "orders") return forbidden();
      const productId = text(body.productId);
      if (!productId) return NextResponse.json({ success: false, message: "Product is required." }, { status: 400 });
      const availableFrom = nullableDate(body.availableFrom);
      const availableUntil = nullableDate(body.availableUntil);
      if (availableFrom && availableUntil && new Date(availableUntil) <= new Date(availableFrom)) {
        return NextResponse.json({ success: false, message: "Availability end must be after its start." }, { status: 400 });
      }
      const payload = {
        available_from: availableFrom,
        available_until: availableUntil,
        updated_at: new Date().toISOString(),
      };
      await supabaseAdminJson(`products?id=eq.${encodeURIComponent(productId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "update_product_availability_window", "product", productId, payload);
    } else if (action === "retry_job") {
      const id = text(body.id);
      if (!id) return NextResponse.json({ success: false, message: "Job ID is required." }, { status: 400 });
      const payload = {
        status: "pending",
        attempts: 0,
        run_after: new Date().toISOString(),
        locked_at: null,
        completed_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      };
      await supabaseAdminJson(`commerce_jobs?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
      await auditAdminAction(request, "retry_commerce_job", "commerce_job", id, {});
    } else if (action === "run_housekeeping") {
      if (role === "orders") return forbidden();
      await supabaseAdminJson("rpc/orvix_commerce_housekeeping", { method: "POST", body: "{}" });
      await auditAdminAction(request, "run_commerce_housekeeping", "system", "commerce", {});
    } else {
      return NextResponse.json({ success: false, message: "Unknown Commerce action." }, { status: 400 });
    }

    const data = await loadDashboard();
    return NextResponse.json({ success: true, message: "Commerce Control updated.", ...data });
  } catch (error) {
    console.error("Commerce admin action error:", error);
    return NextResponse.json(
      { success: false, message: "Could not complete this Commerce action." },
      { status: 500 }
    );
  }
}
