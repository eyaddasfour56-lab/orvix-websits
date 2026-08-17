import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { POST as legacyAssistant } from "@/app/api/admin/os/assistant-router/route";
import { PATCH as patchOrderStatus } from "@/app/api/admin/order-status/route";
import { POST as runOsAction } from "@/app/api/admin/os/route";
import { POST as runChatAction } from "@/app/api/admin/chat/route";
import { auditAdminAction } from "@/lib/admin-audit";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { getMaintenanceStatus, setMaintenanceStatus } from "@/lib/maintenance-mode";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AdminActionName =
  | "order_status"
  | "process_order"
  | "return_refund"
  | "product_update"
  | "product_create"
  | "product_delete"
  | "checkout_toggle"
  | "maintenance_toggle"
  | "cashflow_add"
  | "cashflow_update"
  | "cashflow_delete"
  | "discount_create"
  | "discount_update"
  | "discount_delete"
  | "feature_flag_update"
  | "review_status"
  | "review_delete"
  | "waitlist_status"
  | "waitlist_delete"
  | "chat_reply"
  | "chat_status"
  | "chat_ai_mode"
  | "support_ai_toggle"
  | "analytics_reset"
  | "orders_reset"
  | "notification_read";

type PlannedAction = {
  action: AdminActionName;
  confidence: number;
  target?: string | null;
  args?: Record<string, unknown>;
};

type GenericRow = Record<string, unknown>;

