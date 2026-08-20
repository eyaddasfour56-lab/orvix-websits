import { NextRequest, NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const EDIT_WINDOW_MS = 30 * 60 * 1000;

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  notes?: string | null;
  status: string;
  created_at: string;
  bosta_delivery_id?: string | null;
  bosta_tracking_number?: string | null;
};

function normalisePhone(value: string) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) digits = `0${digits.slice(2)}`;
  return digits;
}

function phonesMatch(a: string, b: string) {
  return Boolean(normalisePhone(a)) && normalisePhone(a) === normalisePhone(b);
}

function editableState(order: OrderRow) {
  const created = new Date(order.created_at).getTime();
  const editableUntil = Number.isFinite(created) ? new Date(created + EDIT_WINDOW_MS).toISOString() : null;
  const stillInWindow = Number.isFinite(created) && Date.now() <= created + EDIT_WINDOW_MS;
  const safeStatus = ["new", "confirmed"].includes(String(order.status || "").toLowerCase());
  const alreadyShipped = Boolean(order.bosta_delivery_id || order.bosta_tracking_number);
  return {
    canEdit: stillInWindow && safeStatus && !alreadyShipped,
    editableUntil,
    reason: !stillInWindow
      ? "The 30-minute edit window has ended."
      : !safeStatus || alreadyShipped
        ? "This order has already moved to fulfillment. Contact ORVIX support for changes."
        : "",
  };
}

async function findOrder(orderNumber: string) {
  const rows = await supabaseAdminJson<OrderRow[]>(
    `orders?select=id,order_number,customer_name,phone,address,notes,status,created_at,bosta_delivery_id,bosta_tracking_number&order_number=eq.${postgrestValue(orderNumber)}&limit=1`
  );
  return rows?.[0] || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "lookup").trim().toLowerCase();
    const orderNumber = String(body.orderNumber || "").trim().toUpperCase();
    const verificationPhone = String(body.phone || "").trim();

    if (!orderNumber || !verificationPhone) {
      return NextResponse.json({ success: false, message: "Order number and phone are required." }, { status: 400 });
    }

    const order = await findOrder(orderNumber);
    if (!order) return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    if (!phonesMatch(order.phone, verificationPhone)) {
      return NextResponse.json({ success: false, message: "The phone number does not match this order." }, { status: 403 });
    }

    const edit = editableState(order);
    if (action === "lookup") {
      return NextResponse.json({
        success: true,
        canEdit: edit.canEdit,
        editableUntil: edit.editableUntil,
        reason: edit.reason,
        order: {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          phone: order.phone,
          address: order.address,
          notes: order.notes || "",
          status: order.status,
        },
      });
    }

    if (action !== "update") {
      return NextResponse.json({ success: false, message: "Unsupported action." }, { status: 400 });
    }
    if (!edit.canEdit) {
      return NextResponse.json({ success: false, message: edit.reason || "This order can no longer be edited." }, { status: 409 });
    }

    const customerName = String(body.customerName || "").trim().slice(0, 120);
    const newPhone = String(body.newPhone || order.phone).trim().slice(0, 40);
    const address = String(body.address || "").trim().slice(0, 500);
    const notes = String(body.notes || "").trim().slice(0, 1000);

    if (!customerName || !normalisePhone(newPhone) || !address) {
      return NextResponse.json({ success: false, message: "Name, phone and delivery address are required." }, { status: 400 });
    }

    const changed: string[] = [];
    if (customerName !== order.customer_name) changed.push("name");
    if (normalisePhone(newPhone) !== normalisePhone(order.phone)) changed.push("phone");
    if (address !== order.address) changed.push("address");
    if (notes !== String(order.notes || "")) changed.push("notes");

    const updated = await supabaseAdminJson<OrderRow[]>(
      `orders?id=eq.${postgrestValue(order.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          customer_name: customerName,
          phone: newPhone,
          address,
          notes,
          last_workflow_at: new Date().toISOString(),
        }),
      }
    );

    try {
      await supabaseAdminJson("order_events", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          order_id: order.id,
          event_type: "customer_edit",
          title: "Customer updated order details",
          details: changed.length ? `Updated: ${changed.join(", ")}` : "Customer saved order details.",
          status: order.status,
          metadata: { changed },
          created_by: "customer",
        }),
      });
    } catch (eventError) {
      console.error("Order edit event log error:", eventError);
    }

    try {
      await supabaseAdminJson("admin_notifications", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          kind: "order_edit",
          title: `Order ${order.order_number} was edited`,
          body: changed.length ? `Customer changed ${changed.join(", ")}.` : "Customer saved the order details.",
          target_url: "/admin/orders-v2",
          severity: "info",
          event_key: `customer-edit:${order.id}:${Date.now()}`,
        }),
      });
    } catch (notificationError) {
      console.error("Order edit notification error:", notificationError);
    }

    const row = updated?.[0];
    return NextResponse.json({
      success: true,
      message: "Order details updated successfully.",
      phone: row?.phone || newPhone,
      changed,
    });
  } catch (error) {
    console.error("Customer edit-order API error:", error);
    return NextResponse.json({ success: false, message: "Could not update this order." }, { status: 500 });
  }
}
