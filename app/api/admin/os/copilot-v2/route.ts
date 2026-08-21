import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { POST as runCopilotEngine } from "@/app/api/admin/os/copilot-v2-legacy/route";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 1800) {
  return String(value ?? "").trim().slice(0, max);
}

async function understandMessage(question: string) {
  try {
    const { text } = await generateText({
      model: "openai/gpt-5.6-sol",
      prompt: `Rewrite the following ORVIX admin message into clear, precise English without answering it. The message may be Egyptian Arabic, Franco-Arabic, English, mixed slang, shorthand, voice typing, or contain spelling mistakes. Preserve every exact identifier, number, phone number, order number, product name, discount code, amount, date, status, and the owner's intent. Do not add facts or guess missing information. Keep questions as questions and requested changes as requested changes. Preserve multiple requested steps in their original order. Return only the rewritten message.\n\nMESSAGE:\n${question}`,
    });

    return clean(text) || question;
  } catch (error) {
    console.error("ORVIX AI understanding layer error:", error);
    return question;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const question = clean(body.question, 1200);

    if (!question) {
      return NextResponse.json(
        { success: false, message: "Write a message first." },
        { status: 400 }
      );
    }

    const understood = await understandMessage(question);
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");

    const forwarded = new NextRequest(
      new URL("/api/admin/os/copilot-v2-legacy", request.url),
      {
        method: "POST",
        headers,
        body: JSON.stringify({ question: understood }),
      }
    );

    const response = await runCopilotEngine(forwarded);
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    return NextResponse.json(
      {
        ...payload,
        understoodAs:
          payload.understoodAs ||
          (understood !== question ? understood : null),
      },
      {
        status: response.status,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("ORVIX AI V3 error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "ORVIX AI could not understand that right now.",
      },
      { status: 500 }
    );
  }
}
