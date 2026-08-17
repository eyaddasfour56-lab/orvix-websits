import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const [abandoned, recentSessions] = await Promise.all([
      supabaseAdminJson<Array<Record<string, unknown>>>(
        "abandoned_checkouts?select=session_key,visitor_id,analytics_session_id,product_slug,variant_key,stage,metadata,created_at,last_seen_at,inactive_seconds&order=last_seen_at.desc&limit=200"
      ),
      supabaseAdminJson<Array<Record<string, unknown>>>(
        "checkout_sessions?select=session_key,product_slug,variant_key,stage,created_at,last_seen_at,completed_at&order=created_at.desc&limit=500"
      ),
    ]);

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const last24h = recentSessions.filter((session) => {
      const created = new Date(String(session.created_at || "")).getTime();
      return Number.isFinite(created) && now - created <= day;
    });
    const completed24h = last24h.filter((session) => session.stage === "completed").length;
    const abandoned24h = last24h.filter((session) => {
      if (session.stage === "completed") return false;
      const seen = new Date(String(session.last_seen_at || "")).getTime();
      return Number.isFinite(seen) && now - seen >= 15 * 60 * 1000;
    }).length;

    return NextResponse.json(
      {
        success: true,
        abandoned,
        metrics: {
          checkoutSessions24h: last24h.length,
          completed24h,
          abandoned24h,
          conversion24h: last24h.length
            ? Math.round((completed24h / last24h.length) * 1000) / 10
            : 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Checkout recovery API error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load checkout recovery data." },
      { status: 500 }
    );
  }
}
