import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

type OrderRow = {
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

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    return `${snapshot.ordersToday} orders were placed today. ${snapshot.waitingConfirmation} need confirmation and ${snapshot.delayedOrders.length} need attention.`;
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
      status: order.status,
      total: n(order.total_price),
    })),
    recentOrders: orders.slice(0, 25).map((order) => ({
      orderNumber: order.order_number,
      customer: order.customer_name,
      product: order.product_name,
      quantity: order.quantity,
      total: n(order.total_price),
      status: order.status,
      createdAt: order.created_at,
    })),
    recentCash: cash.slice(0, 25).map((entry) => ({
      type: entry.entry_type,
      category: entry.category,
      amount: n(entry.amount),
      date: entry.entry_date,
      paidBy: entry.paid_by || null,
    })),
    oneLine: `${ordersTodayRows.length} orders today · ${waitingConfirmation} need confirmation · ${todayProfit.toLocaleString("en-GB")} EGP delivered profit · ${stock.filter((item) => item.low).length} low-stock products · ${unreadChats} customer chats waiting.`,
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

    const [orders, inventory, cash, chats] = await Promise.all([
      supabaseAdminJson<OrderRow[]>("orders?select=order_number,customer_name,product_name,quantity,total_price,status,created_at,delivered_at,unit_cost_at_sale&order=created_at.desc&limit=500"),
      supabaseAdminJson<InventoryRow[]>("product_inventory?select=product_name,stock_quantity,low_stock_limit,is_available&order=product_name.asc"),
      supabaseAdminJson<CashRow[]>("cashflow_entries?select=entry_type,category,amount,entry_date,paid_by&order=entry_date.desc&limit=500"),
      supabaseAdminJson<ChatRow[]>("customer_chat_sessions?select=status,last_sender,last_message_at&order=last_message_at.desc&limit=200"),
    ]);

    const snapshot = buildSnapshot(orders, inventory, cash, chats);

    try {
      const { text } = await generateText({
        model: "openai/gpt-5.6-luna",
        prompt: `You are ORVIX Assistant, an internal business copilot for the ORVIX admin dashboard.\n\nAnswer the owner's question using ONLY the provided live ORVIX business snapshot. Never invent orders, money, customers, stock, or events. If the snapshot cannot answer something, say that clearly. Keep answers concise and practical. Answer in Egyptian Arabic/Arabizi when the question is Arabic/Arabizi; otherwise answer in English. Money is EGP.\n\nLIVE ORVIX SNAPSHOT:\n${JSON.stringify(snapshot)}\n\nOWNER QUESTION:\n${question}`,
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
