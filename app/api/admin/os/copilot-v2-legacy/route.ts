import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { POST as runCopilot } from "@/app/api/admin/os/copilot/route";
import { PATCH as patchOrderStatus } from "@/app/api/admin/order-status/route";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const STATUS_ALIASES: Array<[RegExp, string]> = [
  [/\b(deliver(?:ed|d)?|dlvrd|delivrd|delivered)\b|تم\s*(?:التوصيل|التسليم)|اتسلم|وصل|wsl|etslm/i, "delivered"],
  [/\bout\s*(?:for|4)\s*delivery\b|\bofd\b|خرج\s*للتوصيل|5rg\s*l(?:el)?\s*tws?el/i, "out_for_delivery"],
  [/\b(ship(?:ped|ed)?|shipp?d)\b|اتشحن|تم\s*الشحن|etsh7n|et7n/i, "shipped"],
  [/\b(confirm(?:ed|d)?)\b|تم\s*التأكيد|اكد(?:ه)?|أكد(?:ه)?|2kd|akd/i, "confirmed"],
  [/\b(cancel(?:led|ed)?|canceled)\b|الغي|إلغي|الغاء|إلغاء|el8y/i, "cancelled"],
  [/\bnew\b|جديد|gded/i, "new"],
];

type OrderMatch = {
  id: string;
  order_number: string;
  customer_name?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type DirectOrderCommand = {
  target: string;
  status: string;
};

function clean(value: unknown, max = 1200) {
  return String(value ?? "").trim().slice(0, max);
}

function toLatinDigits(value: string) {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const eastern = "۰۱۲۳۴۵۶۷۸۹";
  return value
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(eastern.indexOf(digit)));
}

