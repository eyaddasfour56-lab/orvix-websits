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
  product_slug?: string | null;
  colour?: string | null;
  variant_key?: string | null;
  item_count?: number | null;
  bosta_delivery_id?: string | null;
  bosta_tracking_number?: string | null;
};

type ProductRow = { id: string; slug: string; status: string };
type VariantRow = {
  id: string;
  variant_key: string;
  label: string;
  stock_quantity: number;
  allow_purchase: boolean;
  active: boolean;
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
  const canEdit = stillInWindow && safeStatus && !alreadyShipped;
  return {
    canEdit,
    canEditColour: canEdit && order.status === "new" && Number(order.item_count || 1) <= 1 && Boolean(order.product_slug),
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
    `orders?select=id,order_number,customer_name,phone,address,notes,status,created_at,product_slug,colour,variant_key,item_count,bosta_delivery_id,bosta_tracking_number&order_number=eq.${postgrestValue(orderNumber)}&limit=1`
  );
  return rows?.[0] || null;
}

async function resolveVariant(order: OrderRow, variantKey: string) {
  if (!order.product_slug || !variantKey) return null;
  const products = await supabaseAdminJson<ProductRow[]>(
    `products?select=id,slug,status&slug=eq.${postgrestValue(order.product_slug)}&limit=1`
  );
  const product = products?.[0];
  if (!product) return null;
  const variants = await supabaseAdminJson<VariantRow[]>(
    `product_variants?select=id,variant_key,label,stock_quantity,allow_purchase,active&product_id=eq.${postgrestValue(product.id)}&variant_key=eq.${postgrestValue(variantKey)}&active=eq.true&limit=1`
  );
  const variant = variants?.[0];
  if (!variant || !variant.allow_purchase) return null;
  if (product.status !== "preorder" && Number(variant.stock_quantity || 0) < 1) return null;
  return variant;
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
        canEditColour: edit.canEditColour,
        editableUntil: edit.editableUntil,
        reason: edit.reason,
        order: {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          phone: order.phone,
          address: order.address,
          notes: order.notes || "",
          status: order.status,
          productSlug: order.product_slug || "",
          colour: order.colour || "",
          variantKey: order.variant_key || "",
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
    const requestedVariantKey = String(body.newVariantKey || "").trim().slice(0, 120);

    if (!customerName || !normalisePhone(newPhone) || !address) {
      return NextResponse.json({ success: false, message: "Name, phone and delivery address are required." }, { status: 400 });
    }

    let nextColour = order.colour || "";
    let nextVariantKey = order.variant_key || "";
    const variantChanged = Boolean(requestedVariantKey) && requestedVariantKey !== String(order.variant_key || "");

    if (variantChanged) {
      if (!edit.canEditColour) {
        return NextResponse.json({ success: false, message: "Colour can only be changed before the order is confirmed and before fulfillment starts." }, { status: 409 });
      }
      const variant = await resolveVariant(order, requestedVariantKey);
      if (!variant) {
        return NextResponse.json({ success: false, message: "That colour is not currently available for this order." }, { status: 409 });
      }
      nextVariantKey = variant.variant_key;
      nextColour = variant.label;
    }

    const changed: string[] = [];
    if (customerName !== order.customer_name) changed.push("name");
    if (normalisePhone(newPhone) !== normalisePhone(order.phone)) changed.push("phone");
    if (address !== order.address) changed.push("address");
    if (notes !== String(order.notes || "")) changed.push("notes");
    if (variantChanged) changed.push("colour");

    if (variantChanged) {
      await supabaseAdminJson(`order_items?order_id=eq.${postgrestValue(order.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ variant_key: nextVariantKey, variant_label: nextColour, colour: nextColour }),
      });
    }

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
          ...(variantChanged ? { colour: nextColour, variant_key: nextVariantKey } : {}),
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
          metadata: { changed, colour: variantChanged ? nextColour : undefined },
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
      colour: nextColour,
      variantKey: nextVariantKey,
      changed,
    });
  } catch (error) {
    console.error("Customer edit-order API error:", error);
    return NextResponse.json({ success: false, message: "Could not update this order." }, { status: 500 });
  }
}
