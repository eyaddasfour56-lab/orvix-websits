import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = Record<string, unknown> & {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  status?: string | null;
  payment_status?: string | null;
  order_type?: string | null;
  created_at?: string | null;
};

function authorised(request: NextRequest) {
  return isAdminAuthenticated(request) && hasAdminPermission(request, "orders");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

  try {
    const url = new URL(request.url);
    const orderId = text(url.searchParams.get("orderId"));

    if (orderId) {
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ success: false, message: "Invalid order ID." }, { status: 400 });
      const rows = await supabaseAdminJson<OrderRow[]>(`orders?id=eq.${postgrestValue(orderId)}&select=*&limit=1`);
      const order = rows[0];
      if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });

      const phone = text(order.phone);
      const [items, timeline, customerHistory] = await Promise.all([
        supabaseAdminJson<Array<Record<string, unknown>>>(`order_items?order_id=eq.${postgrestValue(orderId)}&select=*&order=created_at.asc,id.asc`),
        supabaseAdminJson<Array<Record<string, unknown>>>(`order_events?order_id=eq.${postgrestValue(orderId)}&select=*&order=created_at.asc,id.asc`),
        phone
          ? supabaseAdminJson<OrderRow[]>(`orders?phone=eq.${postgrestValue(phone)}&select=id,order_number,status,payment_status,total_price,item_count,order_type,created_at&order=created_at.desc&limit=20`)
          : Promise.resolve([]),
      ]);

      return NextResponse.json(
        { success: true, order, items, timeline, customerHistory },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const search = text(url.searchParams.get("search")).toLowerCase();
    const status = text(url.searchParams.get("status")).toLowerCase();
    const payment = text(url.searchParams.get("payment")).toLowerCase();

    const orders = await supabaseAdminJson<OrderRow[]>(
      "orders?select=id,order_number,customer_name,phone,governorate,product_name,colour,quantity,item_count,order_type,products_total,delivery_fee,discount_amount,total_price,status,payment_status,shipping_status,bosta_tracking_number,bosta_state_name,internal_notes,risk_score,created_at,updated_at&order=created_at.desc&limit=500"
    );

    const filtered = orders.filter((order) => {
      if (status && status !== "all" && text(order.status).toLowerCase() !== status) return false;
      if (payment && payment !== "all" && text(order.payment_status || "pending").toLowerCase() !== payment) return false;
      if (!search) return true;
      const haystack = [order.order_number, order.customer_name, order.phone, order.governorate, order.product_name, order.bosta_tracking_number]
        .map((value) => text(value).toLowerCase())
        .join(" ");
      return haystack.includes(search);
    });

    return NextResponse.json(
      { success: true, orders: filtered, total: filtered.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Orders V2 GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load orders." }, { status: 500 });
  }
}
