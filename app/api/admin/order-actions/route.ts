import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const actionToStatus: Record<string, string> = {
  confirm: "confirmed",
  ship: "shipped",
  out_for_delivery: "out_for_delivery",
  deliver: "delivered",
  cancel: "cancelled",
};

const allowedDirectStatuses = new Set([
  "new",
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

const allowedJourneyStatuses = new Set([
  "new",
  "international_transit",
  "arrived_egypt",
  "in_customs",
  "customs_cleared",
  "received_at_orvix",
  "ready_for_courier",
]);

const actionToSupplierStatus: Record<string, string> = {
  supplier_preorder: "preordered",
  supplier_confirm: "supplier_confirmed",
  supplier_prepare: "supplier_preparing",
  supplier_ship_to_orvix: "supplier_shipped",
  receive_at_orvix: "received_at_orvix",
  ready_for_courier: "ready_for_courier",
};

type OrderRow = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  journey_status?: string | null;
  payment_status?: string | null;
  total_price?: number | string | null;
  internal_notes?: string | null;
  supplier_name?: string | null;
  supplier_status?: string | null;
  order_type?: string | null;
  bosta_tracking_number?: string | null;
};

function authorised(request: NextRequest) {
  return isAdminAuthenticated(request) && hasAdminPermission(request, "orders");
}

function idsFromBody(body: Record<string, unknown>) {
  const values = Array.isArray(body.orderIds) ? body.orderIds : body.orderId ? [body.orderId] : [];
  return Array.from(new Set(values.map((value) => String(value || "").trim())))
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .slice(0, 50);
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "").trim().toLowerCase();
    const orderIds = idsFromBody(body);
    const note = String(body.note || "").trim().slice(0, 4000);
    const supplierName = String(body.supplierName || "").trim().slice(0, 120);
    const requestedStatus = String(body.status || "").trim().toLowerCase();
    const requestedJourneyStatus = String(body.journeyStatus || body.status || "").trim().toLowerCase();

    const allowedActions = [
      ...Object.keys(actionToStatus),
      ...Object.keys(actionToSupplierStatus),
      "set_status",
      "set_journey_status",
      "mark_paid",
      "mark_pending",
      "mark_refunded",
      "set_note",
      "set_supplier",
    ];

    if (!orderIds.length) {
      return NextResponse.json({ success: false, message: "Select at least one valid order." }, { status: 400 });
    }
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ success: false, message: "Unsupported order action." }, { status: 400 });
    }
    if (action === "set_status" && !allowedDirectStatuses.has(requestedStatus)) {
      return NextResponse.json({ success: false, message: "Choose a valid order state." }, { status: 400 });
    }
    if (action === "set_journey_status" && !allowedJourneyStatuses.has(requestedJourneyStatus)) {
      return NextResponse.json({ success: false, message: "Choose a valid journey stage." }, { status: 400 });
    }
    if (action === "set_note" && !note) {
      return NextResponse.json({ success: false, message: "Enter an internal note first." }, { status: 400 });
    }
    if (action === "set_supplier" && !supplierName) {
      return NextResponse.json({ success: false, message: "Enter a supplier name first." }, { status: 400 });
    }

    const updated: OrderRow[] = [];
    const failures: Array<{ id: string; message: string }> = [];

    for (const orderId of orderIds) {
      try {
        const existingRows = await supabaseAdminJson<OrderRow[]>(
          `orders?id=eq.${postgrestValue(orderId)}&select=id,order_number,status,journey_status,payment_status,total_price,internal_notes,supplier_name,supplier_status,order_type,bosta_tracking_number&limit=1`
        );
        const existing = existingRows[0];
        if (!existing) throw new Error("Order not found.");

        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (action === "set_journey_status") {
          if (existing.bosta_tracking_number) {
            throw new Error("Courier tracking is live. Journey stages are now updated automatically by Bosta.");
          }
          if (existing.status === "cancelled") {
            throw new Error("This order is cancelled. Its last journey stage is preserved and cannot be overwritten.");
          }
          if (existing.status === "delivered") {
            throw new Error("Delivered orders cannot be moved back into the import journey.");
          }
          patch.journey_status = requestedJourneyStatus;
          patch.order_type = "preorder";
          if (requestedJourneyStatus === "received_at_orvix") patch.supplier_status = "received_at_orvix";
          if (requestedJourneyStatus === "ready_for_courier") patch.supplier_status = "ready_for_courier";
        } else if (action === "set_status") {
          patch.status = requestedStatus;
        } else if (actionToStatus[action]) {
          patch.status = actionToStatus[action];
        } else if (actionToSupplierStatus[action]) {
          patch.order_type = "preorder";
          patch.supplier_status = actionToSupplierStatus[action];
          if (action === "receive_at_orvix") patch.journey_status = "received_at_orvix";
          if (action === "ready_for_courier") patch.journey_status = "ready_for_courier";
        } else if (action === "set_supplier") {
          patch.supplier_name = supplierName;
          patch.order_type = "preorder";
        } else if (action === "mark_paid") {
          patch.payment_status = "paid";
          patch.payment_updated_at = new Date().toISOString();
        } else if (action === "mark_pending") {
          patch.payment_status = "pending";
          patch.payment_updated_at = new Date().toISOString();
        } else if (action === "mark_refunded") {
          patch.payment_status = "refunded";
          patch.payment_updated_at = new Date().toISOString();
          patch.refunded_amount = Math.max(0, Number(existing.total_price || 0));
        } else if (action === "set_note") {
          patch.internal_notes = note;
        }

        const rows = await supabaseAdminJson<OrderRow[]>(`orders?id=eq.${postgrestValue(orderId)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(patch),
        });
        if (!rows[0]) throw new Error("Order could not be updated.");
        updated.push(rows[0]);

        await auditAdminAction(request, `order_${action}`, "order", orderId, {
          orderNumber: existing.order_number,
          fromStatus: existing.status,
          toStatus: action === "set_status" ? requestedStatus : actionToStatus[action],
          fromJourneyStatus: existing.journey_status,
          toJourneyStatus: action === "set_journey_status" ? requestedJourneyStatus : undefined,
          fromPaymentStatus: existing.payment_status,
          fromSupplierStatus: existing.supplier_status,
          supplierName: action === "set_supplier" ? supplierName : existing.supplier_name,
          note: action === "set_note" ? note : undefined,
          role: readAdminRole(request),
        });
      } catch (error) {
        failures.push({ id: orderId, message: error instanceof Error ? error.message : "Update failed." });
      }
    }

    return NextResponse.json(
      {
        success: updated.length > 0 && failures.length === 0,
        partial: updated.length > 0 && failures.length > 0,
        updated,
        failures,
        message: failures.length
          ? `${updated.length} updated, ${failures.length} failed.`
          : `${updated.length} order${updated.length === 1 ? "" : "s"} updated.`,
      },
      { status: updated.length ? 200 : 400 }
    );
  } catch (error) {
    console.error("Order actions API error:", error);
    return NextResponse.json({ success: false, message: "Could not update order(s)." }, { status: 500 });
  }
}