function normalisePhone(value: string) {
  let digits = toLatinDigits(String(value || "")).replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20") && digits.length >= 12) digits = `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

function extractPhone(value: string) {
  const compact = toLatinDigits(value).replace(/[\s()-]/g, "");
  const match = compact.match(/(?:\+?20|0020|0)?1[0125]\d{8}/);
  return match ? normalisePhone(match[0]) : "";
}

function extractOrderNumber(value: string) {
  const match = value.match(/\b(?:ORVIX|ORX)[\s-]*[A-Z0-9-]{3,}\b/i);
  return match ? match[0].replace(/\s+/g, "-").toUpperCase() : "";
}

function detectStatus(value: string) {
  for (const [pattern, status] of STATUS_ALIASES) {
    if (pattern.test(value)) return status;
  }
  return "";
}

function looksLikeAction(value: string) {
  return /\b(set|make|change|update|edit|mark|move|put|turn|3adl|3del|عدل|عدّل|خلي|خليه|خليها|5aly|5ale|5aleh|حول|حوّل|7awel|حط)\b/i.test(value);
}

function parseDirectOrderCommand(question: string): DirectOrderCommand | null {
  const status = detectStatus(question);
  if (!status) return null;

  const orderNumber = extractOrderNumber(question);
  const phone = extractPhone(question);
  const target = orderNumber || phone;
  if (!target) return null;

  const explicitlyCommanding = looksLikeAction(question) || /\bto\s+(?:deliver|delivered|deliverd|ship|shipped|confirm|confirmed|cancel|cancelled)\b/i.test(question);
  if (!explicitlyCommanding) return null;

  return { target, status };
}

function deterministicRewrite(question: string) {
  const command = parseDirectOrderCommand(question);
  return command ? `set order ${command.target} status ${command.status}` : "";
}

async function findOrder(target: string) {
  const orderNumber = extractOrderNumber(target);
  if (orderNumber) {
    const rows = await supabaseAdminJson<OrderMatch[]>(
      `orders?select=id,order_number,customer_name,phone,status,created_at&order_number=eq.${postgrestValue(orderNumber)}&order=created_at.desc&limit=5`
    );
    return rows?.[0] || null;
  }

  const phone = normalisePhone(target);
  if (!phone) return null;

  const rows = await supabaseAdminJson<OrderMatch[]>(
    "orders?select=id,order_number,customer_name,phone,status,created_at&order=created_at.desc&limit=1000"
  );

  return rows.find((row) => normalisePhone(String(row.phone || "")) === phone) || null;
}

async function executeDirectOrderStatus(request: NextRequest, command: DirectOrderCommand) {
  const order = await findOrder(command.target);
  if (!order) {
    return NextResponse.json(
      {
        success: false,
        message: `I could not find an order with ${command.target}.`,
        understoodAs: `set order ${command.target} status ${command.status}`,
      },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const previousStatus = String(order.status || "new");
  if (previousStatus === command.status) {
    return NextResponse.json(
      {
        success: true,
        ai: false,
        answer: `Order ${order.order_number} is already ${command.status.replaceAll("_", " ")}.`,
        understoodAs: `set order ${command.target} status ${command.status}`,
        action: {
          type: "admin_action",
          target: "order_status",
          section: "order status",
          href: "/admin/orders-v2",
          changed: false,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");

  const forwarded = new NextRequest(new URL("/api/admin/order-status", request.url), {
    method: "PATCH",
    headers,
    body: JSON.stringify({ orderId: order.id, status: command.status }),
  });

  const response = await patchOrderStatus(forwarded);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || payload.success === false) {
    return NextResponse.json(
      {
        success: false,
        message: clean(payload.message, 500) || "Could not update order status.",
        understoodAs: `set order ${command.target} status ${command.status}`,
      },
      { status: response.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      ai: false,
      answer: `Done. Order ${order.order_number} changed from ${previousStatus.replaceAll("_", " ")} to ${command.status.replaceAll("_", " ")}.`,
      understoodAs: `set order ${command.target} status ${command.status}`,
      action: {
        type: "admin_action",
        target: "order_status",
        section: "order status",
        href: "/admin/orders-v2",
        changed: true,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function semanticRewrite(question: string) {
  try {
    const { text } = await generateText({
      model: "openai/gpt-5.6-luna",
      prompt: `You normalize messages for ORVIX Admin Copilot. The owner writes Egyptian Arabic, Franco-Arabic, English, mixed slang, shorthand and typos. Rewrite the message into short, clear English while preserving the exact intent and all identifiers. Never invent a name, phone, order number, amount, product, status or action. If it is a question, keep it a question. If it is an action, make the action explicit. For order commands, choose the strongest identifier in this order: order number, phone number, then customer name. Normalize order statuses only to new, confirmed, shipped, out_for_delivery, delivered, cancelled. Examples:\n- "3adl order rakm 01000000000 to deliverd" -> "set order 01000000000 status delivered"\n- "5aly ORVIX-123 etsh7n" -> "set order ORVIX-123 status shipped"\n- "kam profit elnharda" -> "how much profit today?"\nReturn ONLY the rewritten message.\n\nMESSAGE:\n${question}`,
    });
    return clean(text, 1200) || question;
  } catch {
    return question;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const question = clean(body.question);
    if (!question) {
      return NextResponse.json({ success: false, message: "Write a message first." }, { status: 400 });
    }

    const directOrderCommand = parseDirectOrderCommand(question);
    if (directOrderCommand) {
      return executeDirectOrderStatus(request, directOrderCommand);
    }

    const rewritten = deterministicRewrite(question) || (await semanticRewrite(question));
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");

    const forwarded = new NextRequest(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ question: rewritten }),
    });

    const response = await runCopilot(forwarded);
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    return NextResponse.json(
      {
        ...payload,
        understoodAs: rewritten !== question ? rewritten : null,
      },
      { status: response.status, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ORVIX Copilot V2 error:", error);
    return NextResponse.json({ success: false, message: "ORVIX AI could not understand that right now." }, { status: 500 });
  }
}
