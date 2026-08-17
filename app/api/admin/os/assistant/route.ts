import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { PATCH as patchOrderStatus } from "@/app/api/admin/order-status/route";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type OrderStatus =
  | "new"
  | "confirmed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  product_name?: string | null;
  quantity: number;
  total_price: number | string;
  status: string;
  created_at: string;
  delivered_at?: string | null;
  unit_cost_at_sale?: number | string | null;
};

type InventoryRow = {
  product_name: string;
  stock_quantity: number;
  low_stock_limit: number;
  is_available: boolean;
};

type CashRow = {
  entry_type: string;
  category: string;
  amount: number | string;
  entry_date: string;
  paid_by?: string | null;
};

type ChatRow = {
  status: string;
  last_sender?: string | null;
  last_message_at: string;
};

const statusLabels: Record<OrderStatus, string> = {
  new: "Pre-order",
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeCommandText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ");
}

function extractOrderNumber(question: string) {
  const match = question.match(/\bORVIX-[A-Z0-9]+(?:-[A-Z0-9]+)+\b/i);
  return match?.[0]?.toUpperCase() || null;
}

function extractRequestedStatus(question: string): OrderStatus | null {
  const q = normalizeCommandText(question);

  const aliases: Array<{ status: OrderStatus; values: string[] }> = [
    {
      status: "out_for_delivery",
      values: [
        "out for delivery",
        "outfordelivery",
        "خرج للتوصيل",
        "خارج للتوصيل",
      ],
    },
    {
      status: "delivered",
      values: [
        "delivered",
        "تم التوصيل",
        "تم التسليم",
        "اتسلم",
      ],
    },
    {
      status: "cancelled",
      values: [
        "cancelled",
        "canceled",
        "cancel",
        "ملغي",
        "الغيه",
        "الغي",
      ],
    },
    {
      status: "confirmed",
      values: [
        "confirmed",
        "confirm",
        "تم التأكيد",
        "تأكيد",
        "اكد",
        "أكد",
      ],
    },
    {
      status: "shipped",
      values: [
        "shipped",
        "تم الشحن",
        "اتشحن",
      ],
    },
    {
      status: "new",
      values: [
        "pre order",
        "preorder",
        "pre ordered",
        "new",
        "pending confirmation",
        "طلب مسبق",
      ],
    },
  ];

  for (const item of aliases) {
    if (item.values.some((alias) => q.includes(normalizeCommandText(alias)))) {
      return item.status;
    }
  }

  return null;
}

function isOrderStatusCommand(question: string, orderNumber: string | null, status: OrderStatus | null) {
  if (!orderNumber || !status) return false;

  const q = normalizeCommandText(question);
  const explicitCommand = [
    "set ",
    "change ",
    "update ",
    "make ",
    "mark ",
    "خلي ",
    "خليه ",
    "حول ",
    "حوله ",
    "حوّل ",
    "غير ",
    "غيّر ",
  ].some((token) => q.includes(token.trim()));

  const looksLikeQuestion =
    question.includes("?") ||
    /\b(is|what|which|show|tell|check)\b/i.test(question) ||
    q.includes("حالة") ||
    q.includes("هل ");

  return explicitCommand || !looksLikeQuestion;
}

function fallbackAnswer(question: string, snapshot: ReturnType<typeof buildSnapshot>) {
  const q = question.toLowerCase();
  if (q.includes("stock") || q.includes("مخزون") || q.includes("ستوك")) {
    return snapshot.inventory.map((item) => `${item.name}: ${item.stock} in stock${item.low ? " (LOW)" : ""}.`).join(" ");
  }
  if (q.includes("profit") || q.includes("ربح") || q.includes("مكسب")) {
    return `Today's delivered profit is approximately ${snapshot.todayProfit.toLocaleString("en-GB")} EGP. All-time delivered revenue is ${snapshot.deliveredRevenue.toLocaleString("en-GB")} EGP.`;
  }
  if (q.includes("order") || q.includes("اوردر") || q.includes("أوردر")) {
    return `${snapshot.ordersToday} orders were placed today. ${snapshot.waitingConfirmation} pre-orders need confirmation and ${snapshot.delayedOrders.length} need attention.`;
  }
  return snapshot.oneLine;
}

