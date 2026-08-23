import { NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type WishlistRow = {
  product_id: string;
  created_at?: string;
  products?: {
    id?: string;
    name?: string;
    slug?: string;
    image?: string;
    price?: number;
    status?: string;
    stock_quantity?: number;
    allow_purchase?: boolean;
  } | null;
};

function validIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((value) => String(value || "").trim()).filter((value) => /^[0-9a-f-]{36}$/i.test(value)))).slice(0, 100);
}

export async function GET(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const rows = await supabaseAdminJson<WishlistRow[]>(
      `customer_wishlist?customer_user_id=eq.${postgrestValue(user.id)}&select=product_id,created_at,products(id,name,slug,image,price,status,stock_quantity,allow_purchase)&order=created_at.desc`
    );
    return NextResponse.json({ success: true, items: rows.map((row) => ({ productId: row.product_id, createdAt: row.created_at, ...(row.products || {}) })) });
  } catch (error) {
    console.error("Account wishlist GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load your wishlist." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as { productIds?: unknown };
    const productIds = validIds(body.productIds);
    if (productIds.length) {
      await supabaseAdminJson("customer_wishlist?on_conflict=customer_user_id,product_id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(productIds.map((productId) => ({ customer_user_id: user.id, product_id: productId }))),
      });
    }
    return NextResponse.json({ success: true, synced: productIds.length });
  } catch (error) {
    console.error("Account wishlist PUT error:", error);
    return NextResponse.json({ success: false, message: "Could not sync your wishlist." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as { productId?: unknown };
    const productId = String(body.productId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return NextResponse.json({ success: false, message: "A valid product is required." }, { status: 400 });
    await supabaseAdminJson(
      `customer_wishlist?customer_user_id=eq.${postgrestValue(user.id)}&product_id=eq.${postgrestValue(productId)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account wishlist DELETE error:", error);
    return NextResponse.json({ success: false, message: "Could not remove this product." }, { status: 500 });
  }
}
