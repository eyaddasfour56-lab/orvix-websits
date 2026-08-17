import { NextRequest, NextResponse } from "next/server";
import { auditAdminAction } from "@/lib/admin-audit";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type InventoryRow = {
  id: string;
  product_slug: string;
  product_name: string;
  stock_quantity: number;
  low_stock_limit: number;
  is_available: boolean;
  updated_at: string;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  if (!hasAdminPermission(request, "inventory")) {
    return NextResponse.json({ success: false, message: "Your role cannot edit inventory." }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid inventory item." }, { status: 400 });
    }

    const currentRows = await supabaseAdminJson<InventoryRow[]>(
      `product_inventory?select=id,product_slug,product_name,stock_quantity,low_stock_limit,is_available,updated_at&id=eq.${postgrestValue(id)}&limit=1`
    );
    const current = currentRows[0];
    if (!current) {
      return NextResponse.json({ success: false, message: "Inventory item was not found." }, { status: 404 });
    }

    const body = await request.json();
    const stockQuantity = Number(body.stockQuantity);
    const lowStockLimit = Number(body.lowStockLimit ?? current.low_stock_limit);
    const isAvailable = body.isAvailable === undefined ? current.is_available : Boolean(body.isAvailable);

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return NextResponse.json({ success: false, message: "Stock quantity must be a whole number of zero or more." }, { status: 400 });
    }
    if (!Number.isInteger(lowStockLimit) || lowStockLimit < 0) {
      return NextResponse.json({ success: false, message: "Low stock limit must be a whole number of zero or more." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updated = await supabaseAdminJson<InventoryRow[]>(
      `product_inventory?id=eq.${postgrestValue(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          stock_quantity: stockQuantity,
          low_stock_limit: lowStockLimit,
          is_available: isAvailable,
          updated_at: now,
        }),
      }
    );

    await supabaseAdminJson(
      `products?slug=eq.${postgrestValue(current.product_slug)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ stock_quantity: stockQuantity, updated_at: now }),
      }
    );

    await auditAdminAction(request, "inventory_stock_changed", "inventory", id, {
      product: current.product_name,
      productSlug: current.product_slug,
      previousStock: Number(current.stock_quantity || 0),
      newStock: stockQuantity,
      difference: stockQuantity - Number(current.stock_quantity || 0),
      lowStockLimit,
      isAvailable,
    });

    return NextResponse.json({
      success: true,
      message: `${current.product_name} stock updated to ${stockQuantity}.`,
      inventory: updated[0],
    });
  } catch (error) {
    console.error("Admin inventory update API error:", error);
    return NextResponse.json({ success: false, message: "Could not update inventory." }, { status: 500 });
  }
}