const ORDER_STATUSES = new Set(["new", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"]);
const PRODUCT_STATUSES = new Set(["available", "coming_soon", "out_of_stock", "hidden"]);
const REVIEW_STATUSES = new Set(["pending", "approved", "rejected"]);
const WAITLIST_STATUSES = new Set(["waiting", "notified", "cancelled"]);
const DESTRUCTIVE_ACTIONS = new Set<AdminActionName>([
  "product_delete",
  "cashflow_delete",
  "discount_delete",
  "review_delete",
  "waitlist_delete",
  "analytics_reset",
  "orders_reset",
]);

function clean(value: unknown, max = 700) {
  return String(value ?? "").trim().slice(0, max);
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  const q = clean(value, 40).toLowerCase();
  return ["true", "1", "on", "yes", "enabled", "enable", "open", "available"].includes(q);
}

function normalize(value: unknown) {
  return clean(value, 1000)
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff@.+ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isConfirmed(question: string) {
  return /\bconfirm(?:ed)?\b/i.test(question) || /اكد التنفيذ|أكد التنفيذ|تنفيذ مؤكد|متأكد|متاكد/.test(question);
}

function cairoToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
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

function safeArgs(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function planActions(question: string): Promise<PlannedAction[]> {
  const { text } = await generateText({
    model: "openai/gpt-5.6-luna",
    prompt: `You are the command planner for ORVIX Admin. The owner writes natural English, Arabic, Egyptian Arabic, Franco-Arabic, slang, shorthand, mixed language and typos.\n\nYour job is ONLY to decide whether the owner is clearly asking the dashboard to DO something. Questions and requests to show/explain/analyse data are NOT actions. Never invent missing critical data. You may return multiple actions when the owner clearly asks for multiple changes.\n\nReturn ONLY JSON in this shape:\n{"actions":[{"action":"ACTION_NAME","confidence":0.0,"target":"optional human target","args":{}}]}\nReturn {"actions":[]} for read-only questions.\n\nAllowed ACTION_NAME values and args:\n- order_status: target=order number/customer/phone, args.status=new|confirmed|shipped|out_for_delivery|delivered|cancelled\n- process_order: target=order number/customer/phone (confirm + reserve stock + dispatch Bosta)\n- return_refund: target=order, args.reason, refundAmount, restock\n- product_update: target=product name/slug, args may contain price, stockQuantity, lowStockLimit, status, allowPurchase, showOnHomepage, allowWishlist, name, shortDescription, description\n- product_create: args name, slug, price, stockQuantity, lowStockLimit, status, allowPurchase, showOnHomepage, shortDescription, description\n- product_delete: target=product\n- checkout_toggle: args.enabled boolean\n- maintenance_toggle: args.enabled boolean. enabled=true means close store / under construction\n- cashflow_add: args.entryType=expense|income|capital|settlement, amount, category, description, paidBy=me|ahmed_samy|null, receivedBy=me|ahmed_samy|null, fromPerson=me|ahmed_samy|null, toPerson=me|ahmed_samy|null, entryDate=YYYY-MM-DD optional\n- cashflow_update: target=id/latest matching entry, args may contain amount, category, description, paidBy, receivedBy, entryDate\n- cashflow_delete: target=id/latest matching entry\n- discount_create: args code, discountType=free_delivery|percentage|fixed_amount, discountValue, minimumOrderValue, maximumDiscount, usageLimit, startsAt, expiresAt, active\n- discount_update: target=discount code, args may contain code, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, startsAt, expiresAt, active\n- discount_delete: target=discount code\n- feature_flag_update: target=flag key, args.enabled and/or rolloutPercent\n- review_status: target=id/latest pending/customer text, args.status=pending|approved|rejected\n- review_delete: target=id/latest/customer text\n- waitlist_status: target=id/latest/name/phone/email/product, args.status=waiting|notified|cancelled\n- waitlist_delete: target=id/latest/name/phone/email/product\n- chat_reply: target=conversation id/customer name/phone/latest waiting, args.message\n- chat_status: target=conversation, args.status=open|closed\n- chat_ai_mode: target=conversation, args.mode=ai|human\n- support_ai_toggle: args.enabled boolean\n- analytics_reset: no args\n- orders_reset: no args\n- notification_read: target=id/title/latest\n\nInterpret intent semantically, not by exact wording. Examples: \"5aly order ORVIX-123 confirmed\" => order_status. \"el website under construction\" when phrased as a command => maintenance_toggle enabled true. \"make fitbit 7400\" => product_update price 7400. \"orvix15 off\" => discount_update active false. \"approve latest review\" => review_status. \"reply to Ahmed tell him order confirmed\" => chat_reply. \"add 120 tools paid by me\" => cashflow_add.\n\nDo not convert a question like \"is checkout off?\" or \"how much stock?\" into an action. Confidence must be >=0.72 only when the instruction is clear.\n\nOWNER MESSAGE:\n${question}`,
  });

  const parsed = parseJsonObject(text);
  if (!parsed || !Array.isArray(parsed.actions)) return [];

  return parsed.actions
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        action: clean(row.action, 80) as AdminActionName,
        confidence: n(row.confidence),
        target: row.target == null ? null : clean(row.target, 300),
        args: safeArgs(row.args),
      };
    })
    .filter((item) => item.confidence >= 0.72 && isAllowedAction(item.action))
    .slice(0, 5);
}

function isAllowedAction(value: string): value is AdminActionName {
  return [
    "order_status", "process_order", "return_refund", "product_update", "product_create", "product_delete",
    "checkout_toggle", "maintenance_toggle", "cashflow_add", "cashflow_update", "cashflow_delete",
    "discount_create", "discount_update", "discount_delete", "feature_flag_update", "review_status", "review_delete",
    "waitlist_status", "waitlist_delete", "chat_reply", "chat_status", "chat_ai_mode", "support_ai_toggle",
    "analytics_reset", "orders_reset", "notification_read",
  ].includes(value);
}

function matchScore(row: GenericRow, target: string, preferred: string[]) {
  const q = normalize(target);
  if (!q) return 0;
  let score = 0;
  for (const key of preferred) {
    const value = normalize(row[key]);
    if (!value) continue;
    if (value === q) score = Math.max(score, 100);
    else if (value.includes(q) || q.includes(value)) score = Math.max(score, 80);
    else {
      const words = q.split(" ").filter((w) => w.length >= 2);
      const hits = words.filter((w) => value.includes(w)).length;
      if (hits) score = Math.max(score, 30 + hits * 8);
    }
  }
  const json = normalize(JSON.stringify(row));
  if (json.includes(q)) score = Math.max(score, 65);
  return score;
}

function chooseRow(rows: GenericRow[], target: string | null | undefined, preferred: string[], options?: { latestStatus?: string }) {
  if (!rows.length) return null;
  const q = normalize(target);
  if (!q || q === "latest" || q.includes("latest") || q.includes("اخر") || q.includes("آخر")) {
    if (options?.latestStatus) return rows.find((row) => clean(row.status, 40) === options.latestStatus) || rows[0];
    return rows[0];
  }
  const ranked = rows
    .map((row) => ({ row, score: matchScore(row, q, preferred) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.row || null;
}

async function getOrder(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>(
    "orders?select=id,order_number,customer_name,phone,status,total_price,quantity,product_name,product_slug,bosta_delivery_id,created_at&order=created_at.desc&limit=800"
  );
  return chooseRow(rows, target, ["order_number", "customer_name", "phone"]);
}

async function getProduct(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>(
    "products?select=id,name,slug,price,stock_quantity,low_stock_limit,status,allow_purchase,show_on_homepage,allow_wishlist,short_description,description&order=display_order.asc,created_at.asc"
  );
  return chooseRow(rows, target, ["slug", "name"]);
}

async function getDiscount(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>("delivery_discount_codes?select=*&order=created_at.desc");
  return chooseRow(rows, target, ["code"]);
}

async function getCashflow(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>("cashflow_entries?select=*&order=entry_date.desc,created_at.desc&limit=500");
  return chooseRow(rows, target, ["id", "category", "description", "entry_type"]);
}

async function getReview(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>("reviews?select=*&order=created_at.desc&limit=300");
  return chooseRow(rows, target, ["id", "customer_name", "name", "email", "review", "comment", "product_name"], { latestStatus: "pending" });
}

async function getWaitlist(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>("product_waitlist?select=*&order=created_at.desc&limit=500");
  return chooseRow(rows, target, ["id", "name", "customer_name", "phone", "email", "product_name", "product_slug"], { latestStatus: "waiting" });
}

async function getChat(target?: string | null) {
  const rows = await supabaseAdminJson<GenericRow[]>(
    "customer_chat_sessions?select=id,customer_name,customer_phone,status,last_sender,last_message_preview,last_message_at,human_requested,ai_paused&order=last_message_at.desc&limit=300"
  );
  return chooseRow(rows, target, ["id", "customer_name", "customer_phone", "last_message_preview"]);
}

async function callJson(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || payload.success === false) {
    throw new Error(clean(payload.message, 500) || "Action failed.");
  }
  return payload;
}

function actionHref(action: AdminActionName) {
  if (["order_status", "process_order", "return_refund", "orders_reset"].includes(action)) return "/admin/orders";
  if (["product_update", "product_create", "product_delete"].includes(action)) return "/admin/products";
  if (["cashflow_add", "cashflow_update", "cashflow_delete"].includes(action)) return "/admin/cashflow";
  if (["discount_create", "discount_update", "discount_delete"].includes(action)) return "/admin/discounts";
  if (["review_status", "review_delete"].includes(action)) return "/admin/reviews";
  if (["waitlist_status", "waitlist_delete"].includes(action)) return "/admin/waitlist";
  if (["chat_reply", "chat_status", "chat_ai_mode", "support_ai_toggle"].includes(action)) return "/admin/chats";
  if (action === "analytics_reset") return "/admin/analytics";
  if (action === "feature_flag_update") return "/admin/features";
  if (["checkout_toggle", "maintenance_toggle"].includes(action)) return "/admin/commerce";
  return "/admin/command-center";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function executeAction(request: NextRequest, plan: PlannedAction) {
  const args = safeArgs(plan.args);

  if (plan.action === "order_status") {
    if (!hasAdminPermission(request, "orders")) throw new Error("Your role cannot change orders.");
    const order = await getOrder(plan.target);
    if (!order) throw new Error("I could not find that order.");
    const status = clean(args.status, 40).toLowerCase();
    if (!ORDER_STATUSES.has(status)) throw new Error("I need a valid order status.");
    const forwarded = new NextRequest(new URL("/api/admin/order-status", request.url), {
      method: "PATCH",
      headers: request.headers,
      body: JSON.stringify({ orderId: order.id, status }),
    });
    const payload = await callJson(await patchOrderStatus(forwarded));
    return clean(payload.message, 500) || `Order ${order.order_number} updated to ${status}.`;
  }

  if (plan.action === "process_order" || plan.action === "return_refund") {
    const order = await getOrder(plan.target);
    if (!order) throw new Error("I could not find that order.");
    const body = plan.action === "process_order"
      ? { action: "process_order", orderId: order.id }
      : {
          action: "return_refund",
          orderId: order.id,
          reason: clean(args.reason, 500) || "Admin action via ORVIX AI",
          refundAmount: Math.max(0, n(args.refundAmount)),
          restock: bool(args.restock),
        };
    const forwarded = new NextRequest(new URL("/api/admin/os", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body),
    });
    const payload = await callJson(await runOsAction(forwarded));
    return clean(payload.message, 500) || "Order workflow completed.";
  }

  if (plan.action === "product_update") {
    if (!hasAdminPermission(request, "inventory")) throw new Error("Your role cannot edit products.");
    const product = await getProduct(plan.target);
    if (!product) throw new Error("I could not find that product.");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.price !== undefined) patch.price = Math.max(0, Math.round(n(args.price)));
    if (args.stockQuantity !== undefined) patch.stock_quantity = Math.max(0, Math.round(n(args.stockQuantity)));
    if (args.lowStockLimit !== undefined) patch.low_stock_limit = Math.max(0, Math.round(n(args.lowStockLimit)));
    if (args.status !== undefined) {
      const status = clean(args.status, 40).toLowerCase();
      if (!PRODUCT_STATUSES.has(status)) throw new Error("Invalid product status.");
      patch.status = status;
    }
    if (args.allowPurchase !== undefined) patch.allow_purchase = bool(args.allowPurchase);
    if (args.showOnHomepage !== undefined) patch.show_on_homepage = bool(args.showOnHomepage);
    if (args.allowWishlist !== undefined) patch.allow_wishlist = bool(args.allowWishlist);
    if (args.name !== undefined) patch.name = clean(args.name, 120);
    if (args.shortDescription !== undefined) patch.short_description = clean(args.shortDescription, 500);
    if (args.description !== undefined) patch.description = clean(args.description, 5000);
    if (Object.keys(patch).length === 1) throw new Error("Tell me what to change on the product.");
    await supabaseAdminJson(`products?id=eq.${postgrestValue(product.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    if (args.stockQuantity !== undefined || args.lowStockLimit !== undefined) {
      const invPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.stockQuantity !== undefined) invPatch.stock_quantity = patch.stock_quantity;
      if (args.lowStockLimit !== undefined) invPatch.low_stock_limit = patch.low_stock_limit;
      await supabaseAdminJson(`product_inventory?product_slug=eq.${postgrestValue(product.slug)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(invPatch),
      });
    }
    await auditAdminAction(request, "ai_product_update", "product", clean(product.id, 80), { target: product.slug, patch });
    return `Done. ${clean(product.name, 120)} updated.`;
  }

  if (plan.action === "product_create") {
    if (!hasAdminPermission(request, "inventory")) throw new Error("Your role cannot create products.");
    const name = clean(args.name, 120);
    const slug = clean(args.slug, 100).toLowerCase() || slugify(name);
    if (!name || !slug) throw new Error("Product name and a usable slug are required.");
    const status = clean(args.status, 40).toLowerCase() || "available";
    if (!PRODUCT_STATUSES.has(status)) throw new Error("Invalid product status.");
    const created = await supabaseAdminJson<GenericRow[]>("products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        slug,
        price: Math.max(0, Math.round(n(args.price))),
        stock_quantity: Math.max(0, Math.round(n(args.stockQuantity))),
        low_stock_limit: args.lowStockLimit === undefined ? 5 : Math.max(0, Math.round(n(args.lowStockLimit))),
        status,
        allow_purchase: args.allowPurchase === undefined ? true : bool(args.allowPurchase),
        show_on_homepage: args.showOnHomepage === undefined ? true : bool(args.showOnHomepage),
        allow_wishlist: true,
        short_description: clean(args.shortDescription, 500),
        description: clean(args.description, 5000),
        image: "/black.png",
        images: ["/black.png"],
        display_order: 0,
        updated_at: new Date().toISOString(),
      }),
    });
    await auditAdminAction(request, "ai_product_create", "product", clean(created[0]?.id, 80), { name, slug });
    return `Done. Product ${name} created.`;
  }

  if (plan.action === "product_delete") {
    if (!hasAdminPermission(request, "inventory")) throw new Error("Your role cannot delete products.");
    const product = await getProduct(plan.target);
    if (!product) throw new Error("I could not find that product.");
    await supabaseAdminJson(`products?id=eq.${postgrestValue(product.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await auditAdminAction(request, "ai_product_delete", "product", clean(product.id, 80), { name: product.name, slug: product.slug });
    return `Deleted ${clean(product.name, 120)}.`;
  }

  if (plan.action === "checkout_toggle") {
    if (!hasAdminPermission(request, "inventory")) throw new Error("Your role cannot change checkout.");
    const enabled = bool(args.enabled);
    await supabaseAdminJson("commerce_settings?id=eq.default", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ checkout_enabled: enabled, updated_at: new Date().toISOString() }),
    });
    await auditAdminAction(request, "ai_checkout_toggle", "commerce_settings", "default", { checkout_enabled: enabled });
    return `Checkout is now ${enabled ? "OPEN" : "PAUSED"}.`;
  }

  if (plan.action === "maintenance_toggle") {
    if (!hasAdminPermission(request, "dashboard")) throw new Error("Your role cannot change website status.");
    const enabled = bool(args.enabled);
    await setMaintenanceStatus(enabled);
    return enabled ? "Website is now in Under Construction mode." : "Website is live again.";
  }

  if (plan.action === "cashflow_add") {
    if (!hasAdminPermission(request, "cashflow")) throw new Error("Your role cannot edit cash flow.");
    const entryType = clean(args.entryType, 30).toLowerCase();
    if (!["expense", "income", "capital", "settlement"].includes(entryType)) throw new Error("I need the cash-flow type.");
    const amount = Math.round(n(args.amount) * 100) / 100;
    if (amount <= 0) throw new Error("I need a valid amount.");
    const paidBy = clean(args.paidBy, 30) || null;
    const receivedBy = clean(args.receivedBy, 30) || null;
    const fromPerson = clean(args.fromPerson, 30) || null;
    const toPerson = clean(args.toPerson, 30) || null;
    if (["expense", "capital"].includes(entryType) && !["me", "ahmed_samy"].includes(paidBy || "")) throw new Error("Tell me who paid: you or Ahmed Samy.");
    if (entryType === "income" && !["me", "ahmed_samy"].includes(receivedBy || "")) throw new Error("Tell me who received the income: you or Ahmed Samy.");
    if (entryType === "settlement" && (!fromPerson || !toPerson || fromPerson === toPerson)) throw new Error("Tell me who sent and who received the settlement.");
    const created = await supabaseAdminJson<GenericRow[]>("cashflow_entries", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        entry_type: entryType,
        category: clean(args.category, 80) || "Other",
        amount,
        description: clean(args.description, 300) || null,
        paid_by: ["expense", "capital"].includes(entryType) ? paidBy : null,
        received_by: entryType === "income" ? receivedBy : null,
        from_person: entryType === "settlement" ? fromPerson : null,
        to_person: entryType === "settlement" ? toPerson : null,
        entry_date: /^\d{4}-\d{2}-\d{2}$/.test(clean(args.entryDate, 20)) ? clean(args.entryDate, 20) : cairoToday(),
        updated_at: new Date().toISOString(),
      }),
    });
    await auditAdminAction(request, "ai_cashflow_add", "cashflow_entry", clean(created[0]?.id, 80), { entryType, amount });
    return `Done. ${amount.toLocaleString("en-GB")} EGP added to ${entryType}.`;
  }

  if (plan.action === "cashflow_update" || plan.action === "cashflow_delete") {
    if (!hasAdminPermission(request, "cashflow")) throw new Error("Your role cannot edit cash flow.");
    const entry = await getCashflow(plan.target);
    if (!entry) throw new Error("I could not find that cash-flow entry.");
    if (plan.action === "cashflow_delete") {
      await supabaseAdminJson(`cashflow_entries?id=eq.${postgrestValue(entry.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await auditAdminAction(request, "ai_cashflow_delete", "cashflow_entry", clean(entry.id, 80), { category: entry.category, amount: entry.amount });
      return "Cash-flow entry deleted.";
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.amount !== undefined) patch.amount = Math.round(n(args.amount) * 100) / 100;
    if (args.category !== undefined) patch.category = clean(args.category, 80);
    if (args.description !== undefined) patch.description = clean(args.description, 300) || null;
    if (args.paidBy !== undefined) patch.paid_by = clean(args.paidBy, 30) || null;
    if (args.receivedBy !== undefined) patch.received_by = clean(args.receivedBy, 30) || null;
    if (args.entryDate !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(clean(args.entryDate, 20))) patch.entry_date = clean(args.entryDate, 20);
    await supabaseAdminJson(`cashflow_entries?id=eq.${postgrestValue(entry.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await auditAdminAction(request, "ai_cashflow_update", "cashflow_entry", clean(entry.id, 80), patch);
    return "Cash-flow entry updated.";
  }

  if (["discount_create", "discount_update", "discount_delete"].includes(plan.action)) {
    if (!hasAdminPermission(request, "inventory")) throw new Error("Your role cannot edit discounts.");
    if (plan.action === "discount_create") {
      const code = clean(args.code, 80).toUpperCase();
      const type = clean(args.discountType, 40).toLowerCase();
      if (!code || !["free_delivery", "percentage", "fixed_amount"].includes(type)) throw new Error("Discount code and type are required.");
      const value = type === "free_delivery" ? 100 : Math.max(0, n(args.discountValue));
      if (type === "percentage" && value > 100) throw new Error("Percentage cannot exceed 100%.");
      await supabaseAdminJson("delivery_discount_codes", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          code,
          discount_type: type,
          discount_value: value,
          minimum_order_value: Math.max(0, n(args.minimumOrderValue)),
          maximum_discount: args.maximumDiscount == null ? null : Math.max(0, n(args.maximumDiscount)),
          usage_limit: args.usageLimit == null ? null : Math.max(1, Math.round(n(args.usageLimit))),
          times_used: 0,
          active: args.active === undefined ? true : bool(args.active),
          starts_at: clean(args.startsAt, 80) || null,
          expires_at: clean(args.expiresAt, 80) || null,
          updated_at: new Date().toISOString(),
        }),
      });
      await auditAdminAction(request, "ai_discount_create", "discount", code, { type, value });
      return `Discount ${code} created.`;
    }
    const discount = await getDiscount(plan.target);
    if (!discount) throw new Error("I could not find that discount code.");
    if (plan.action === "discount_delete") {
      await supabaseAdminJson(`delivery_discount_codes?id=eq.${postgrestValue(discount.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      await auditAdminAction(request, "ai_discount_delete", "discount", clean(discount.id, 80), { code: discount.code });
      return `Discount ${clean(discount.code, 80)} deleted.`;
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.code !== undefined) patch.code = clean(args.code, 80).toUpperCase();
    if (args.discountType !== undefined) patch.discount_type = clean(args.discountType, 40).toLowerCase();
    if (args.discountValue !== undefined) patch.discount_value = Math.max(0, n(args.discountValue));
    if (args.minimumOrderValue !== undefined) patch.minimum_order_value = Math.max(0, n(args.minimumOrderValue));
    if (args.maximumDiscount !== undefined) patch.maximum_discount = args.maximumDiscount == null ? null : Math.max(0, n(args.maximumDiscount));
    if (args.usageLimit !== undefined) patch.usage_limit = args.usageLimit == null ? null : Math.max(1, Math.round(n(args.usageLimit)));
    if (args.startsAt !== undefined) patch.starts_at = clean(args.startsAt, 80) || null;
    if (args.expiresAt !== undefined) patch.expires_at = clean(args.expiresAt, 80) || null;
    if (args.active !== undefined) patch.active = bool(args.active);
    await supabaseAdminJson(`delivery_discount_codes?id=eq.${postgrestValue(discount.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await auditAdminAction(request, "ai_discount_update", "discount", clean(discount.id, 80), patch);
    return `Discount ${clean(discount.code, 80)} updated.`;
  }

  if (plan.action === "feature_flag_update") {
    if (!hasAdminPermission(request, "dashboard")) throw new Error("Your role cannot edit feature flags.");
    const key = clean(plan.target, 80);
    if (!key) throw new Error("I need the feature flag key.");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (args.enabled !== undefined) patch.enabled = bool(args.enabled);
    if (args.rolloutPercent !== undefined) patch.rollout_percent = Math.max(0, Math.min(100, Math.round(n(args.rolloutPercent))));
    await supabaseAdminJson(`feature_flags?flag_key=eq.${postgrestValue(key)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    await auditAdminAction(request, "ai_feature_flag_update", "feature_flag", key, patch);
    return `Feature flag ${key} updated.`;
  }

  if (plan.action === "review_status" || plan.action === "review_delete") {
    if (!hasAdminPermission(request, "customers")) throw new Error("Your role cannot edit reviews.");
    const review = await getReview(plan.target);
    if (!review) throw new Error("I could not find that review.");
    if (plan.action === "review_delete") {
      await supabaseAdminJson(`reviews?id=eq.${postgrestValue(review.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return "Review deleted.";
    }
    const status = clean(args.status, 30).toLowerCase();
    if (!REVIEW_STATUSES.has(status)) throw new Error("Invalid review status.");
    await supabaseAdminJson(`reviews?id=eq.${postgrestValue(review.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, approved_at: status === "approved" ? new Date().toISOString() : null }),
    });
    return `Review marked ${status}.`;
  }

  if (plan.action === "waitlist_status" || plan.action === "waitlist_delete") {
    if (!hasAdminPermission(request, "customers")) throw new Error("Your role cannot edit the waitlist.");
    const entry = await getWaitlist(plan.target);
    if (!entry) throw new Error("I could not find that waitlist entry.");
    if (plan.action === "waitlist_delete") {
      await supabaseAdminJson(`product_waitlist?id=eq.${postgrestValue(entry.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return "Waitlist entry deleted.";
    }
    const status = clean(args.status, 30).toLowerCase();
    if (!WAITLIST_STATUSES.has(status)) throw new Error("Invalid waitlist status.");
    await supabaseAdminJson(`product_waitlist?id=eq.${postgrestValue(entry.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, notified_at: status === "notified" ? new Date().toISOString() : null }),
    });
    return `Waitlist entry marked ${status}.`;
  }

  if (["chat_reply", "chat_status", "chat_ai_mode"].includes(plan.action)) {
    const chat = await getChat(plan.target);
    if (!chat) throw new Error("I could not find that customer conversation.");
    const body = plan.action === "chat_reply"
      ? { action: "message", sessionId: chat.id, message: clean(args.message, 1000) }
      : plan.action === "chat_status"
        ? { action: "status", sessionId: chat.id, status: clean(args.status, 20).toLowerCase() === "closed" ? "closed" : "open" }
        : { action: "ai_mode", sessionId: chat.id, mode: clean(args.mode, 20).toLowerCase() === "ai" ? "ai" : "human" };
    if (plan.action === "chat_reply" && !body.message) throw new Error("Tell me what to send to the customer.");
    const forwarded = new NextRequest(new URL("/api/admin/chat", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body),
    });
    await callJson(await runChatAction(forwarded));
    return plan.action === "chat_reply" ? `Reply sent to ${clean(chat.customer_name, 100)}.` : "Conversation updated.";
  }

  if (plan.action === "support_ai_toggle") {
    const enabled = bool(args.enabled);
    await supabaseAdminJson("customer_support_settings?id=eq.default", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ai_auto_reply: enabled, updated_at: new Date().toISOString() }),
    });
    return `Customer support AI auto-reply is ${enabled ? "ON" : "OFF"}.`;
  }

  if (plan.action === "analytics_reset") {
    if (!hasAdminPermission(request, "analytics")) throw new Error("Your role cannot reset analytics.");
    await supabaseAdminJson("site_views?id=not.is.null", { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await auditAdminAction(request, "ai_analytics_reset", "site_views", "all", {});
    return "All website click/view analytics were deleted.";
  }

  if (plan.action === "orders_reset") {
    if (!hasAdminPermission(request, "orders")) throw new Error("Your role cannot delete all orders.");
    await supabaseAdminJson("orders?id=not.is.null", { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await auditAdminAction(request, "ai_orders_reset", "orders", "all", {});
    return "All orders were deleted.";
  }

  if (plan.action === "notification_read") {
    const rows = await supabaseAdminJson<GenericRow[]>("admin_notifications?select=id,title,body,read_at,created_at&order=created_at.desc&limit=100");
    const notification = chooseRow(rows, plan.target, ["id", "title", "body"]);
    if (!notification) throw new Error("I could not find that notification.");
    await supabaseAdminJson(`admin_notifications?id=eq.${postgrestValue(notification.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    });
    return "Notification marked as read.";
  }

  throw new Error("That admin action is not supported yet.");
}

function relevantRows(rows: GenericRow[], question: string, max = 30) {
  const words = normalize(question).split(" ").filter((word) => word.length >= 3);
  const matching = rows.filter((row) => {
    const text = normalize(JSON.stringify(row));
    return words.some((word) => text.includes(word));
  });
  const picked = matching.length ? matching : rows;
  return picked.slice(0, max);
}

async function buildReadSnapshot(question: string) {
  const [orders, products, inventory, cashflow, discounts, reviews, waitlist, chats, flags, commerce, support, views, maintenance] = await Promise.all([
    supabaseAdminJson<GenericRow[]>("orders?select=id,order_number,customer_name,phone,governorate,area,product_name,product_slug,colour,quantity,total_price,status,created_at,updated_at,bosta_delivery_id,bosta_tracking_number,bosta_last_error,return_status,refunded_amount&order=created_at.desc&limit=800"),
    supabaseAdminJson<GenericRow[]>("products?select=id,name,slug,price,unit_cost,stock_quantity,low_stock_limit,status,allow_purchase,show_on_homepage&order=display_order.asc,created_at.asc"),
    supabaseAdminJson<GenericRow[]>("product_inventory?select=id,product_slug,product_name,stock_quantity,low_stock_limit,reorder_target,is_available&order=product_name.asc"),
    supabaseAdminJson<GenericRow[]>("cashflow_entries?select=id,entry_type,category,amount,description,paid_by,received_by,entry_date,created_at&order=entry_date.desc,created_at.desc&limit=800"),
    supabaseAdminJson<GenericRow[]>("delivery_discount_codes?select=id,code,discount_type,discount_value,minimum_order_value,maximum_discount,usage_limit,times_used,active,starts_at,expires_at,created_at&order=created_at.desc"),
    supabaseAdminJson<GenericRow[]>("reviews?select=*&order=created_at.desc&limit=200"),
    supabaseAdminJson<GenericRow[]>("product_waitlist?select=*&order=created_at.desc&limit=300"),
    supabaseAdminJson<GenericRow[]>("customer_chat_sessions?select=id,customer_name,customer_phone,status,last_sender,last_message_preview,last_message_at,human_requested,ai_paused&order=last_message_at.desc&limit=200"),
    supabaseAdminJson<GenericRow[]>("feature_flags?select=*&order=flag_key.asc"),
    supabaseAdminJson<GenericRow[]>("commerce_settings?id=eq.default&select=*&limit=1"),
    supabaseAdminJson<GenericRow[]>("customer_support_settings?id=eq.default&select=ai_auto_reply,updated_at&limit=1"),
    supabaseAdminJson<GenericRow[]>("site_views?select=id,path,visitor_id,device_type,created_at&order=created_at.desc&limit=5000"),
    getMaintenanceStatus(),
  ]);

  const delivered = orders.filter((row) => row.status === "delivered");
  const cancelled = orders.filter((row) => row.status === "cancelled");
  const expense = cashflow.filter((row) => row.entry_type === "expense");
  const income = cashflow.filter((row) => row.entry_type === "income");
  const uniqueVisitors = new Set(views.map((row) => clean(row.visitor_id, 120)).filter(Boolean)).size;

  return {
    generatedAt: new Date().toISOString(),
    maintenance,
    summary: {
      orders: orders.length,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      deliveredRevenue: delivered.reduce((sum, row) => sum + n(row.total_price), 0),
      cashflowExpenses: expense.reduce((sum, row) => sum + n(row.amount), 0),
      cashflowIncome: income.reduce((sum, row) => sum + n(row.amount), 0),
      products: products.length,
      lowStockProducts: inventory.filter((row) => bool(row.is_available) && n(row.stock_quantity) <= n(row.low_stock_limit)).length,
      activeDiscounts: discounts.filter((row) => bool(row.active)).length,
      pendingReviews: reviews.filter((row) => row.status === "pending").length,
      waitingList: waitlist.filter((row) => row.status === "waiting").length,
      openChats: chats.filter((row) => row.status !== "closed").length,
      viewsLoaded: views.length,
      uniqueVisitorsLoaded: uniqueVisitors,
    },
    orders: relevantRows(orders, question, 45),
    products: relevantRows(products, question, 30),
    inventory: relevantRows(inventory, question, 30),
    cashflow: relevantRows(cashflow, question, 40),
    discounts: relevantRows(discounts, question, 25),
    reviews: relevantRows(reviews, question, 25),
    waitlist: relevantRows(waitlist, question, 25),
    chats: relevantRows(chats, question, 25),
    featureFlags: flags,
    commerce: commerce[0] || null,
    support: support[0] || null,
  };
}

async function answerReadQuestion(question: string) {
  const snapshot = await buildReadSnapshot(question);
  const { text } = await generateText({
    model: "openai/gpt-5.6-luna",
    prompt: `You are ORVIX AI, the owner's live internal admin copilot. Answer using ONLY the supplied live dashboard snapshot. Do not invent any order, customer, money, stock, review, waitlist entry, discount, chat or setting. If the snapshot is insufficient, say exactly what is missing. Match the owner's language: Egyptian Arabic/Arabizi when they use it, otherwise English. Keep the answer practical and concise, but include exact figures or record details when asked. Money is EGP.\n\nLIVE DASHBOARD SNAPSHOT:\n${JSON.stringify(snapshot)}\n\nOWNER QUESTION:\n${question}`,
  });
  return text.trim();
}

async function forwardLegacy(request: NextRequest, question: string) {
  const forwarded = new NextRequest(new URL("/api/admin/os/assistant-router", request.url), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ question }),
  });
  return legacyAssistant(forwarded);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "assistant")) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const question = clean(body.question, 1000);
    if (!question) return NextResponse.json({ success: false, message: "Write a command or question first." }, { status: 400 });

    let plans: PlannedAction[] = [];
    try {
      plans = await planActions(question);
    } catch (error) {
      console.error("ORVIX Copilot planner error:", error);
      return forwardLegacy(request, question);
    }

    if (plans.length) {
      const destructive = plans.filter((plan) => DESTRUCTIVE_ACTIONS.has(plan.action));
      if (destructive.length && !isConfirmed(question)) {
        const names = destructive.map((plan) => plan.action.replaceAll("_", " ")).join(", ");
        return NextResponse.json({
          success: true,
          ai: true,
          answer: `I understood the command. It includes a destructive action (${names}), so nothing changed yet. Confirm it once and I will execute it.`,
          action: { type: "confirmation_required", command: `${question} confirm`, target: names },
        });
      }

      const results: string[] = [];
      for (const plan of plans) {
        results.push(await executeAction(request, plan));
      }
      const last = plans[plans.length - 1];
      return NextResponse.json({
        success: true,
        ai: true,
        answer: results.join("\n"),
        action: {
          type: "admin_action",
          target: plans.length > 1 ? "batch" : last.action,
          section: plans.length > 1 ? "Admin" : last.action.replaceAll("_", " "),
          href: plans.length > 1 ? "/admin/command-center" : actionHref(last.action),
          changed: true,
        },
      });
    }

    try {
      const answer = await answerReadQuestion(question);
      if (answer) return NextResponse.json({ success: true, ai: true, answer });
    } catch (error) {
      console.error("ORVIX Copilot read-answer error:", error);
    }

    return forwardLegacy(request, question);
  } catch (error) {
    console.error("ORVIX Copilot error:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "ORVIX AI could not complete this request." }, { status: 500 });
  }
}
