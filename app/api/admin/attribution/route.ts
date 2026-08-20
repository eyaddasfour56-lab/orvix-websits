import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type EventRow = {
  order_id?: string | null;
  order_number?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};
type OrderRow = { id: string; order_number: string; total_price?: number | string | null; status?: string | null };

type Bucket = { label: string; orders: number; value: number };

function label(value: unknown, fallback: string) {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const days = Math.max(7, Math.min(180, Number(new URL(request.url).searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [events, orders] = await Promise.all([
      supabaseAdminJson<EventRow[]>(
        `analytics_events?select=order_id,order_number,metadata,created_at&event_name=eq.order_attribution&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=2000`
      ),
      supabaseAdminJson<OrderRow[]>(
        `orders?select=id,order_number,total_price,status&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=3000`
      ),
    ]);

    const orderMap = new Map(orders.map((order) => [order.id, order]));
    const sourceMap = new Map<string, Bucket>();
    const campaignMap = new Map<string, Bucket>();
    let attributedValue = 0;

    for (const event of events) {
      const order = event.order_id ? orderMap.get(event.order_id) : undefined;
      const value = order && order.status !== "cancelled" ? Math.max(0, Number(order.total_price || 0)) : 0;
      attributedValue += value;
      const source = label(event.metadata?.source, event.metadata?.referrer ? "referral" : "direct");
      const campaign = label(event.metadata?.campaign, "No campaign");

      const sourceBucket = sourceMap.get(source) || { label: source, orders: 0, value: 0 };
      sourceBucket.orders += 1;
      sourceBucket.value += value;
      sourceMap.set(source, sourceBucket);

      const campaignBucket = campaignMap.get(campaign) || { label: campaign, orders: 0, value: 0 };
      campaignBucket.orders += 1;
      campaignBucket.value += value;
      campaignMap.set(campaign, campaignBucket);
    }

    const rank = (map: Map<string, Bucket>) => Array.from(map.values()).sort((a, b) => b.orders - a.orders || b.value - a.value).slice(0, 15);

    return NextResponse.json({
      success: true,
      days,
      metrics: {
        attributedOrders: events.length,
        attributedValue: Math.round(attributedValue),
        trackedSources: sourceMap.size,
        trackedCampaigns: Array.from(campaignMap.keys()).filter((key) => key !== "No campaign").length,
      },
      sources: rank(sourceMap),
      campaigns: rank(campaignMap),
      recent: events.slice(0, 30).map((event) => ({
        orderNumber: event.order_number || (event.order_id ? orderMap.get(event.order_id)?.order_number : null) || "Order",
        source: label(event.metadata?.source, event.metadata?.referrer ? "referral" : "direct"),
        campaign: label(event.metadata?.campaign, "No campaign"),
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    console.error("Admin attribution API error:", error);
    return NextResponse.json({ success: false, message: "Could not load attribution analytics." }, { status: 500 });
  }
}
