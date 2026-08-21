import { NextResponse } from "next/server";
import { ensureCustomerProfile, getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionRow = {
  id: string;
  user_id?: string | null;
  status?: string | null;
  last_message_preview?: string | null;
  last_sender?: string | null;
  last_message_at?: string | null;
  customer_last_read_at?: string | null;
  created_at?: string | null;
};

type MessageRow = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

function unread(session: SessionRow) {
  if (session.last_sender !== "admin") return false;
  const lastMessage = new Date(String(session.last_message_at || "")).getTime();
  const lastRead = session.customer_last_read_at
    ? new Date(session.customer_last_read_at).getTime()
    : 0;
  return Number.isFinite(lastMessage) && lastMessage > lastRead;
}

async function ownedSession(userId: string, sessionId: string) {
  if (!UUID_PATTERN.test(sessionId)) return null;
  const rows = await supabaseAdminJson<SessionRow[]>(
    `customer_chat_sessions?id=eq.${postgrestValue(sessionId)}&user_id=eq.${postgrestValue(userId)}&select=id,user_id,status,last_message_preview,last_sender,last_message_at,customer_last_read_at,created_at&limit=1`
  );
  return rows[0] || null;
}

export async function GET(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") || "";

    if (!sessionId) {
      const sessions = await supabaseAdminJson<SessionRow[]>(
        `customer_chat_sessions?user_id=eq.${postgrestValue(user.id)}&select=id,status,last_message_preview,last_sender,last_message_at,customer_last_read_at,created_at&order=last_message_at.desc&limit=100`
      );
      return NextResponse.json({
        success: true,
        conversations: sessions.map((session) => ({ ...session, unread: unread(session) })),
        unreadMessages: sessions.filter(unread).length,
      });
    }

    const session = await ownedSession(user.id, sessionId);
    if (!session) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    const messages = await supabaseAdminJson<MessageRow[]>(
      `customer_chat_messages?session_id=eq.${postgrestValue(session.id)}&select=id,sender,body,created_at&order=created_at.asc&limit=500`
    );

    const now = new Date().toISOString();
    await supabaseAdminJson(`customer_chat_sessions?id=eq.${postgrestValue(session.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ customer_last_read_at: now, updated_at: now }),
    });

    return NextResponse.json({ success: true, conversation: { ...session, unread: false }, messages });
  } catch (error) {
    console.error("Customer support inbox error:", error);
    return NextResponse.json({ success: false, message: "Could not load your messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const profile = await ensureCustomerProfile(user);
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "send").trim().toLowerCase();
    const now = new Date().toISOString();

    if (action === "start") {
      const existing = await supabaseAdminJson<SessionRow[]>(
        `customer_chat_sessions?user_id=eq.${postgrestValue(user.id)}&status=eq.open&select=id,user_id,status,last_message_preview,last_sender,last_message_at,customer_last_read_at,created_at&order=last_message_at.desc&limit=1`
      );

      if (existing[0]) {
        return NextResponse.json({ success: true, conversation: existing[0], existing: true });
      }

      const customerName = String(profile?.full_name || user.email?.split("@")[0] || "Customer").trim().slice(0, 80);
      const customerPhone = String(profile?.phone || "").trim().slice(0, 30);
      const welcome = "You’re connected to ORVIX Customer Service. Send your message here and our team will reply inside your account.";

      const inserted = await supabaseAdminJson<SessionRow[]>("customer_chat_sessions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          customer_email: user.email || null,
          support_mode: "human",
          status: "open",
          human_requested: true,
          human_requested_at: now,
          human_request_reason: "Customer started support from My Account",
          ai_paused: true,
          last_message_preview: "Customer Service conversation started",
          last_sender: "system",
          last_message_at: now,
          customer_last_read_at: now,
          updated_at: now,
        }),
      });

      const session = inserted[0];
      if (!session) throw new Error("Conversation could not be created.");

      await supabaseAdminJson("customer_chat_messages", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ session_id: session.id, sender: "system", body: welcome }),
      });

      return NextResponse.json({ success: true, conversation: session, existing: false }, { status: 201 });
    }

    const sessionId = String(body.sessionId || "").trim();
    const message = String(body.message || "").trim().slice(0, 4000);
    if (!message) {
      return NextResponse.json({ success: false, message: "Write a message first." }, { status: 400 });
    }

    const session = await ownedSession(user.id, sessionId);
    if (!session) {
      return NextResponse.json({ success: false, message: "Conversation not found." }, { status: 404 });
    }

    if (session.status === "closed") {
      await supabaseAdminJson(`customer_chat_sessions?id=eq.${postgrestValue(session.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "open", human_requested: true, ai_paused: true, updated_at: now }),
      });
    }

    const insertedMessages = await supabaseAdminJson<MessageRow[]>("customer_chat_messages", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ session_id: session.id, sender: "customer", body: message }),
    });

    await supabaseAdminJson(`customer_chat_sessions?id=eq.${postgrestValue(session.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "open",
        human_requested: true,
        ai_paused: true,
        last_message_preview: message.slice(0, 180),
        last_sender: "customer",
        last_message_at: now,
        customer_last_read_at: now,
        updated_at: now,
      }),
    });

    return NextResponse.json({ success: true, message: insertedMessages[0] || null });
  } catch (error) {
    console.error("Customer support send error:", error);
    return NextResponse.json({ success: false, message: "Could not send your message." }, { status: 500 });
  }
}
