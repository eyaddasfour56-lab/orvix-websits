import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { POST as createCashflowEntry } from "@/app/api/admin/cashflow/route";
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

type Person = "me" | "ahmed_samy";
type CashflowEntryType = "expense" | "income" | "capital" | "settlement";

type CashflowCommand = {
  kind: "cashflow";
  entryType: CashflowEntryType;
  amount: number;
  category: string;
  description: string;
  paidBy: Person | null;
  receivedBy: Person | null;
  fromPerson: Person | null;
  toPerson: Person | null;
  entryDate: string;
  confidence: number;
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

function egyptToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeLoose(value: string) {
  return value
    .toLowerCase()
    .replace(/[,_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPerson(value: unknown): value is Person {
  return value === "me" || value === "ahmed_samy";
}

function inferPerson(text: string): Person | null {
  const q = normalizeLoose(text);
  if (/ahmed\s*samy|ahmed\s*sami|a7med\s*samy|احمد\s*سامي|أحمد\s*سامي/.test(q)) return "ahmed_samy";
  if (/\bme\b|by me|from me|to me|for me|\bana\b|\b3alaya\b|\b3alya\b|\blya\b|\bliya\b|انا|أنا|عليا|ليا/.test(q)) return "me";
  return null;
}

function categoryFromText(text: string) {
  const q = normalizeLoose(text);
  const categories: Array<{ label: string; aliases: RegExp }> = [
    { label: "Tools", aliases: /\btools?\b|ادوات|أدوات|عدة|3eda/ },
    { label: "Delivery", aliases: /\bdelivery\b|courier|shipping|شحن|توصيل|دليفري|tawsil/ },
    { label: "Packaging", aliases: /packag|packing|boxes?|box|stickers?|bubble|wrapp|تغليف|بوكس|استيكر/ },
    { label: "Marketing", aliases: /marketing|ads?|advertis|اعلان|إعلان|تسويق/ },
    { label: "Transport", aliases: /uber|transport|taxi|مواصلات|اوبر|أوبر/ },
    { label: "Stock", aliases: /\bstock\b|inventory|بضاعة|ستوك|مخزون/ },
    { label: "Cards", aliases: /\bcards?\b|كروت|كارت/ },
  ];
  return categories.find((item) => item.aliases.test(q))?.label || "Other";
}

function looksLikeCashflowMutation(question: string) {
  const q = normalizeLoose(question);
  const hasAmount = /(^|\s)\d+(?:[.,]\d+)?(?=\s|$)/.test(q);
  const financeWord = /expense|expenses|income|capital|settlement|paid|spent|spend|received|invest|tools?|delivery|shipping|packag|cashflow|cash flow|مصروف|مصاريف|دخل|دفعت|دفع|قبض|استثمار|رأس مال|راس مال|تحويل|sagel|sجل|dfa3t|masareef|dakhl|d5l|7ot/;
  const mutationWord = /\badd\b|\brecord\b|\blog\b|\bsave\b|\bput\b|paid|spent|received|invested|sagel|dfa3t|7ot|سجل|سجّل|ضيف|أضف|اضف|حط|دفعت|دفعت|قبضت|استثمر/;
  return hasAmount && financeWord.test(q) && mutationWord.test(q);
}

function heuristicCashflowCommand(question: string): CashflowCommand | null {
  if (!looksLikeCashflowMutation(question)) return null;
  const q = normalizeLoose(question);
  const amountMatch = q.match(/(^|\s)(\d+(?:[.,]\d+)?)(?=\s|$)/);
  if (!amountMatch) return null;
  const amount = Number(amountMatch[2].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let entryType: CashflowEntryType = "expense";
  if (/\bincome\b|received|قبض|دخل|dakhl|d5l/.test(q)) entryType = "income";
  else if (/\bcapital\b|invest|استثمار|رأس مال|راس مال/.test(q)) entryType = "capital";
  else if (/\bsettlement\b|transfer|تحويل|حوّل|حول/.test(q)) entryType = "settlement";

  const person = inferPerson(question);
  const category = categoryFromText(question);

  return {
    kind: "cashflow",
    entryType,
    amount: Math.round(amount * 100) / 100,
    category,
    description: question.slice(0, 300),
    paidBy: entryType === "expense" || entryType === "capital" ? person : null,
    receivedBy: entryType === "income" ? person : null,
    fromPerson: null,
    toPerson: null,
    entryDate: egyptToday(),
    confidence: category === "Other" ? 0.72 : 0.84,
  };
}

function parseJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function aiCashflowCommand(question: string): Promise<CashflowCommand | null> {
  if (!looksLikeCashflowMutation(question)) return null;

  try {
    const today = egyptToday();
    const { text } = await generateText({
      model: "openai/gpt-5.6-luna",
      prompt: `You are the command parser for ORVIX Admin. The owner may write English, Arabic, Egyptian Arabic, Franco-Arabic, mixed language, slang, shorthand, or typos.\n\nDecide whether the message is an instruction to ADD one cash-flow entry. Do NOT treat questions, reports, deletes, edits, or normal chat as add commands.\n\nReturn ONLY one JSON object with this exact shape:\n{\"isMutation\":boolean,\"entryType\":\"expense|income|capital|settlement|null\",\"amount\":number|null,\"category\":string|null,\"description\":string|null,\"paidBy\":\"me|ahmed_samy|null\",\"receivedBy\":\"me|ahmed_samy|null\",\"fromPerson\":\"me|ahmed_samy|null\",\"toPerson\":\"me|ahmed_samy|null\",\"entryDate\":\"YYYY-MM-DD|null\",\"confidence\":number}\n\nRules:\n- Today in Egypt is ${today}. Default entryDate to today unless the owner clearly gives another date.\n- \"me\", \"ana\", \"lya\", \"3alaya\", \"from me\", \"paid by me\" mean me.\n- \"Ahmed Samy\", \"Ahmed\", \"A7med Samy\", \"احمد سامي\" mean ahmed_samy when unambiguous.\n- Expense/capital require paidBy. Income requires receivedBy. Settlement requires fromPerson and toPerson.\n- Never invent a person if the message does not identify one.\n- Category should be short and useful, e.g. Tools, Delivery, Packaging, Marketing, Stock, Transport, Cards, Other.\n- Example: \"add to expenses 120 tools paid by me\" => expense, 120, Tools, paidBy me.\n- Example: \"ana dfa3t 200 delivery\" => expense, 200, Delivery, paidBy me.\n- Example: \"500 income for ahmed samy\" => income, 500, receivedBy ahmed_samy.\n\nOWNER MESSAGE:\n${question}`,
    });

    const parsed = parseJsonObject(text);
    if (!parsed || parsed.isMutation !== true) return null;

    const entryType = parsed.entryType;
    if (entryType !== "expense" && entryType !== "income" && entryType !== "capital" && entryType !== "settlement") return null;

    const amount = Number(parsed.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return null;

    const paidBy = isPerson(parsed.paidBy) ? parsed.paidBy : null;
    const receivedBy = isPerson(parsed.receivedBy) ? parsed.receivedBy : null;
    const fromPerson = isPerson(parsed.fromPerson) ? parsed.fromPerson : null;
    const toPerson = isPerson(parsed.toPerson) ? parsed.toPerson : null;
    const rawDate = clean(parsed.entryDate);
    const entryDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;
    const category = clean(parsed.category).slice(0, 80) || categoryFromText(question);
    const confidence = Math.max(0, Math.min(Number(parsed.confidence) || 0, 1));

    if (confidence < 0.65) return null;

    return {
      kind: "cashflow",
      entryType,
      amount: Math.round(amount * 100) / 100,
      category,
      description: clean(parsed.description).slice(0, 300) || question.slice(0, 300),
      paidBy,
      receivedBy,
      fromPerson,
      toPerson,
      entryDate,
      confidence,
    };
  } catch (error) {
    console.error("ORVIX AI cashflow parser error:", error);
    return null;
  }
}

function personLabel(person: Person | null) {
  if (person === "me") return "you";
  if (person === "ahmed_samy") return "Ahmed Samy";
  return "unassigned";
}

async function executeCashflowCommand(request: NextRequest, command: CashflowCommand) {
  if (!hasAdminPermission(request, "cashflow")) {
    return NextResponse.json({ success: false, message: "Your role cannot change cash flow." }, { status: 403 });
  }

  if ((command.entryType === "expense" || command.entryType === "capital") && !command.paidBy) {
    return NextResponse.json({
      success: true,
      ai: false,
      answer: `I understood ${command.amount.toLocaleString("en-GB")} EGP as ${command.entryType} (${command.category}), but I need to know who paid it: you or Ahmed Samy.`,
    });
  }

  if (command.entryType === "income" && !command.receivedBy) {
    return NextResponse.json({
      success: true,
      ai: false,
      answer: `I understood ${command.amount.toLocaleString("en-GB")} EGP as income (${command.category}), but I need to know who received it: you or Ahmed Samy.`,
    });
  }

  if (command.entryType === "settlement" && (!command.fromPerson || !command.toPerson || command.fromPerson === command.toPerson)) {
    return NextResponse.json({
      success: true,
      ai: false,
      answer: `I understood a ${command.amount.toLocaleString("en-GB")} EGP settlement, but I need both directions: from you to Ahmed Samy, or from Ahmed Samy to you.`,
    });
  }

  const forwarded = new NextRequest(new URL("/api/admin/cashflow", request.url), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      entryType: command.entryType,
      category: command.category,
      amount: command.amount,
      description: command.description,
      paidBy: command.paidBy,
      receivedBy: command.receivedBy,
      fromPerson: command.fromPerson,
      toPerson: command.toPerson,
      entryDate: command.entryDate,
    }),
  });

  const response = await createCashflowEntry(forwarded);
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    entry?: { id?: string } | null;
  };

  if (!response.ok || !payload.success) {
    return NextResponse.json({
      success: false,
      message: payload.message || "Could not add the cash-flow entry.",
    }, { status: response.status || 500 });
  }

  const who =
    command.entryType === "income"
      ? `received by ${personLabel(command.receivedBy)}`
      : command.entryType === "settlement"
        ? `from ${personLabel(command.fromPerson)} to ${personLabel(command.toPerson)}`
        : `paid by ${personLabel(command.paidBy)}`;

  if (payload.entry?.id) {
    await auditAdminAction(request, "ai_cashflow_entry_create", "cashflow_entry", payload.entry.id, {
      entryType: command.entryType,
      category: command.category,
      amount: command.amount,
      paidBy: command.paidBy,
      receivedBy: command.receivedBy,
      fromPerson: command.fromPerson,
      toPerson: command.toPerson,
      entryDate: command.entryDate,
    });
  }

  return NextResponse.json({
    success: true,
    ai: true,
    answer: `Done — added ${command.amount.toLocaleString("en-GB")} EGP to ${command.entryType === "expense" ? "Expenses" : command.entryType === "income" ? "Income" : command.entryType === "capital" ? "Capital" : "Settlements"} under ${command.category}, ${who}.`,
    action: {
      type: "cashflow_entry_created",
      entryType: command.entryType,
      category: command.category,
      amount: command.amount,
      paidBy: command.paidBy,
      receivedBy: command.receivedBy,
      fromPerson: command.fromPerson,
      toPerson: command.toPerson,
      entryDate: command.entryDate,
    },
  });
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
    if (!command) {
      const aiParsed = await aiCashflowCommand(question);
      const cashflowCommand = aiParsed || heuristicCashflowCommand(question);
      if (cashflowCommand) return executeCashflowCommand(request, cashflowCommand);
      return forwardToAssistant(request, question);
    }

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
