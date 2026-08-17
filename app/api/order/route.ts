import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/order-v3/route";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export { POST };

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const orders = await supabaseAdminJson<Array<Record<string, unknown>>>(
      "orders?select=*&order=label_created_at.desc.nullslast,created_at.desc&limit=1000"
    );

    return NextResponse.json(
      { success: true, orders },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load orders." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
