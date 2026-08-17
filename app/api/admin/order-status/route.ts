import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

const allowedStatuses = [
  "new",
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

type OrderRow = {
  id: string;
  order_number?: string | null;
  product_slug?: string | null;
  unit_cost_at_sale?: number | string | null;
  status?: string | null;
  inventory_reserved_qty?: number | null;
};

type ProductCostRow = {
  unit_cost?: number | string | null;
};

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "orders")) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || "").trim();
    const status = String(body.status || "")
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("-", "_");

    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ success: false, message: "A valid order ID is required." }, { status: 400 });
    }
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid order status." }, { status: 400 });
    }

    const orders = await supabaseAdminJson<OrderRow[]>(
      `orders?select=id,order_number,product_slug,unit_cost_at_sale,status,inventory_reserved_qty&id=eq.${postgrestValue(orderId)}&limit=1`
    );
    const order = orders?.[0];
    if (!order) {
      return NextResponse.json({ success: false, message: "Order was not found." }, { status: 404 });
    }

    const patch: Record<string, unknown> = { status };

    if (status === "delivered") {
      const frozenCost = Number(order.unit_cost_at_sale);
      if (!(Number.isFinite(frozenCost) && frozenCost > 0) && order.product_slug) {
        const products = await supabaseAdminJson<ProductCostRow[]>(
          `products?select=unit_cost&slug=eq.${postgrestValue(order.product_slug)}&limit=1`
        );
        const currentCost = Number(products?.[0]?.unit_cost || 0);
        if (Number.isFinite(currentCost) && currentCost > 0) {
          patch.unit_cost_at_sale = Math.round(currentCost * 100) / 100;
        }
      }
    }

    const updatedOrders = await supabaseAdminJson<OrderRow[]>(
      `orders?id=eq.${postgrestValue(orderId)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      }
    );

    const updated = updatedOrders?.[0];
    if (!updated) {
      return NextResponse.json({ success: false, message: "Order was not found." }, { status: 404 });
    }

    await auditAdminAction(request, "order_status_changed", "order", orderId, {
      orderNumber: order.order_number,
      from: order.status,
      to: status,
      role: readAdminRole(request),
      inventoryReservedQty: updated.inventory_reserved_qty || 0,
    });

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully.",
      order: updated,
    });
  } catch (error) {
    console.error("Order status API error:", error);
    return NextResponse.json({ success: false, message: "Could not update order status." }, { status: 500 });
  }
}
