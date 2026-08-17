import { NextRequest, NextResponse } from "next/server";
import { POST as dispatchBosta } from "@/app/api/admin/bosta/dispatch-v2/route";
import { auditAdminAction } from "@/lib/admin-audit";
import {
  adminRoleLabel,
  hasAdminPermission,
  isAdminAuthenticated,
  readAdminRole,
} from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  customer_email?: string | null;
  governorate?: string | null;
  area?: string | null;
  address?: string | null;
  product_name?: string | null;
  product_slug?: string | null;
  colour?: string | null;
  quantity: number;
  total_price: number | string;
  status: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string | null;
  unit_cost_at_sale?: number | string | null;
  bosta_delivery_id?: string | null;
  bosta_tracking_number?: string | null;
  bosta_last_error?: string | null;
  bosta_batch_id?: string | null;
  return_status?: string | null;
  refunded_amount?: number | string | null;
  inventory_reserved_qty?: number | null;
};

type InventoryRow = {
  id: string;
  product_slug: string;
  product_name: string;
  stock_quantity: number;
  low_stock_limit: number;
  reorder_target?: number | null;
  is_available: boolean;
};

type ViewRow = {
  path: string;
  visitor_id: string;
  created_at: string;
};

type ChatRow = {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  status: string;
  last_sender?: string | null;
  last_message_at: string;
  admin_last_read_at?: string | null;
  human_requested?: boolean | null;
};

type CashRow = {
  id: string;
  entry_type: string;
  category: string;
  amount: number | string;
  paid_by?: string | null;
  received_by?: string | null;
  entry_date: string;
};

type AuditRow = {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};

type ReturnRow = {
  id: string;
  order_id: string;
  order_number: string;
  return_type: string;
  reason: string;
  refund_amount: number | string;
  restock: boolean;
  status: string;
  created_by: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  target_url: string;
  created_at: string;
  read_at?: string | null;
  severity?: "info" | "warning" | "critical" | "success" | null;
};

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percentage(a: number, b: number) {
  return b > 0 ? round((a / b) * 100) : 0;
}

function dateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length >= 12) return digits.slice(2);
  return digits;
}

function minutesAgo(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function isUnreadChat(chat: ChatRow) {
  if (chat.status === "closed" || chat.last_sender !== "customer") return false;
  if (!chat.admin_last_read_at) return true;
  return new Date(chat.admin_last_read_at).getTime() < new Date(chat.last_message_at).getTime();
}

async function loadData() {
  const [orders, inventory, views, chats, cash, audit, returns, notifications] = await Promise.all([
    supabaseAdminJson<OrderRow[]>(
      "orders?select=id,order_number,customer_name,phone,email,customer_email,governorate,area,address,product_name,product_slug,colour,quantity,total_price,status,created_at,updated_at,delivered_at,unit_cost_at_sale,bosta_delivery_id,bosta_tracking_number,bosta_last_error,bosta_batch_id,return_status,refunded_amount,inventory_reserved_qty&order=created_at.desc&limit=1200"
    ),
    supabaseAdminJson<InventoryRow[]>(
      "product_inventory?select=id,product_slug,product_name,stock_quantity,low_stock_limit,reorder_target,is_available&order=product_name.asc"
    ),
    supabaseAdminJson<ViewRow[]>(
      "site_views?select=path,visitor_id,created_at&order=created_at.desc&limit=5000"
    ),
    supabaseAdminJson<ChatRow[]>(
      "customer_chat_sessions?select=id,customer_name,customer_phone,status,last_sender,last_message_at,admin_last_read_at,human_requested&order=last_message_at.desc&limit=500"
    ),
    supabaseAdminJson<CashRow[]>(
      "cashflow_entries?select=id,entry_type,category,amount,paid_by,received_by,entry_date&order=entry_date.desc&limit=1500"
    ),
    supabaseAdminJson<AuditRow[]>(
      "admin_audit_log?select=id,actor,role,action,entity_type,entity_id,details,created_at&order=created_at.desc&limit=40"
    ),
    supabaseAdminJson<ReturnRow[]>(
      "order_returns?select=id,order_id,order_number,return_type,reason,refund_amount,restock,status,created_by,created_at&order=created_at.desc&limit=40"
    ),
    supabaseAdminJson<NotificationRow[]>(
      "admin_notifications?select=id,title,body,target_url,created_at,read_at,severity&order=created_at.desc&limit=40"
    ),
  ]);

  return { orders, inventory, views, chats, cash, audit, returns, notifications };
}

function buildCustomers(orders: OrderRow[]) {
  const groups = new Map<string, OrderRow[]>();
  for (const order of orders) {
    const key = normalizePhone(order.phone) || order.phone;
    const current = groups.get(key) || [];
    current.push(order);
    groups.set(key, current);
  }

  const customers = Array.from(groups.entries()).map(([phoneKey, customerOrders]) => {
    const sorted = [...customerOrders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const delivered = customerOrders.filter((order) => order.status === "delivered");
    const cancelled = customerOrders.filter((order) => order.status === "cancelled");
    const totalSpent = delivered.reduce((sum, order) => sum + n(order.total_price), 0);
    const last = sorted[0];
    const daysSinceLast = Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86400000);
    const cancellationRate = percentage(cancelled.length, customerOrders.length);

    let segment = "New";
    if (cancelled.length >= 2 && cancellationRate >= 50) segment = "High Cancellation";
    else if (totalSpent >= 20000 || delivered.length >= 3) segment = "VIP";
    else if (delivered.length >= 2) segment = "Returning";
    else if (daysSinceLast >= 90) segment = "Inactive";

    return {
      phoneKey,
      name: last.customer_name,
      phone: last.phone,
      email: last.customer_email || last.email || null,
      governorate: last.governorate || null,
      area: last.area || null,
      address: last.address || null,
      totalOrders: customerOrders.length,
      deliveredOrders: delivered.length,
      cancelledOrders: cancelled.length,
      cancellationRate,
      totalSpent: round(totalSpent),
      lastOrderAt: last.created_at,
      lastOrderNumber: last.order_number,
      segment,
      orders: sorted.slice(0, 12).map((order) => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        total: n(order.total_price),
        product: order.product_name,
        createdAt: order.created_at,
      })),
    };
  });

  return customers.sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders);
}