function buildSnapshot(orders: OrderRow[], inventory: InventoryRow[], cash: CashRow[], chats: ChatRow[]) {
  const today = dayKey(new Date());
  const ordersTodayRows = orders.filter((order) => dayKey(order.created_at) === today && order.status !== "cancelled");
  const delivered = orders.filter((order) => order.status === "delivered");
  const deliveredToday = delivered.filter((order) => dayKey(order.delivered_at || order.created_at) === today);
  const todayOperatingExpenses = cash
    .filter((entry) => entry.entry_type === "expense" && entry.entry_date === today && !entry.category.toLowerCase().startsWith("stock"))
    .reduce((sum, entry) => sum + n(entry.amount), 0);
  const todayRevenue = deliveredToday.reduce((sum, order) => sum + n(order.total_price), 0);
  const todayCogs = deliveredToday.reduce((sum, order) => sum + n(order.unit_cost_at_sale) * n(order.quantity), 0);
  const todayProfit = Math.round((todayRevenue - todayCogs - todayOperatingExpenses) * 100) / 100;
  const deliveredRevenue = delivered.reduce((sum, order) => sum + n(order.total_price), 0);
  const waitingConfirmation = orders.filter((order) => order.status === "new").length;
  const delayedOrders = orders.filter((order) => {
    if (!["confirmed", "shipped", "out_for_delivery"].includes(order.status)) return false;
    return Date.now() - new Date(order.created_at).getTime() >= 24 * 60 * 60 * 1000;
  });
  const unreadChats = chats.filter((chat) => chat.status !== "closed" && chat.last_sender === "customer").length;
  const stock = inventory.map((item) => ({
    name: item.product_name,
    stock: Number(item.stock_quantity || 0),
    lowLimit: Number(item.low_stock_limit || 0),
    low: item.is_available && Number(item.stock_quantity || 0) <= Number(item.low_stock_limit || 0),
    available: item.is_available,
  }));

  return {
    date: today,
    ordersToday: ordersTodayRows.length,
    salesValueToday: Math.round(ordersTodayRows.reduce((sum, order) => sum + n(order.total_price), 0) * 100) / 100,
    deliveredToday: deliveredToday.length,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayProfit,
    deliveredRevenue: Math.round(deliveredRevenue * 100) / 100,
    waitingConfirmation,
    unreadChats,
    inventory: stock,
    delayedOrders: delayedOrders.slice(0, 15).map((order) => ({
      orderNumber: order.order_number,
      customer: order.customer_name,
      status: order.status === "new" ? "pre_order" : order.status,
      total: n(order.total_price),
    })),
    recentOrders: orders.slice(0, 25).map((order) => ({
      orderNumber: order.order_number,
      customer: order.customer_name,
      product: order.product_name,
      quantity: order.quantity,
      total: n(order.total_price),
      status: order.status === "new" ? "pre_order" : order.status,
      createdAt: order.created_at,
    })),
    recentCash: cash.slice(0, 25).map((entry) => ({
      type: entry.entry_type,
      category: entry.category,
      amount: n(entry.amount),
      date: entry.entry_date,
      paidBy: entry.paid_by || null,
    })),
    oneLine: `${ordersTodayRows.length} orders today · ${waitingConfirmation} pre-orders need confirmation · ${todayProfit.toLocaleString("en-GB")} EGP delivered profit · ${stock.filter((item) => item.low).length} low-stock products · ${unreadChats} customer chats waiting.`,
  };
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "assistant")) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const question = String(body.question || "").trim().slice(0, 700);
    if (!question) {
      return NextResponse.json({ success: false, message: "Ask a question first." }, { status: 400 });
    }

    const orderNumber = extractOrderNumber(question);
    const requestedStatus = extractRequestedStatus(question);

    if (isOrderStatusCommand(question, orderNumber, requestedStatus)) {
      if (!hasAdminPermission(request, "orders")) {
        return NextResponse.json({ success: false, message: "Your role cannot change order statuses." }, { status: 403 });
      }

      const matchedOrders = await supabaseAdminJson<OrderRow[]>(
        `orders?select=id,order_number,customer_name,product_name,quantity,total_price,status,created_at,delivered_at,unit_cost_at_sale&order_number=eq.${postgrestValue(orderNumber!)}&limit=1`
      );
      const order = matchedOrders[0];

      if (!order) {
        return NextResponse.json({
          success: false,
          message: `Order ${orderNumber} was not found. Check the order number and try again.`,
        }, { status: 404 });
      }

      const nextStatus = requestedStatus!;
      const previousStatus = (order.status || "new") as OrderStatus;

      if (previousStatus === nextStatus) {
        return NextResponse.json({
          success: true,
          answer: `Order ${order.order_number} is already ${statusLabels[nextStatus]}.`,
          ai: false,
          action: {
            type: "order_status_update",
            orderNumber: order.order_number,
            previousStatus,
            status: nextStatus,
            statusLabel: statusLabels[nextStatus],
            changed: false,
          },
        });
      }

      const forwarded = new NextRequest(new URL("/api/admin/order-status", request.url), {
        method: "PATCH",
        headers: request.headers,
        body: JSON.stringify({
          orderId: order.id,
          status: nextStatus,
        }),
      });

      const statusResponse = await patchOrderStatus(forwarded);
      const statusPayload = (await statusResponse.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!statusResponse.ok || !statusPayload.success) {
        return NextResponse.json({
          success: false,
          message: statusPayload.message || "Could not update the order status.",
        }, { status: statusResponse.status || 500 });
      }

      return NextResponse.json({
        success: true,
        answer: `Done. Order ${order.order_number} changed from ${statusLabels[previousStatus] || previousStatus} to ${statusLabels[nextStatus]}.`,
        ai: false,
        action: {
          type: "order_status_update",
          orderNumber: order.order_number,
          previousStatus,
          status: nextStatus,
          statusLabel: statusLabels[nextStatus],
          changed: true,
        },
      });
    }

    const [orders, inventory, cash, chats] = await Promise.all([
      supabaseAdminJson<OrderRow[]>("orders?select=id,order_number,customer_name,product_name,quantity,total_price,status,created_at,delivered_at,unit_cost_at_sale&order=created_at.desc&limit=500"),
      supabaseAdminJson<InventoryRow[]>("product_inventory?select=product_name,stock_quantity,low_stock_limit,is_available&order=product_name.asc"),
      supabaseAdminJson<CashRow[]>("cashflow_entries?select=entry_type,category,amount,entry_date,paid_by&order=entry_date.desc&limit=500"),
      supabaseAdminJson<ChatRow[]>("customer_chat_sessions?select=status,last_sender,last_message_at&order=last_message_at.desc&limit=200"),
    ]);

    const snapshot = buildSnapshot(orders, inventory, cash, chats);

    try {
      const { text } = await generateText({
        model: "openai/gpt-5.6-luna",
        prompt: `You are ORVIX Assistant, an internal business copilot for the ORVIX admin dashboard.\n\nAnswer the owner's question using ONLY the provided live ORVIX business snapshot. Never invent orders, money, customers, stock, or events. If the snapshot cannot answer something, say that clearly. Keep answers concise and practical. Answer in Egyptian Arabic/Arabizi when the question is Arabic/Arabizi; otherwise answer in English. Money is EGP. The internal order status \"new\" is shown to the owner as \"Pre-order\" because ORVIX products are pre-orders. Order status changes are handled deterministically outside the AI; never claim you changed a status unless the API already did it.\n\nLIVE ORVIX SNAPSHOT:\n${JSON.stringify(snapshot)}\n\nOWNER QUESTION:\n${question}`,
      });

      if (text.trim()) {
        return NextResponse.json({ success: true, answer: text.trim(), ai: true });
      }
    } catch (aiError) {
      console.error("ORVIX Assistant AI provider error:", aiError);
    }

    return NextResponse.json({
      success: true,
      answer: fallbackAnswer(question, snapshot),
      ai: false,
      message: "AI provider was unavailable, so ORVIX used its live-data fallback.",
    });
  } catch (error) {
    console.error("ORVIX Assistant error:", error);
    return NextResponse.json({ success: false, message: "ORVIX Assistant could not answer right now." }, { status: 500 });
  }
}
