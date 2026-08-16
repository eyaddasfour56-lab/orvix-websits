import { NextRequest, NextResponse } from "next/server";

function dbSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  const db = dbSettings();
  if (!db) {
    return NextResponse.json({ success: false, message: "Chat is temporarily unavailable." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const customerName = clean(body?.customerName, 80);
    const customerPhone = clean(body?.customerPhone, 30);
    const supportMode = body?.supportMode === "human" ? "human" : "ai";

    if (customerName.length < 2) {
      return NextResponse.json({ success: false, message: "Please enter your name." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const human = supportMode === "human";
    const welcome = human
      ? "Human Support selected 👋 ORVIX Customer Service has been notified. Send your message here and a team member will reply as soon as possible."
      : "AI Support selected ✨ Ask your question here. If you need a person at any time, just ask for Customer Service.";

    const response = await fetch(`${db.url}/rest/v1/customer_chat_sessions`, {
      method: "POST",
      headers: headers(db.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        customer_name: customerName,
        customer_phone: customerPhone || null,
        support_mode: supportMode,
        status: "open",
        human_requested: human,
        human_requested_at: human ? now : null,
        human_request_reason: human ? "Customer selected Human Support before starting the chat" : null,
        ai_paused: human,
        last_message_preview: human ? "Human Support requested" : welcome.slice(0, 180),
        last_sender: "system",
        last_message_at: now,
        customer_last_read_at: now,
        updated_at: now,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Chat start failed:", await response.text());
      return NextResponse.json({ success: false, message: "Could not start chat." }, { status: 500 });
    }

    const sessions = await response.json();
    const session = Array.isArray(sessions) ? sessions[0] : null;
    if (!session) {
      return NextResponse.json({ success: false, message: "Could not start chat." }, { status: 500 });
    }

    const messageResponse = await fetch(`${db.url}/rest/v1/customer_chat_messages`, {
      method: "POST",
      headers: headers(db.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        session_id: session.id,
        sender: "system",
        body: welcome,
      }),
      cache: "no-store",
    });

    const messageRows = messageResponse.ok ? await messageResponse.json() : [];
    const greeting = Array.isArray(messageRows) ? messageRows[0] : null;

    return NextResponse.json({
      success: true,
      token: session.public_token,
      supportMode,
      session: {
        customerName: session.customer_name,
        status: session.status,
        createdAt: session.created_at,
        humanRequested: human,
        aiPaused: human,
      },
      messages: [
        greeting || {
          id: `welcome-${session.id}`,
          sender: "system",
          body: welcome,
          created_at: now,
        },
      ],
    });
  } catch (error) {
    console.error("Chat start API error:", error);
    return NextResponse.json({ success: false, message: "Could not start chat." }, { status: 500 });
  }
}
