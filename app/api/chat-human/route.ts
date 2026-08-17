import { NextRequest, NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin-push";

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HUMAN_ACK_MESSAGE =
  "ORVIX Customer Service has been notified. A team member will reply to you here as soon as possible.";

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
    return NextResponse.json(
      { success: false, message: "Customer Service is temporarily unavailable." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const token = clean(body?.token, 50);

    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json(
        { success: false, message: "Invalid chat session." },
        { status: 400 }
      );
    }

    const sessionResponse = await fetch(
      `${db.url}/rest/v1/customer_chat_sessions?public_token=eq.${encodeURIComponent(token)}&select=id,customer_name,human_requested,support_mode&limit=1`,
      { headers: headers(db.key), cache: "no-store" }
    );

    if (!sessionResponse.ok) {
      console.error("Human handoff session lookup failed:", await sessionResponse.text());
      return NextResponse.json(
        { success: false, message: "Could not request Customer Service." },
        { status: 500 }
      );
    }

    const rows = (await sessionResponse.json()) as Array<{
      id: string;
      customer_name?: string | null;
      human_requested?: boolean | null;
      support_mode?: string | null;
    }>;
    const session = rows[0];

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Chat session not found." },
        { status: 404 }
      );
    }

    if (session.human_requested || session.support_mode === "human") {
      return NextResponse.json({ success: true, alreadyRequested: true });
    }

    const now = new Date().toISOString();

    const updateResponse = await fetch(
      `${db.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
      {
        method: "PATCH",
        headers: headers(db.key),
        body: JSON.stringify({
          status: "open",
          support_mode: "human",
          human_requested: true,
          human_requested_at: now,
          human_request_reason: "Customer tapped Talk to a Human",
          ai_paused: true,
          last_message_preview: "Human support requested",
          last_sender: "system",
          last_message_at: now,
          updated_at: now,
        }),
        cache: "no-store",
      }
    );

    if (!updateResponse.ok) {
      console.error("Human handoff session update failed:", await updateResponse.text());
      return NextResponse.json(
        { success: false, message: "Could not request Customer Service." },
        { status: 500 }
      );
    }

    const messageResponse = await fetch(`${db.url}/rest/v1/customer_chat_messages`, {
      method: "POST",
      headers: headers(db.key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        session_id: session.id,
        sender: "system",
        body: HUMAN_ACK_MESSAGE,
      }),
      cache: "no-store",
    });

    const inserted = messageResponse.ok
      ? ((await messageResponse.json()) as Array<{
          id: string;
          sender: "system";
          body: string;
          created_at: string;
        }>)[0]
      : null;

    if (!messageResponse.ok) {
      console.error("Human handoff acknowledgement insert failed:", await messageResponse.text());
    }

    const customerName = clean(session.customer_name, 80) || "Customer";
    await notifyAdmin({
      kind: "human",
      title: "Human support requested",
      body: `${customerName} wants Customer Service.`,
      targetUrl: `/admin/chats?conversation=${encodeURIComponent(session.id)}`,
      eventKey: `human-switch:${session.id}:${now}`,
    });

    return NextResponse.json({
      success: true,
      humanRequested: true,
      message:
        inserted || {
          id: `human-${session.id}-${Date.now()}`,
          sender: "system",
          body: HUMAN_ACK_MESSAGE,
          created_at: now,
        },
    });
  } catch (error) {
    console.error("Human handoff error:", error);
    return NextResponse.json(
      { success: false, message: "Could not request Customer Service." },
      { status: 500 }
    );
  }
}
