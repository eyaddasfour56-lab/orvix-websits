import { NextRequest, NextResponse } from "next/server";
import { getPushConfig, notifyAdmin } from "@/lib/admin-push";

function dbSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString("en-GB") : "0";
}

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export async function POST(request: NextRequest) {
  const config = await getPushConfig();
  const receivedToken = request.headers.get("x-orvix-webhook-token") || "";

  if (!config || receivedToken !== config.webhook_token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const db = dbSettings();
  if (!db) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const type = String(payload?.type || "");
    const id = String(payload?.id || "");

    if (!id) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    if (type === "order") {
      const response = await fetch(
        `${db.url}/rest/v1/orders?id=eq.${encodeURIComponent(id)}&select=id,order_number,customer_name,total_price,products_total,delivery_fee,quantity,product_name&limit=1`,
        { headers: headers(db.key), cache: "no-store" }
      );
      const rows = response.ok ? await response.json() : [];
      const order = Array.isArray(rows) ? rows[0] : null;
      if (!order) return NextResponse.json({ success: false }, { status: 404 });

      const total = money(order.total_price);
      const result = await notifyAdmin({
        kind: "order",
        title: `🛍️ Order placed · ${total} EGP`,
        body: `${clean(order.customer_name, 70)} · ${clean(order.order_number, 80)} · ${Number(order.quantity || 1)}× ${clean(order.product_name || "ORVIX product", 80)}`,
        targetUrl: `/admin?order=${encodeURIComponent(String(order.order_number || ""))}`,
        eventKey: `order:${order.id}`,
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (type === "chat_message") {
      const messageResponse = await fetch(
        `${db.url}/rest/v1/customer_chat_messages?id=eq.${encodeURIComponent(id)}&select=id,session_id,sender,body,created_at&limit=1`,
        { headers: headers(db.key), cache: "no-store" }
      );
      const messageRows = messageResponse.ok ? await messageResponse.json() : [];
      const message = Array.isArray(messageRows) ? messageRows[0] : null;
      if (!message || message.sender !== "customer") {
        return NextResponse.json({ success: false }, { status: 404 });
      }

      const sessionResponse = await fetch(
        `${db.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(String(message.session_id))}&select=id,customer_name,support_mode,human_requested&limit=1`,
        { headers: headers(db.key), cache: "no-store" }
      );
      const sessionRows = sessionResponse.ok ? await sessionResponse.json() : [];
      const session = Array.isArray(sessionRows) ? sessionRows[0] : null;
      if (!session) return NextResponse.json({ success: false }, { status: 404 });

      const human = session.support_mode === "human" || Boolean(session.human_requested);
      const result = await notifyAdmin({
        kind: human ? "human" : "chat",
        title: human
          ? `💬 Human Support · ${clean(session.customer_name, 70)}`
          : `💬 New customer message · ${clean(session.customer_name, 70)}`,
        body: clean(message.body, 220) || "New customer message",
        targetUrl: `/admin/chats?conversation=${encodeURIComponent(String(session.id))}`,
        eventKey: `chat:${message.id}`,
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (type === "human_request") {
      const response = await fetch(
        `${db.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(id)}&select=id,customer_name,customer_phone,support_mode&limit=1`,
        { headers: headers(db.key), cache: "no-store" }
      );
      const rows = response.ok ? await response.json() : [];
      const session = Array.isArray(rows) ? rows[0] : null;
      if (!session) return NextResponse.json({ success: false }, { status: 404 });

      const result = await notifyAdmin({
        kind: "human",
        title: "🧑‍💬 Human support requested",
        body: `${clean(session.customer_name, 80)} wants to speak with Customer Service now.`,
        targetUrl: `/admin/chats?conversation=${encodeURIComponent(String(session.id))}`,
        eventKey: `human:${session.id}`,
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, message: "Unsupported event." }, { status: 400 });
  } catch (error) {
    console.error("Internal admin notification error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
