import { NextResponse } from "next/server";
import { loadSiteSettings } from "@/lib/site-settings-server";

type ProductRow = {
  name?: unknown;
  slug?: unknown;
  effective_price?: unknown;
  status?: unknown;
  stock_quantity?: unknown;
  allow_purchase?: unknown;
};

type DiscountRow = {
  code?: unknown;
  discount_type?: unknown;
  discount_value?: unknown;
  minimum_order_value?: unknown;
  maximum_discount?: unknown;
  active?: unknown;
  starts_at?: unknown;
  expires_at?: unknown;
  usage_limit?: unknown;
  times_used?: unknown;
};

function discountAmount(row: DiscountRow, orderValue: number) {
  const type = String(row.discount_type || "");
  const value = Math.max(0, Number(row.discount_value || 0));
  if (type === "fixed_amount") return Math.min(orderValue, value);
  if (type === "percentage") {
    const calculated = orderValue * Math.min(100, value) / 100;
    const maximum = row.maximum_discount == null ? calculated : Math.max(0, Number(row.maximum_discount || 0));
    return Math.min(orderValue, calculated, maximum);
  }
  return 0;
}

export async function GET() {
  const settings = await loadSiteSettings();
  if (!settings.promoEnabled) {
    return NextResponse.json({ success: true, promotion: { enabled: false } });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json({ success: true, promotion: { enabled: false } });
  }

  try {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const [productResponse, discountResponse] = await Promise.all([
      fetch(`${url}/rest/v1/store_products?slug=eq.${encodeURIComponent(settings.promoProductSlug)}&select=name,slug,effective_price,status,stock_quantity,allow_purchase&limit=1`, {
        headers,
        next: { revalidate: 30 },
      }),
      fetch(`${url}/rest/v1/delivery_discount_codes?code=eq.${encodeURIComponent(settings.promoCode)}&select=code,discount_type,discount_value,minimum_order_value,maximum_discount,active,starts_at,expires_at,usage_limit,times_used&limit=1`, {
        headers,
        next: { revalidate: 30 },
      }),
    ]);
    if (!productResponse.ok || !discountResponse.ok) {
      return NextResponse.json({ success: true, promotion: { enabled: false } });
    }

    const product = ((await productResponse.json()) as ProductRow[])[0];
    const discount = ((await discountResponse.json()) as DiscountRow[])[0];
    const now = Date.now();
    const price = Number(product?.effective_price || 0);
    const startsAt = discount?.starts_at ? new Date(String(discount.starts_at)).getTime() : null;
    const expiresAt = discount?.expires_at ? new Date(String(discount.expires_at)).getTime() : null;
    const usageLimit = discount?.usage_limit == null ? null : Number(discount.usage_limit);
    const minimum = Number(discount?.minimum_order_value || 0);
    const usable = Boolean(
      product &&
      discount &&
      discount.active &&
      product.allow_purchase &&
      String(product.status) !== "hidden" &&
      price > 0 &&
      price >= minimum &&
      (!startsAt || startsAt <= now) &&
      (!expiresAt || expiresAt > now) &&
      (usageLimit == null || Number(discount.times_used || 0) < usageLimit)
    );
    if (!usable) {
      return NextResponse.json({ success: true, promotion: { enabled: false } });
    }

    const amount = discountAmount(discount, price);
    const type = String(discount.discount_type || "");
    return NextResponse.json(
      {
        success: true,
        promotion: {
          enabled: true,
          code: settings.promoCode,
          labelEn: settings.promoLabelEn,
          labelAr: settings.promoLabelAr,
          productName: String(product.name || "Product"),
          productSlug: String(product.slug || settings.promoProductSlug),
          discountType: type,
          discountValue: Number(discount.discount_value || 0),
          discountAmount: amount,
          price,
          finalPrice: Math.max(0, price - amount),
          freeDelivery: type === "free_delivery",
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Promotion API error:", error);
    return NextResponse.json({ success: true, promotion: { enabled: false } });
  }
}
