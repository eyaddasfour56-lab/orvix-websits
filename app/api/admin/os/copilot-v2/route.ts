import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { POST as runCopilot } from "@/app/api/admin/os/copilot/route";

export const dynamic = "force-dynamic";

const STATUS_ALIASES: Array<[RegExp, string]> = [
  [/\b(deliver(?:ed|d)?|dlvrd|delivrd)\b|تم\s*(?:التوصيل|التسليم)|اتسلم|وصل|wsl|etslm/i, "delivered"],
  [/\bout\s*(?:for|4)\s*delivery\b|\bofd\b|خرج\s*للتوصيل|5rg\s*l(?:el)?\s*tws?el/i, "out_for_delivery"],
  [/\b(ship(?:ped|ed)?|shipp?d)\b|اتشحن|تم\s*الشحن|etsh7n|et7n/i, "shipped"],
  [/\b(confirm(?:ed|d)?)\b|تم\s*التأكيد|اكد(?:ه)?|أكد(?:ه)?|2kd|akd/i, "confirmed"],
  [/\b(cancel(?:led|ed)?|canceled)\b|الغي|إلغي|الغاء|إلغاء|el8y/i, "cancelled"],
  [/\bnew\b|جديد|gded/i, "new"],
];

function clean(value: unknown, max = 1200) {
  return String(value ?? "").trim().slice(0, max);
}

function extractPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  const match = compact.match(/(?:\+?20|0020|0)?1[0125]\d{8}/);
  if (!match) return "";
  let digits = match[0].replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = `0${digits.slice(2)}`;
  return digits;
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
  return /\b(set|make|change|update|edit|mark|move|put|turn|3adl|عدل|عدّل|خلي|خليه|5aly|5ale|حول|حوّل|7awel|حط|خليها)\b/i.test(value);
}

function deterministicRewrite(question: string) {
  const status = detectStatus(question);
  if (!status || !looksLikeAction(question)) return "";

  const orderNumber = extractOrderNumber(question);
  const phone = extractPhone(question);
  const target = orderNumber || phone;
  if (!target) return "";

  return `set order ${target} status ${status}`;
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
