import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

const statuses = new Set(["available", "preorder", "coming_soon", "out_of_stock", "hidden"]);

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  allow_purchase: boolean;
  stock_quantity: number;
  preorder_min_days: number;
  preorder_max_days: number;
  updated_at: string;
};

function authorised(request: NextRequest) {
  return isAdminAuthenticated(request) && hasAdminPermission(request, "inventory");
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const products = await supabaseAdminJson<ProductRow[]>(
      "products?select=id,name,slug,status,allow_purchase,stock_quantity,preorder_min_days,preorder_max_days,updated_at&order=display_order.asc,created_at.asc"
    );
    return NextResponse.json({ success: true, products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Preorders GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load preorder settings." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productId = String(body.productId || "").trim();
    const status = String(body.status || "").trim().toLowerCase();
    const minDays = Math.round(Number(body.preorderMinDays || 25));
    const maxDays = Math.round(Number(body.preorderMaxDays || 45));
    const allowPurchase = Boolean(body.allowPurchase);

    if (!/^[0-9a-f-]{36}$/i.test(productId)) return NextResponse.json({ success: false, message: "A valid product ID is required." }, { status: 400 });
    if (!statuses.has(status)) return NextResponse.json({ success: false, message: "Invalid product status." }, { status: 400 });
    if (!Number.isInteger(minDays) || !Number.isInteger(maxDays) || minDays < 1 || maxDays < minDays || maxDays > 180) {
      return NextResponse.json({ success: false, message: "Pre-order delivery window must be between 1 and 180 days." }, { status: 400 });
    }

    const rows = await supabaseAdminJson<ProductRow[]>(`products?id=eq.${postgrestValue(productId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status,
        allow_purchase: allowPurchase,
        preorder_min_days: minDays,
        preorder_max_days: maxDays,
        updated_at: new Date().toISOString(),
      }),
    });
    const product = rows[0];
    if (!product) return NextResponse.json({ success: false, message: "Product was not found." }, { status: 404 });

    await auditAdminAction(request, "preorder_settings_changed", "product", productId, {
      slug: product.slug,
      status,
      allowPurchase,
      preorderMinDays: minDays,
      preorderMaxDays: maxDays,
      role: readAdminRole(request),
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Preorders PATCH error:", error);
    return NextResponse.json({ success: false, message: "Could not update preorder settings." }, { status: 500 });
  }
}
