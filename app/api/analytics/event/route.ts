import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedEvents = new Set([
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "cart_view",
  "checkout_started",
  "checkout_step",
  "discount_applied",
  "checkout_error",
  "order_completed",
]);

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
  return Object.fromEntries(
    entries.map(([key, item]) => {
      if (typeof item === "string") return [key.slice(0, 80), item.slice(0, 500)];
      if (typeof item === "number" || typeof item === "boolean" || item === null) return [key.slice(0, 80), item];
      if (Array.isArray(item)) return [key.slice(0, 80), item.slice(0, 20).map((entry) => String(entry).slice(0, 120))];
      return [key.slice(0, 80), String(item).slice(0, 500)];
    })
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventName = clean(body.eventName, 80).toLowerCase();

    if (!allowedEvents.has(eventName)) {
      return NextResponse.json(
        { success: false, message: "Unsupported analytics event." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    await supabaseAdminJson("analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_name: eventName,
        visitor_id: clean(body.visitorId, 120) || null,
        session_id: clean(body.sessionId, 120) || null,
        path: clean(body.path, 240) || null,
        product_slug: clean(body.productSlug, 160) || null,
        order_number: clean(body.orderNumber, 120) || null,
        metadata: safeMetadata(body.metadata),
      }),
    });

    return NextResponse.json(
      { success: true },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Analytics event error:", error);
    return NextResponse.json(
      { success: false },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
