import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const orders = await supabaseAdminJson<Array<Record<string, unknown>>>(
      "orders?risk_score=gt.0&select=id,order_number,created_at,customer_name,phone,product_name,quantity,total_price,status,risk_score,risk_flags,processing_status&order=risk_score.desc,created_at.desc&limit=200"
    );

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const recent = orders.filter((order) => {
      const created = new Date(String(order.created_at || "")).getTime();
      return Number.isFinite(created) && now - created <= day;
    });

    return NextResponse.json(
      {
        success: true,
        orders,
        metrics: {
          flagged24h: recent.length,
          highRisk24h: recent.filter((order) => Number(order.risk_score || 0) >= 50).length,
          critical24h: recent.filter((order) => Number(order.risk_score || 0) >= 80).length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Risk center API error:", error);
    return NextResponse.json({ success: false, message: "Could not load risk signals." }, { status: 500 });
  }
}
