import { NextRequest, NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Order = { id: string; order_number: string; created_at: string };

type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landingPage?: string;
  gclid?: string;
  fbclid?: string;
  tclid?: string;
};

function safe(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function sanitise(raw: unknown): Attribution {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    source: safe(input.source, 120),
    medium: safe(input.medium, 120),
    campaign: safe(input.campaign, 160),
    content: safe(input.content, 160),
    term: safe(input.term, 160),
    referrer: safe(input.referrer, 300),
    landingPage: safe(input.landingPage, 300),
    gclid: safe(input.gclid, 180),
    fbclid: safe(input.fbclid, 180),
    tclid: safe(input.tclid, 180),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const orderNumber = safe(body.orderNumber, 120).toUpperCase();
    if (!orderNumber) return NextResponse.json({ success: false, message: "Order number is required." }, { status: 400 });

    const rows = await supabaseAdminJson<Order[]>(
      `orders?select=id,order_number,created_at&order_number=eq.${postgrestValue(orderNumber)}&limit=1`
    );
    const order = rows?.[0];
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

    const age = Date.now() - new Date(order.created_at).getTime();
    if (!Number.isFinite(age) || age > 60 * 60 * 1000) {
      return NextResponse.json({ success: false, message: "Attribution window has ended." }, { status: 409 });
    }

    const attribution = sanitise(body.attribution);
    const source = attribution.source || (attribution.referrer ? "referral" : "direct");
    const metadata = { ...attribution, source };

    const existing = await supabaseAdminJson<Array<{ id: string }>>(
      `analytics_events?select=id&order_id=eq.${postgrestValue(order.id)}&event_name=eq.order_attribution&limit=1`
    );

    if (existing?.[0]?.id) {
      await supabaseAdminJson(`analytics_events?id=eq.${postgrestValue(existing[0].id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ metadata }),
      });
    } else {
      await supabaseAdminJson("analytics_events", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          event_name: "order_attribution",
          order_id: order.id,
          order_number: order.order_number,
          metadata,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Commerce attribution error:", error);
    return NextResponse.json({ success: false, message: "Could not save attribution." }, { status: 500 });
  }
}