function buildDashboard(data: Awaited<ReturnType<typeof loadData>>) {
  const { orders, inventory, views, chats, cash, audit, returns, notifications } = data;
  const today = dateKey(new Date());
  const ordersToday = orders.filter((order) => dateKey(order.created_at) === today);
  const activeToday = ordersToday.filter((order) => order.status !== "cancelled");
  const delivered = orders.filter((order) => order.status === "delivered");
  const deliveredToday = delivered.filter((order) => dateKey(order.delivered_at || order.updated_at || order.created_at) === today);
  const todayExpenses = cash.filter((entry) => entry.entry_type === "expense" && entry.entry_date === today && !entry.category.toLowerCase().startsWith("stock"));

  const salesToday = activeToday.reduce((sum, order) => sum + n(order.total_price), 0);
  const deliveredSalesToday = deliveredToday.reduce((sum, order) => sum + n(order.total_price), 0);
  const cogsToday = deliveredToday.reduce((sum, order) => sum + n(order.unit_cost_at_sale) * n(order.quantity), 0);
  const operatingToday = todayExpenses.reduce((sum, entry) => sum + n(entry.amount), 0);
  const profitToday = deliveredSalesToday - cogsToday - operatingToday;

  const deliveredSalesAll = delivered.reduce((sum, order) => sum + n(order.total_price), 0);
  const cogsAll = delivered.reduce((sum, order) => sum + n(order.unit_cost_at_sale) * n(order.quantity), 0);
  const manualIncomeAll = cash.filter((entry) => entry.entry_type === "income").reduce((sum, entry) => sum + n(entry.amount), 0);
  const operatingExpensesAll = cash
    .filter((entry) => entry.entry_type === "expense" && !entry.category.toLowerCase().startsWith("stock"))
    .reduce((sum, entry) => sum + n(entry.amount), 0);
  const realProfitAll = deliveredSalesAll + manualIncomeAll - cogsAll - operatingExpensesAll;

  const waitingConfirmation = orders.filter((order) => order.status === "new");
  const delayedOrders = orders.filter((order) => {
    if (!["confirmed", "shipped", "out_for_delivery"].includes(order.status)) return false;
    const ageHours = (Date.now() - new Date(order.updated_at || order.created_at).getTime()) / 3600000;
    return ageHours >= 24 || Boolean(order.bosta_last_error);
  });
  const lowStock = inventory.filter((item) => item.is_available && item.stock_quantity <= item.low_stock_limit);
  const unreadChats = chats.filter(isUnreadChat);
  const waitingChats = unreadChats.filter((chat) => minutesAgo(chat.last_message_at) >= 15 || chat.human_requested);
  const missingExpensePayer = cash.filter((entry) => entry.entry_type === "expense" && !entry.paid_by);

  const dynamicAlerts = [
    waitingConfirmation.length > 0
      ? { id: "new-orders", severity: "warning", title: `${waitingConfirmation.length} orders need confirmation`, body: "Confirm new orders so stock can be reserved and shipping can start.", targetUrl: "/admin" }
      : null,
    delayedOrders.length > 0
      ? { id: "late-orders", severity: "critical", title: `${delayedOrders.length} orders need attention`, body: "These orders are delayed, stuck, or have a Bosta error.", targetUrl: "/admin/command-center#orders" }
      : null,
    lowStock.length > 0
      ? { id: "low-stock", severity: "warning", title: `${lowStock.length} low-stock products`, body: "Inventory reached or passed the configured low-stock limit.", targetUrl: "/admin/command-center#inventory" }
      : null,
    waitingChats.length > 0
      ? { id: "waiting-chats", severity: "critical", title: `${waitingChats.length} customers waiting`, body: "Unread customer messages have been waiting 15+ minutes or requested a human.", targetUrl: "/admin/chats" }
      : null,
    missingExpensePayer.length > 0
      ? { id: "missing-payer", severity: "info", title: `${missingExpensePayer.length} expenses need a payer`, body: "Assign Me or Ahmed Samy so partner balances stay accurate.", targetUrl: "/admin/cashflow" }
      : null,
  ].filter(Boolean);

  const persistedAlerts = notifications
    .filter((item) => !item.read_at)
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      severity: item.severity || "info",
      title: item.title,
      body: item.body,
      targetUrl: item.target_url || "/admin",
      persisted: true,
    }));

  const visitorIds = new Set(views.map((view) => view.visitor_id).filter(Boolean));
  const productViews = views.filter((view) => view.path.startsWith("/products/")).length;
  const checkoutStarts = views.filter((view) => view.path === "/checkout").length;
  const ordersPlaced = orders.length;
  const funnel = {
    visitors: visitorIds.size,
    productViews,
    checkoutStarts,
    ordersPlaced,
    visitorToProduct: percentage(productViews, visitorIds.size),
    productToCheckout: percentage(checkoutStarts, productViews),
    checkoutToOrder: percentage(ordersPlaced, checkoutStarts),
    visitorToOrder: percentage(ordersPlaced, visitorIds.size),
  };

  const customers = buildCustomers(orders);
  const segmentCounts = customers.reduce<Record<string, number>>((acc, customer) => {
    acc[customer.segment] = (acc[customer.segment] || 0) + 1;
    return acc;
  }, {});

  const reorder = inventory.map((item) => ({
    ...item,
    reorderTarget: n(item.reorder_target || Math.max(item.low_stock_limit * 2, 10)),
    reorderSuggested: Math.max(0, n(item.reorder_target || Math.max(item.low_stock_limit * 2, 10)) - item.stock_quantity),
  }));

  const summaryText = `${ordersToday.length} orders today · ${round(salesToday).toLocaleString("en-GB")} EGP order value · ${round(profitToday).toLocaleString("en-GB")} EGP delivered profit · ${waitingConfirmation.length} awaiting confirmation · ${lowStock.length} low stock · ${waitingChats.length} chats need attention.`;

  return {
    today: {
      orders: ordersToday.length,
      sales: round(salesToday),
      deliveredSales: round(deliveredSalesToday),
      profit: round(profitToday),
      waitingConfirmation: waitingConfirmation.length,
      unreadChats: unreadChats.length,
    },
    allTime: {
      deliveredSales: round(deliveredSalesAll),
      realProfit: round(realProfitAll),
    },
    summaryText,
    alerts: [...dynamicAlerts, ...persistedAlerts].slice(0, 12),
    inventory: reorder,
    funnel,
    customers: customers.slice(0, 100),
    segmentCounts,
    orders: orders.slice(0, 50),
    actionOrders: orders.filter((order) => ["new", "confirmed"].includes(order.status)).slice(0, 20),
    delayedOrders: delayedOrders.slice(0, 20),
    recentReturns: returns,
    recentAudit: audit,
    topCustomer: customers[0] || null,
    stats: {
      lowStock: lowStock.length,
      unreadChats: unreadChats.length,
      waitingChats: waitingChats.length,
      missingExpensePayer: missingExpensePayer.length,
      returns: returns.length,
    },
  };
}

