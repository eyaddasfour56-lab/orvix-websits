import { NextRequest, NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/admin-push";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const cancellableStatuses = new Set(["new", "confirmed", "pending"]);

function reply(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function normalizePhone(phone: string) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) return `0${digits.slice(2)}`;
  if (digits.startsWith("1")) return `0${digits}`;
  return digits;
}

function clean(value: unknown, max = 240) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseSecretKey) {
    return reply({ success: false, code: "CONFIGURATION_ERROR", message: "Cancellation is temporarily unavailable." }, 500);
  }

  try {
    const body = await request.json();
    const orderNumber = clean(body?.orderNumber, 80).toUpperCase();
    const phone = normalizePhone(clean(body?.phone, 30));
    const reason = clean(body?.reason, 300);

    if (!orderNumber || !phone || !reason) {
      return reply({ success: false, code: "MISSING_DETAILS", message: "Order number, phone number and cancellation reason are required." }, 400);
    }

    const headers = {
      apikey: supabaseSecretKey,
      Authorization: `Bearer ${supabaseSecretKey}`,
      "Content-Type": "application/json",
    };

    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}&select=id,order_number,customer_name,phone,status,bosta_delivery_id,bosta_tracking_number,bosta_submitted_at,cancelled_at&limit=1`,
      { headers, cache: "no-store" }
    );

    if (!lookup.ok) {
      console.error("Cancel order lookup failed:", await lookup.text());
      return reply({ success: false, code: "LOOKUP_FAILED", message: "Could not check this order right now." }, 500);
    }

    const rows = await lookup.json();
    const order = Array.isArray(rows) ? rows[0] : null;

    if (!order || normalizePhone(order.phone) !== phone) {
      return reply({ success: false, code: "ORDER_NOT_FOUND", message: "No order was found with these details." }, 404);
    }

    const status = String(order.status || "").trim().toLowerCase();
    if (status === "cancelled" || order.cancelled_at) {
      return reply({ success: true, alreadyCancelled: true, message: "This order is already cancelled." });
    }

    if (!cancellableStatuses.has(status)) {
      return reply({ success: false, code: "TOO_LATE_TO_CANCEL", message: "This order can no longer be cancelled online. Please contact Customer Service." }, 409);
    }

    const handedToCourier = Boolean(order.bosta_delivery_id || order.bosta_tracking_number || order.bosta_submitted_at);
    if (handedToCourier) {
      return reply({ success: false, code: "COURIER_CREATED", message: "This order has already entered the shipping process. Please contact Customer Service." }, 409);
    }

    const cancelledAt = new Date().toISOString();
    const update = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(String(order.id))}&status=in.(new,confirmed,pending)`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({
          status: "cancelled",
          cancellation_reason: reason,
          cancelled_at: cancelledAt,
          cancelled_by: "customer",
          updated_at: cancelledAt,
        }),
        cache: "no-store",
      }
    );

    if (!update.ok) {
      console.error("Cancel order update failed:", await update.text());
      return reply({ success: false, code: "CANCEL_FAILED", message: "Could not cancel this order right now." }, 500);
    }

    const updatedRows = await update.json();
    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      return reply({ success: false, code: "ORDER_CHANGED", message: "The order status changed before cancellation. Please refresh and try again or contact Customer Service." }, 409);
    }

    void notifyAdmin({
      kind: "order",
      title: "Order cancelled",
      body: `${clean(order.customer_name, 70) || "Customer"} · ${order.order_number} · ${reason}`,
      targetUrl: `/admin?order=${encodeURIComponent(String(order.order_number))}`,
      eventKey: `customer-cancel:${order.id}:${cancelledAt}`,
    }).catch((error) => console.error("Cancel order admin notification failed:", error));

    return reply({
      success: true,
      orderNumber: order.order_number,
      status: "cancelled",
      cancelledAt,
      message: "Your order has been cancelled successfully.",
    });
  } catch (error) {
    console.error("Cancel order API error:", error);
    return reply({ success: false, code: "UNKNOWN_ERROR", message: "Could not cancel this order right now." }, 500);
  }
}
