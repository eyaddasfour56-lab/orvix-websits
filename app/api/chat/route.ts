import { NextRequest, NextResponse } from "next/server";

type ChatSession = {
  id: string;
  public_token: string;
  customer_name: string;
  customer_phone?: string | null;
  status: "open" | "closed";
  last_message_preview?: string | null;
  last_sender?: "customer" | "admin" | "system" | null;
  last_message_at: string;
  created_at: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WELCOME_MESSAGE =
  "Welcome to ORVIX Customer Service 👋 Send us your question and we’ll reply here as soon as possible.";

function getSupabaseSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;
  return { url, key };
}

function headers(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function getSessionByToken(
  settings: { url: string; key: string },
  token: string
) {
  const response = await fetch(
    `${settings.url}/rest/v1/customer_chat_sessions?public_token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
    {
      headers: headers(settings.key),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Customer chat session lookup failed:", await response.text());
    throw new Error("Could not load chat session.");
  }

  const rows = (await response.json()) as ChatSession[];
  return rows[0] || null;
}

async function getMessages(
  settings: { url: string; key: string },
  sessionId: string
) {
  const response = await fetch(
    `${settings.url}/rest/v1/customer_chat_messages?session_id=eq.${encodeURIComponent(sessionId)}&select=id,sender,body,created_at&order=created_at.asc`,
    {
      headers: headers(settings.key),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Customer chat messages lookup failed:", await response.text());
    throw new Error("Could not load chat messages.");
  }

  return (await response.json()) as Omit<ChatMessage, "session_id">[];
}

export async function GET(request: NextRequest) {
  try {
    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Chat is temporarily unavailable." },
        { status: 500 }
      );
    }

    const token = request.nextUrl.searchParams.get("token") || "";
    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json(
        { success: false, message: "Invalid chat session." },
        { status: 400 }
      );
    }

    const session = await getSessionByToken(settings, token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Chat session not found." },
        { status: 404 }
      );
    }

    const messages = await getMessages(settings, session.id);

    return NextResponse.json({
      success: true,
      session: {
        customerName: session.customer_name,
        status: session.status,
        createdAt: session.created_at,
      },
      messages,
    });
  } catch (error) {
    console.error("Customer chat GET error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load chat." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Chat is temporarily unavailable." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const action = cleanText(body?.action, 20);

    if (action === "start") {
      const customerName = cleanText(body?.customerName, 80);
      const customerPhone = cleanText(body?.customerPhone, 30);

      if (customerName.length < 2) {
        return NextResponse.json(
          { success: false, message: "Please enter your name." },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      const createResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions`,
        {
          method: "POST",
          headers: headers(settings.key, { Prefer: "return=representation" }),
          body: JSON.stringify({
            customer_name: customerName,
            customer_phone: customerPhone || null,
            status: "open",
            last_message_preview: WELCOME_MESSAGE.slice(0, 180),
            last_sender: "system",
            last_message_at: now,
            customer_last_read_at: now,
            updated_at: now,
          }),
          cache: "no-store",
        }
      );

      if (!createResponse.ok) {
        console.error("Customer chat start failed:", await createResponse.text());
        return NextResponse.json(
          { success: false, message: "Could not start chat." },
          { status: 500 }
        );
      }

      const createdRows = (await createResponse.json()) as ChatSession[];
      const session = createdRows[0];

      if (!session) {
        throw new Error("Chat session was not returned after creation.");
      }

      const greetingResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_messages`,
        {
          method: "POST",
          headers: headers(settings.key),
          body: JSON.stringify({
            session_id: session.id,
            sender: "system",
            body: WELCOME_MESSAGE,
          }),
          cache: "no-store",
        }
      );

      if (!greetingResponse.ok) {
        console.error("Customer chat greeting failed:", await greetingResponse.text());
      }

      return NextResponse.json({
        success: true,
        token: session.public_token,
        session: {
          customerName: session.customer_name,
          status: session.status,
          createdAt: session.created_at,
        },
        messages: [
          {
            id: `welcome-${session.id}`,
            sender: "system",
            body: WELCOME_MESSAGE,
            created_at: now,
          },
        ],
      });
    }

    if (action === "message") {
      const token = cleanText(body?.token, 50);
      const message = cleanText(body?.message, 1000);

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

      const session = await getSessionByToken(settings, token);
      if (!session) {
        return NextResponse.json(
          { success: false, message: "Chat session not found." },
          { status: 404 }
        );
      }

      const recentResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_messages?session_id=eq.${encodeURIComponent(session.id)}&sender=eq.customer&select=created_at&order=created_at.desc&limit=6`,
        {
          headers: headers(settings.key),
          cache: "no-store",
        }
      );

      if (recentResponse.ok) {
        const recent = (await recentResponse.json()) as Array<{ created_at: string }>;
        const oneMinuteAgo = Date.now() - 60_000;
        const countInLastMinute = recent.filter(
          (item) => new Date(item.created_at).getTime() >= oneMinuteAgo
        ).length;

        if (countInLastMinute >= 6) {
          return NextResponse.json(
            {
              success: false,
              message: "You’re sending messages too quickly. Please try again shortly.",
            },
            { status: 429 }
          );
        }
      }

      const insertResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_messages`,
        {
          method: "POST",
          headers: headers(settings.key, { Prefer: "return=representation" }),
          body: JSON.stringify({
            session_id: session.id,
            sender: "customer",
            body: message,
          }),
          cache: "no-store",
        }
      );

      if (!insertResponse.ok) {
        console.error("Customer chat message failed:", await insertResponse.text());
        return NextResponse.json(
          { success: false, message: "Could not send message." },
          { status: 500 }
        );
      }

      const inserted = (await insertResponse.json()) as ChatMessage[];
      const savedMessage = inserted[0];
      const now = savedMessage?.created_at || new Date().toISOString();

      const updateResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: headers(settings.key),
          body: JSON.stringify({
            status: "open",
            last_message_preview: message.slice(0, 180),
            last_sender: "customer",
            last_message_at: now,
            updated_at: now,
          }),
          cache: "no-store",
        }
      );

      if (!updateResponse.ok) {
        console.error("Customer chat session update failed:", await updateResponse.text());
      }

      return NextResponse.json({
        success: true,
        message: savedMessage || {
          sender: "customer",
          body: message,
          created_at: now,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported chat action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Customer chat POST error:", error);
    return NextResponse.json(
      { success: false, message: "Could not update chat." },
      { status: 500 }
    );
  }
}