function assistantAnswer(question: string, dashboard: ReturnType<typeof buildDashboard>) {
  const q = question.toLowerCase();
  const egp = (value: number) => `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;

  if (q.includes("profit") || q.includes("ربح") || q.includes("مكسب")) {
    return `Delivered profit today: ${egp(dashboard.today.profit)}. All-time real profit: ${egp(dashboard.allTime.realProfit)}.`;
  }
  if (q.includes("late") || q.includes("delay") || q.includes("متأخر") || q.includes("متاخر")) {
    if (!dashboard.delayedOrders.length) return "No delayed orders need attention right now.";
    return `${dashboard.delayedOrders.length} orders need attention: ${dashboard.delayedOrders.slice(0, 5).map((order) => `#${order.order_number} (${order.status})`).join(", ")}.`;
  }
  if (q.includes("stock") || q.includes("مخزون")) {
    const low = dashboard.inventory.filter((item) => item.stock_quantity <= item.low_stock_limit && item.is_available);
    if (!low.length) return "Stock is healthy. No available product is currently at or below its low-stock limit.";
    return low.map((item) => `${item.product_name}: ${item.stock_quantity} left; suggested reorder ${item.reorderSuggested}.`).join(" ");
  }
  if (q.includes("customer") || q.includes("عميل")) {
    const top = dashboard.topCustomer;
    if (!top) return "No customer data is available yet.";
    return `Top customer: ${top.name}. ${top.deliveredOrders} delivered orders, ${egp(top.totalSpent)} spent, segment: ${top.segment}.`;
  }
  if (q.includes("cancel") || q.includes("الغاء") || q.includes("إلغاء")) {
    const risky = dashboard.customers.filter((customer) => customer.segment === "High Cancellation");
    return risky.length ? `${risky.length} customers are in High Cancellation: ${risky.slice(0, 5).map((customer) => customer.name).join(", ")}.` : "No customers are currently in the High Cancellation segment.";
  }
  if (q.includes("funnel") || q.includes("conversion") || q.includes("تحويل")) {
    return `Funnel: ${dashboard.funnel.visitors} visitors → ${dashboard.funnel.productViews} product views → ${dashboard.funnel.checkoutStarts} checkout starts → ${dashboard.funnel.ordersPlaced} orders. Checkout-to-order: ${dashboard.funnel.checkoutToOrder}%.`;
  }
  if (q.includes("order") || q.includes("اوردر") || q.includes("أوردر")) {
    return `${dashboard.today.orders} orders today. ${dashboard.today.waitingConfirmation} currently need confirmation.`;
  }

  return dashboard.summaryText;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "dashboard")) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = await loadData();
    const dashboard = buildDashboard(data);
    const role = readAdminRole(request);
    return NextResponse.json({
      success: true,
      role,
      roleLabel: adminRoleLabel(role),
      dashboard,
    });
  } catch (error) {
    console.error("ORVIX OS GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load ORVIX Command Center." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "").trim();

    if (action === "ask") {
      if (!hasAdminPermission(request, "assistant")) {
        return NextResponse.json({ success: false, message: "Your role cannot use the assistant." }, { status: 403 });
      }
      const question = String(body.question || "").trim().slice(0, 500);
      const dashboard = buildDashboard(await loadData());
      return NextResponse.json({ success: true, answer: assistantAnswer(question, dashboard) });
    }

    if (action === "mark_notification_read") {
      if (!hasAdminPermission(request, "dashboard")) {
        return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
      }
      const id = String(body.id || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return NextResponse.json({ success: false, message: "Invalid notification." }, { status: 400 });
      }
      await supabaseAdminJson(
        `admin_notifications?id=eq.${postgrestValue(id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ read_at: new Date().toISOString() }),
        }
      );
      return NextResponse.json({ success: true });
    }

    if (action === "process_order") {
      if (!hasAdminPermission(request, "orders") || !hasAdminPermission(request, "bosta")) {
        return NextResponse.json({ success: false, message: "Your role cannot process orders." }, { status: 403 });
      }
      const orderId = String(body.orderId || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
        return NextResponse.json({ success: false, message: "Invalid order." }, { status: 400 });
      }

      const rows = await supabaseAdminJson<OrderRow[]>(
        `orders?select=id,order_number,status,bosta_delivery_id&id=eq.${postgrestValue(orderId)}&limit=1`
      );
      const order = rows[0];
      if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
      if (["cancelled", "delivered"].includes(order.status)) {
        return NextResponse.json({ success: false, message: `Cannot process a ${order.status} order.` }, { status: 400 });
      }

      if (order.status === "new") {
        await supabaseAdminJson(
          `orders?id=eq.${postgrestValue(orderId)}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: "confirmed", last_workflow_at: new Date().toISOString() }),
          }
        );
      }

      let bostaMessage = "Already sent to Bosta.";
      let bostaOk = true;
      if (!order.bosta_delivery_id) {
        const forwarded = new NextRequest(new URL("/api/admin/bosta/dispatch-v2", request.url), {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify({ orderIds: [orderId] }),
        });
        const response = await dispatchBosta(forwarded);
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        bostaOk = response.ok;
        bostaMessage = payload.message || (response.ok ? "Sent to Bosta." : "Bosta needs attention.");
      }

      await auditAdminAction(request, "one_click_order_workflow", "order", orderId, {
        orderNumber: order.order_number,
        confirmed: true,
        bostaOk,
        bostaMessage,
      });

      return NextResponse.json({
        success: true,
        partial: !bostaOk,
        message: bostaOk ? "Order confirmed, stock reserved, and Bosta dispatch completed." : `Order confirmed and stock reserved. ${bostaMessage}`,
      });
    }

    if (action === "return_refund") {
      if (!hasAdminPermission(request, "returns")) {
        return NextResponse.json({ success: false, message: "Your role cannot process returns." }, { status: 403 });
      }
      const orderId = String(body.orderId || "").trim();
      const reason = String(body.reason || "").trim().slice(0, 500);
      const refundAmount = Math.max(0, n(body.refundAmount));
      const restock = Boolean(body.restock);
      if (!/^[0-9a-f-]{36}$/i.test(orderId) || !reason) {
        return NextResponse.json({ success: false, message: "Order and return reason are required." }, { status: 400 });
      }

      const rows = await supabaseAdminJson<OrderRow[]>(
        `orders?select=id,order_number,status,quantity,total_price,product_slug,product_name,refunded_amount&id=eq.${postgrestValue(orderId)}&limit=1`
      );
      const order = rows[0];
      if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
      if (refundAmount > n(order.total_price)) {
        return NextResponse.json({ success: false, message: "Refund cannot exceed the order total." }, { status: 400 });
      }

      if (restock) {
        const previous = await supabaseAdminJson<ReturnRow[]>(
          `order_returns?select=id&order_id=eq.${postgrestValue(orderId)}&restock=eq.true&status=eq.completed&limit=1`
        );
        if (previous.length) {
          return NextResponse.json({ success: false, message: "This order was already restocked by a previous return." }, { status: 400 });
        }
      }

      const created = await supabaseAdminJson<ReturnRow[]>(
        "order_returns",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            return_type: restock && refundAmount > 0 ? "return_refund" : restock ? "return" : "refund",
            reason,
            refund_amount: round(refundAmount),
            restock,
            status: "completed",
            created_by: adminRoleLabel(readAdminRole(request)),
            resolved_at: new Date().toISOString(),
          }),
        }
      );

      if (restock && order.product_slug) {
        const inventoryRows = await supabaseAdminJson<InventoryRow[]>(
          `product_inventory?select=id,product_slug,product_name,stock_quantity,low_stock_limit,reorder_target,is_available&product_slug=eq.${postgrestValue(order.product_slug)}&limit=1`
        );
        const inventory = inventoryRows[0];
        if (inventory) {
          const nextStock = inventory.stock_quantity + Math.max(1, n(order.quantity));
          await supabaseAdminJson(
            `product_inventory?id=eq.${postgrestValue(inventory.id)}`,
            {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ stock_quantity: nextStock, is_available: true, updated_at: new Date().toISOString() }),
            }
          );
          await supabaseAdminJson(
            `products?slug=eq.${postgrestValue(order.product_slug)}`,
            {
              method: "PATCH",
              headers: { Prefer: "return=minimal" },
              body: JSON.stringify({ stock_quantity: nextStock, updated_at: new Date().toISOString() }),
            }
          );
        }
      }

      await supabaseAdminJson(
        `orders?id=eq.${postgrestValue(orderId)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            return_status: "completed",
            refunded_amount: round(n(order.refunded_amount) + refundAmount),
            returned_at: new Date().toISOString(),
          }),
        }
      );

      if (refundAmount > 0) {
        await supabaseAdminJson(
          "cashflow_entries",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              entry_type: "expense",
              category: "Refund",
              amount: round(refundAmount),
              description: `Refund for order ${order.order_number}: ${reason}`,
              entry_date: dateKey(new Date()),
              paid_by: null,
            }),
          }
        );
      }

      await auditAdminAction(request, "return_refund_completed", "order", orderId, {
        orderNumber: order.order_number,
        refundAmount: round(refundAmount),
        restock,
        returnId: created[0]?.id || null,
      });

      return NextResponse.json({ success: true, message: "Return/refund recorded and inventory/cash flow updated." });
    }

    return NextResponse.json({ success: false, message: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("ORVIX OS POST error:", error);
    return NextResponse.json({ success: false, message: "Could not complete the action." }, { status: 500 });
  }
}
