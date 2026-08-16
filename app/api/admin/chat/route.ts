import { createHmac, timingSafeEqual } from "crypto";
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
  admin_last_read_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const received = request.cookies.get("orvix_admin_session")?.value;
  if (!secret || !received) return false;

  const expected = createAdminSession(secret);
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function getSupabaseSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
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

function withUnread(session: ChatSession) {
  const lastMessageAt = new Date(session.last_message_at).getTime();
  const lastReadAt = session.admin_last_read_at
    ? new Date(session.admin_last_read_at).getTime()
    : 0;

  return {
    id: session.id,
    customerName: session.customer_name,
    customerPhone: session.customer_phone || "",
    status: session.status,
    lastMessagePreview: session.last_message_preview || "No messages yet",
    lastSender: session.last_sender,
    lastMessageAt: session.last_message_at,
    createdAt: session.created_at,
    unread: session.last_sender === "customer" && lastMessageAt > lastReadAt,
  };
}

async function getSessionById(
  settings: { url: string; key: string },
  sessionId: string
) {
  const response = await fetch(
    `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,
    { headers: headers(settings.key), cache: "no-store" }
  );

  if (!response.ok) {
    console.error("Admin chat session lookup failed:", await response.text());
    throw new Error("Could not load conversation.");
  }

  const rows = (await response.json()) as ChatSession[];
  return rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId") || "";

    if (!sessionId) {
      const response = await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions?select=*&order=last_message_at.desc&limit=200`,
        { headers: headers(settings.key), cache: "no-store" }
      );

      if (!response.ok) {
        console.error("Admin chat inbox failed:", await response.text());
        return NextResponse.json(
          { success: false, message: "Could not load customer chats." },
          { status: 500 }
        );
      }

      const sessions = (await response.json()) as ChatSession[];
      return NextResponse.json({
        success: true,
        conversations: sessions.map(withUnread),
      });
    }

    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid conversation." },
        { status: 400 }
      );
    }

    const session = await getSessionById(settings, sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Conversation not found." },
        { status: 404 }
      );
    }

    const messagesResponse = await fetch(
      `${settings.url}/rest/v1/customer_chat_messages?session_id=eq.${encodeURIComponent(sessionId)}&select=id,sender,body,created_at&order=created_at.asc`,
      { headers: headers(settings.key), cache: "no-store" }
    );

    if (!messagesResponse.ok) {
      console.error("Admin chat messages failed:", await messagesResponse.text());
      return NextResponse.json(
        { success: false, message: "Could not load messages." },
        { status: 500 }
      );
    }

    const messages = (await messagesResponse.json()) as Omit<
      ChatMessage,
      "session_id"
    >[];
    const readAt = new Date().toISOString();

    const readResponse = await fetch(
      `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: headers(settings.key),
        body: JSON.stringify({ admin_last_read_at: readAt, updated_at: readAt }),
        cache: "no-store",
      }
    );

    if (!readResponse.ok) {
      console.error("Admin chat read marker failed:", await readResponse.text());
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...withUnread({ ...session, admin_last_read_at: readAt }),
        unread: false,
      },
      messages,
    });
  } catch (error) {
    console.error("Admin chat GET error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load customer chats." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const action = cleanText(body?.action, 20);
    const sessionId = cleanText(body?.sessionId, 50);

    if (!UUID_PATTERN.test(sessionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid conversation." },
        { status: 400 }
      );
    }

    const session = await getSessionById(settings, sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Conversation not found." },
        { status: 404 }
      );
    }

    if (action === "message") {
      const message = cleanText(body?.message, 1000);
      if (!message) {
        return NextResponse.json(
          { success: false, message: "Write a reply first." },
          { status: 400 }
        );
      }

      const insertResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_messages`,
        {
          method: "POST",
          headers: headers(settings.key, { Prefer: "return=representation" }),
          body: JSON.stringify({ session_id: session.id, sender: "admin", body: message }),
          cache: "no-store",
        }
      );

      if (!insertResponse.ok) {
        console.error("Admin chat reply failed:", await insertResponse.text());
        return NextResponse.json(
          { success: false, message: "Could not send reply." },
          { status: 500 }
        );
      }

      const savedRows = (await insertResponse.json()) as ChatMessage[];
      const savedMessage = savedRows[0];
      const now = savedMessage?.created_at || new Date().toISOString();

      const updateResponse = await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: headers(settings.key),
          body: JSON.stringify({
            status: "open",
            last_message_preview: message.slice(0, 180),
            last_sender: "admin",
            last_message_at: now,
            admin_last_read_at: now,
            updated_at: now,
          }),
          cache: "no-store",
        }
      );

      if (!updateResponse.ok) {
        console.error("Admin chat session update failed:", await updateResponse.text());
      }

      return NextResponse.json({ success: true, message: savedMessage });
    }

    if (action === "status") {
      const status = body?.status === "closed" ? "closed" : "open";
      const now = new Date().toISOString();

      const response = await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
        {
          method: "PATCH",
          headers: headers(settings.key),
          body: JSON.stringify({ status, updated_at: now }),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        console.error("Admin chat status update failed:", await response.text());
        return NextResponse.json(
          { success: false, message: "Could not update conversation." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, status });
    }

    return NextResponse.json(
      { success: false, message: "Unsupported chat action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin chat POST error:", error);
    return NextResponse.json(
      { success: false, message: "Could not update customer chat." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawIds: unknown[] = Array.isArray(body?.sessionIds) ? body.sessionIds : [];
    const cleanedIds: string[] = rawIds.map((value: unknown) => cleanText(value, 50));
    const sessionIds: string[] = Array.from(new Set<string>(cleanedIds)).filter(
      (value: string) => UUID_PATTERN.test(value)
    );

    if (sessionIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one conversation to delete." },
        { status: 400 }
      );
    }

    if (sessionIds.length > 50 || sessionIds.length !== rawIds.length) {
      return NextResponse.json(
        { success: false, message: "Invalid conversation selection." },
        { status: 400 }
      );
    }

    const filter = `(${sessionIds.join(",")})`;
    const response = await fetch(
      `${settings.url}/rest/v1/customer_chat_sessions?id=in.${filter}`,
      {
        method: "DELETE",
        headers: headers(settings.key, { Prefer: "return=representation" }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("Admin chat delete failed:", await response.text());
      return NextResponse.json(
        { success: false, message: "Could not delete selected conversations." },
        { status: 500 }
      );
    }

    const deleted = (await response.json()) as ChatSession[];
    const deletedIds = deleted.map((item) => item.id);

    return NextResponse.json({
      success: true,
      deletedIds,
      deletedCount: deletedIds.length,
    });
  } catch (error) {
    console.error("Admin chat DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Could not delete selected conversations." },
      { status: 500 }
    );
  }
}
