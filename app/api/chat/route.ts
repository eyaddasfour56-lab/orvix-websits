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
  human_requested?: boolean;
  human_requested_at?: string | null;
  human_request_reason?: string | null;
  ai_paused?: boolean;
  created_at: string;
};

type ChatMessage = {
  id: string;
  session_id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type SupportSettings = {
  ai_auto_reply: boolean;
};

type ProductContext = {
  name: string;
  slug: string;
  short_description?: string | null;
  price?: number | null;
  status?: string | null;
  stock_quantity?: number | null;
  allow_purchase?: boolean | null;
};

const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WELCOME_MESSAGE =
  "Welcome to ORVIX Customer Service 👋 Send us your question and we’ll reply here as soon as possible.";
const HUMAN_ACK_MESSAGE =
  "I’ve notified ORVIX Customer Service. A team member will reply to you here as soon as possible.";

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

function normalizeForIntent(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function explicitHumanRequest(message: string) {
  const normalized = normalizeForIntent(message);
  const phrases = [
    "customer service",
    "customer support",
    "human agent",
    "human support",
    "real person",
    "talk to a person",
    "talk to someone",
    "speak to a person",
    "speak to someone",
    "live agent",
    "representative",
    "خدمه العملاء",
    "خدمة العملاء",
    "عايز اكلم حد",
    "عاوز اكلم حد",
    "عايز اتكلم مع حد",
    "عاوز اتكلم مع حد",
    "عايز موظف",
    "عاوز موظف",
    "موظف خدمه العملاء",
    "موظف خدمة العملاء",
    "اكلم خدمه العملاء",
    "اكلم خدمة العملاء",
    "كلموني",
    "kalm customer service",
    "3ayz aklm customer service",
    "3ayz atklm m3 7ad",
    "3ayz aklm 7ad",
  ];

  return phrases.some((phrase) => normalized.includes(normalizeForIntent(phrase)));
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

async function getSupportSettings(settings: { url: string; key: string }) {
  const response = await fetch(
    `${settings.url}/rest/v1/customer_support_settings?id=eq.default&select=ai_auto_reply&limit=1`,
    {
      headers: headers(settings.key),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Support settings lookup failed:", await response.text());
    return { ai_auto_reply: false } as SupportSettings;
  }

  const rows = (await response.json()) as SupportSettings[];
  return rows[0] || ({ ai_auto_reply: false } as SupportSettings);
}

async function loadProductsForAi(settings: { url: string; key: string }) {
  const response = await fetch(
    `${settings.url}/rest/v1/products?select=name,slug,short_description,price,status,stock_quantity,allow_purchase&order=display_order.asc&limit=20`,
    {
      headers: headers(settings.key),
      cache: "no-store",
    }
  );

  if (!response.ok) return [] as ProductContext[];
  return (await response.json()) as ProductContext[];
}

function extractOpenAiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  const chunks = (response.output || []).flatMap((item) =>
    (item.content || [])
      .filter((content) => content.type === "output_text" && content.text)
      .map((content) => content.text || "")
  );

  return chunks.join("\n").trim();
}

async function generateAiSupportReply(
  settings: { url: string; key: string },
  session: ChatSession,
  latestCustomerMessage: string
) {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return { kind: "unavailable" as const };
  }

  const [messages, products] = await Promise.all([
    getMessages(settings, session.id),
    loadProductsForAi(settings),
  ]);

  const recentConversation = messages
    .slice(-12)
    .map((item) => `${item.sender.toUpperCase()}: ${item.body}`)
    .join("\n");

  const productContext = products.length
    ? products
        .map(
          (product) =>
            `- ${product.name}: price ${Number(product.price || 0).toLocaleString("en-GB")} EGP; status ${product.status || "unknown"}; stock ${product.stock_quantity ?? "unknown"}; purchase ${product.allow_purchase ? "enabled" : "disabled"}; page /products/${product.slug}. ${product.short_description || ""}`
        )
        .join("\n")
    : "No live product data was available.";

  const instructions = `You are ORVIX AI Customer Support for an Egyptian smart fitness technology store.
Your job is to answer short customer-service questions accurately and naturally.

Important rules:
1. Reply in the same language/style as the customer when practical. Egyptian Arabic is welcome when the customer writes Arabic or Arabizi.
2. Never invent prices, stock, discount codes, order status, delivery promises, refunds, payment confirmations, or policies.
3. Use the LIVE PRODUCT DATA below for product price/availability only.
4. General website facts: customers can use discount codes in checkout when a valid code is active; delivery fees are calculated at checkout; order tracking uses the Track Order page with order number and phone number; support is available through this chat.
5. If the customer asks for a human/customer service, wants to change/cancel/refund an order, reports a payment problem, has a complaint that needs a person, asks about a specific order you cannot verify, or you are not confident, DO NOT guess.
6. For human help, output exactly this format and nothing else:
ESCALATE: <short reason for the admin>
7. Otherwise output exactly:
REPLY: <your customer-facing reply>
8. Keep replies concise, helpful, and professional. Do not claim to be a human.

LIVE PRODUCT DATA:
${productContext}`;

  const input = `Customer name: ${session.customer_name}
Latest customer message: ${latestCustomerMessage}

Recent conversation:
${recentConversation}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-5.6",
      instructions,
      input,
      max_output_tokens: 220,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("OpenAI support reply failed:", response.status, await response.text());
    return { kind: "unavailable" as const };
  }

  const payload = await response.json();
  const text = extractOpenAiText(payload);

  if (!text) return { kind: "unavailable" as const };

  if (text.toUpperCase().startsWith("ESCALATE:")) {
    return {
      kind: "escalate" as const,
      reason: cleanText(text.slice(text.indexOf(":") + 1), 240) || "AI requested human support",
    };
  }

  const reply = text.toUpperCase().startsWith("REPLY:")
    ? cleanText(text.slice(text.indexOf(":") + 1), 1000)
    : cleanText(text, 1000);

  if (!reply) return { kind: "unavailable" as const };
  return { kind: "reply" as const, reply };
}

async function insertSupportMessage(
  settings: { url: string; key: string },
  sessionId: string,
  sender: "admin" | "system",
  body: string
) {
  const response = await fetch(
    `${settings.url}/rest/v1/customer_chat_messages`,
    {
      method: "POST",
      headers: headers(settings.key, { Prefer: "return=representation" }),
      body: JSON.stringify({ session_id: sessionId, sender, body }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Support message insert failed:", await response.text());
    return null;
  }

  const rows = (await response.json()) as ChatMessage[];
  return rows[0] || null;
}

async function markHumanRequested(
  settings: { url: string; key: string },
  session: ChatSession,
  reason: string,
  customerMessage: string,
  customerMessageAt: string
) {
  const now = new Date().toISOString();
  const response = await fetch(
    `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
    {
      method: "PATCH",
      headers: headers(settings.key),
      body: JSON.stringify({
        status: "open",
        human_requested: true,
        human_requested_at: now,
        human_request_reason: cleanText(reason, 300),
        ai_paused: true,
        last_message_preview: customerMessage.slice(0, 180),
        last_sender: "customer",
        last_message_at: customerMessageAt,
        updated_at: now,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Human escalation update failed:", await response.text());
  }

  await insertSupportMessage(settings, session.id, "system", HUMAN_ACK_MESSAGE);
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
        humanRequested: Boolean(session.human_requested),
        aiPaused: Boolean(session.ai_paused),
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
            human_requested: false,
            ai_paused: false,
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

      if (!session) throw new Error("Chat session was not returned after creation.");

      const greeting = await insertSupportMessage(
        settings,
        session.id,
        "system",
        WELCOME_MESSAGE
      );

      return NextResponse.json({
        success: true,
        token: session.public_token,
        session: {
          customerName: session.customer_name,
          status: session.status,
          createdAt: session.created_at,
          humanRequested: false,
          aiPaused: false,
        },
        messages: [
          greeting || {
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
        { headers: headers(settings.key), cache: "no-store" }
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
          body: JSON.stringify({ session_id: session.id, sender: "customer", body: message }),
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

      const baseUpdateResponse = await fetch(
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

      if (!baseUpdateResponse.ok) {
        console.error("Customer chat session update failed:", await baseUpdateResponse.text());
      }

      if (explicitHumanRequest(message)) {
        await markHumanRequested(
          settings,
          session,
          "Customer explicitly asked to speak with Customer Service",
          message,
          now
        );

        return NextResponse.json({
          success: true,
          message: savedMessage,
          escalated: true,
        });
      }

      const supportSettings = await getSupportSettings(settings);
      const shouldUseAi =
        supportSettings.ai_auto_reply &&
        !session.ai_paused &&
        !session.human_requested;

      if (shouldUseAi) {
        const aiResult = await generateAiSupportReply(settings, session, message);

        if (aiResult.kind === "escalate") {
          await markHumanRequested(
            settings,
            session,
            aiResult.reason,
            message,
            now
          );

          return NextResponse.json({
            success: true,
            message: savedMessage,
            escalated: true,
          });
        }

        if (aiResult.kind === "reply") {
          const aiMessage = await insertSupportMessage(
            settings,
            session.id,
            "admin",
            aiResult.reply
          );
          const replyAt = aiMessage?.created_at || new Date().toISOString();

          const aiUpdateResponse = await fetch(
            `${settings.url}/rest/v1/customer_chat_sessions?id=eq.${encodeURIComponent(session.id)}`,
            {
              method: "PATCH",
              headers: headers(settings.key),
              body: JSON.stringify({
                status: "open",
                last_message_preview: aiResult.reply.slice(0, 180),
                last_sender: "admin",
                last_message_at: replyAt,
                updated_at: replyAt,
              }),
              cache: "no-store",
            }
          );

          if (!aiUpdateResponse.ok) {
            console.error("AI chat session update failed:", await aiUpdateResponse.text());
          }

          return NextResponse.json({
            success: true,
            message: savedMessage,
            aiReply: aiMessage,
          });
        }
      }

      return NextResponse.json({
        success: true,
        message:
          savedMessage || { sender: "customer", body: message, created_at: now },
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
