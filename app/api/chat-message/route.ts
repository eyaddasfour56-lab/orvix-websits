import { NextRequest, NextResponse } from "next/server";

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      { success: false, message: "Chat is temporarily unavailable." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const token = clean(body?.token, 50);
    const message = clean(body?.message, 1000);

    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json(
        { success: false, message: "Invalid chat session." },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, message: "Write a message first." },
        { status: 400 }
      );
    }

    const sessionResponse = await fetch(
      `${db.url}/rest/v1/customer_chat_sessions?public_token=eq.${encodeURIComponent(token)}&select=id,status&limit=1`,
      {
        headers: headers(db.key),
        cache: "no-store",
      }
    );

    if (!sessionResponse.ok) {
      console.error("Fast chat session lookup failed:", await sessionResponse.text());
      return NextResponse.json(
        { success: false, message: "Could not send message." },
        { status: 500 }
      );
    }

    const sessions = (await sessionResponse.json()) as Array<{ id: string; status: string }>;
    const session = sessions[0];

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Chat session not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const [insertResponse, sessionUpdateResponse] = await Promise.all([
      fetch(`${db.url}/rest/v1/customer_chat_messages`, {
        method: "POST",
        headers: headers(db.key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          session_id: session.id,
          sender: "customer",
          body: message,
        }),
        cache: "no-store",
      }),
      fetch(
        `${db.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: headers(db.key),
          body: JSON.stringify({
            status: "open",
            last_message_preview: message.slice(0, 180),
            last_sender: "customer",
            last_message_at: now,
            updated_at: now,
          }),
          cache: "no-store",
        }
      ),
    ]);

    if (!insertResponse.ok) {
      console.error("Fast customer chat insert failed:", await insertResponse.text());
      return NextResponse.json(
        { success: false, message: "Could not send message." },
        { status: 500 }
      );
    }

    if (!sessionUpdateResponse.ok) {
      console.error("Fast chat session update failed:", await sessionUpdateResponse.text());
    }

    const inserted = (await insertResponse.json()) as Array<{
      id: string;
      sender: "customer";
      body: string;
      created_at: string;
    }>;

    return NextResponse.json({
      success: true,
      message:
        inserted[0] || {
          id: `local-${Date.now()}`,
          sender: "customer",
          body: message,
          created_at: now,
        },
    });
  } catch (error) {
    console.error("Fast customer chat POST error:", error);
    return NextResponse.json(
      { success: false, message: "Could not send message." },
      { status: 500 }
    );
  }
}
