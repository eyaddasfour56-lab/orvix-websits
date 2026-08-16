import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

const VERIFY_KEY = "orvix-ai-verify-20260817-x7q9";
const MODEL = "openai/gpt-5.6-sol";

function dbSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, extra?: Record<string, string>) {
  return { apikey: key, "Content-Type": "application/json", ...extra };
}

function errorInfo(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.slice(0, 1000),
      cause:
        error.cause instanceof Error
          ? error.cause.message.slice(0, 1000)
          : error.cause
            ? String(error.cause).slice(0, 1000)
            : null,
    };
  }
  return { name: "Unknown", message: String(error).slice(0, 1000), cause: null };
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== VERIFY_KEY) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  const runtime = {
    vercel: Boolean(process.env.VERCEL),
    oidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
    gatewayKey: Boolean(process.env.AI_GATEWAY_API_KEY),
    openAiKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.AI_GATEWAY_CHAT_MODEL || MODEL,
  };

  let directText = "";
  let directError: ReturnType<typeof errorInfo> | null = null;

  try {
    const result = await generateText({
      model: process.env.AI_GATEWAY_CHAT_MODEL || MODEL,
      prompt: "Reply with exactly ORVIX_AI_OK and nothing else.",
    });
    directText = result.text.trim();
  } catch (error) {
    directError = errorInfo(error);
  }

  const settings = dbSettings();
  if (!settings) {
    return NextResponse.json({
      success: false,
      stage: "database_settings",
      runtime,
      directText,
      directError,
    }, { status: 500 });
  }

  let sessionId = "";
  let previousAiEnabled = false;

  try {
    const settingsResponse = await fetch(
      `${settings.url}/rest/v1/customer_support_settings?id=eq.default&select=ai_auto_reply&limit=1`,
      { headers: headers(settings.key), cache: "no-store" }
    );
    const settingsRows = settingsResponse.ok
      ? ((await settingsResponse.json()) as Array<{ ai_auto_reply?: boolean }>)
      : [];
    previousAiEnabled = Boolean(settingsRows[0]?.ai_auto_reply);

    if (!previousAiEnabled) {
      await fetch(`${settings.url}/rest/v1/customer_support_settings?id=eq.default`, {
        method: "PATCH",
        headers: headers(settings.key),
        body: JSON.stringify({ ai_auto_reply: true, updated_at: new Date().toISOString() }),
        cache: "no-store",
      });
    }

    const now = new Date().toISOString();
    const createSessionResponse = await fetch(
      `${settings.url}/rest/v1/customer_chat_sessions`,
      {
        method: "POST",
        headers: headers(settings.key, { Prefer: "return=representation" }),
        body: JSON.stringify({
          customer_name: "ORVIX AI SELF TEST",
          customer_phone: null,
          status: "open",
          human_requested: false,
          ai_paused: false,
          last_message_preview: "Can you explain how discount codes work?",
          last_sender: "customer",
          last_message_at: now,
          customer_last_read_at: now,
          updated_at: now,
        }),
        cache: "no-store",
      }
    );

    if (!createSessionResponse.ok) {
      return NextResponse.json({
        success: false,
        stage: "create_session",
        runtime,
        directText,
        directError,
        detail: await createSessionResponse.text(),
      }, { status: 500 });
    }

    const sessionRows = (await createSessionResponse.json()) as Array<{
      id: string;
      public_token: string;
    }>;
    const session = sessionRows[0];
    if (!session) {
      return NextResponse.json({ success: false, stage: "create_session_empty", runtime, directText, directError }, { status: 500 });
    }
    sessionId = session.id;

    const customerMessageResponse = await fetch(
      `${settings.url}/rest/v1/customer_chat_messages`,
      {
        method: "POST",
        headers: headers(settings.key),
        body: JSON.stringify({
          session_id: session.id,
          sender: "customer",
          body: "How do I use a discount code on the ORVIX website?",
        }),
        cache: "no-store",
      }
    );

    if (!customerMessageResponse.ok) {
      return NextResponse.json({ success: false, stage: "insert_customer_message", runtime, directText, directError }, { status: 500 });
    }

    const workerResponse = await fetch(`${request.nextUrl.origin}/api/chat-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.public_token }),
      cache: "no-store",
    });
    const workerPayload = await workerResponse.json().catch(() => ({}));

    const messagesResponse = await fetch(
      `${settings.url}/rest/v1/customer_chat_messages?session_id=eq.${encodeURIComponent(session.id)}&select=sender,body,created_at&order=created_at.asc`,
      { headers: headers(settings.key), cache: "no-store" }
    );
    const messages = messagesResponse.ok
      ? ((await messagesResponse.json()) as Array<{ sender: string; body: string }>)
      : [];
    const aiMessage = [...messages].reverse().find((item) => item.sender === "admin");

    return NextResponse.json({
      success:
        directText === "ORVIX_AI_OK" &&
        workerResponse.ok &&
        workerPayload?.action === "replied" &&
        Boolean(aiMessage?.body),
      runtime,
      directText,
      directError,
      workerStatus: workerResponse.status,
      workerAction: workerPayload?.action || null,
      aiReply: aiMessage?.body || null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      stage: "exception",
      runtime,
      directText,
      directError,
      detail: errorInfo(error),
    }, { status: 500 });
  } finally {
    if (sessionId) {
      await fetch(
        `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers: headers(settings.key),
          cache: "no-store",
        }
      ).catch(() => undefined);
    }

    if (!previousAiEnabled) {
      await fetch(`${settings.url}/rest/v1/customer_support_settings?id=eq.default`, {
        method: "PATCH",
        headers: headers(settings.key),
        body: JSON.stringify({ ai_auto_reply: false, updated_at: new Date().toISOString() }),
        cache: "no-store",
      }).catch(() => undefined);
    }
  }
}
