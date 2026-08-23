import { NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = { id: string; order_number: string; status?: string | null; return_status?: string | null };

export async function GET(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const requests = await supabaseAdminJson(
      `order_returns?customer_user_id=eq.${postgrestValue(user.id)}&select=id,order_id,order_number,return_type,reason,status,created_at,resolved_at&order=created_at.desc`
    );
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Account returns GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load return requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as { orderId?: unknown; reason?: unknown };
    const orderId = String(body.orderId || "").trim();
    const reason = String(body.reason || "").trim().replace(/\s+/g, " ").slice(0, 1000);
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || reason.length < 5) {
      return NextResponse.json({ success: false, message: "Choose a delivered order and explain the request." }, { status: 400 });
    }
    const orders = await supabaseAdminJson<OrderRow[]>(
      `orders?id=eq.${postgrestValue(orderId)}&customer_user_id=eq.${postgrestValue(user.id)}&select=id,order_number,status,return_status&limit=1`
    );
    const order = orders[0];
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    if (order.status !== "delivered") return NextResponse.json({ success: false, message: "A return can be requested after delivery." }, { status: 409 });

    const existing = await supabaseAdminJson<Array<{ id: string }>>(
      `order_returns?customer_user_id=eq.${postgrestValue(user.id)}&order_id=eq.${postgrestValue(orderId)}&status=eq.requested&select=id&limit=1`
    );
    if (existing.length) return NextResponse.json({ success: false, message: "A return request is already open for this order." }, { status: 409 });

    const rows = await supabaseAdminJson<Array<Record<string, unknown>>>("order_returns", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        return_type: "return_refund",
        reason,
        refund_amount: 0,
        restock: true,
        status: "requested",
        created_by: "customer-account",
        customer_user_id: user.id,
      }),
    });
    await supabaseAdminJson(`orders?id=eq.${postgrestValue(order.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ return_status: "requested", updated_at: new Date().toISOString() }),
    });
    await supabaseAdminJson("admin_notifications?on_conflict=event_key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        kind: "order",
        title: "Customer return request",
        body: `${order.order_number} · ${reason.slice(0, 140)}`,
        target_url: "/admin/command-center/advanced#returns",
        event_key: `customer-return:${order.id}`,
        severity: "warning",
        read_at: null,
      }),
    });
    return NextResponse.json({ success: true, request: rows[0] || null, message: "Return request sent to Customer Service." }, { status: 201 });
  } catch (error) {
    console.error("Account returns POST error:", error);
    return NextResponse.json({ success: false, message: "Could not create the return request." }, { status: 500 });
  }
}
