import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBostaCities, getBostaDistricts } from "@/lib/bosta";
import { getDeliveryAreaForBostaCity } from "@/lib/shipping-pricing";
import {
  SupabaseAdminError,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PRODUCT_SLUG = "google-fitbit-air";
const CHECKOUT_SESSION_COOKIE = "orvix_checkout_session";

type OrderInput = {
  fullName?: string;
  phone?: string;
  customerEmail?: string | null;
  productSlug?: string;
  productName?: string;
  variantKey?: string | null;
  colour?: string;
  quantity?: number;
  bostaCityId?: string;
  bostaDistrictId?: string;
  address?: string;
  notes?: string;
  discountCode?: string | null;
  discount_code?: string | null;
  couponCode?: string | null;
  coupon_code?: string | null;
  appliedDiscount?: { code?: string | null } | null;
};

type CommerceSettings = {
  checkout_enabled?: boolean;
  rate_limit_per_minute?: number;
  duplicate_window_seconds?: number;
};

type CreateOrderResult = {
  duplicate?: boolean;
  orderId?: string;
  orderNumber?: string;
  shippingNumber?: string;
  productName?: string;
  productSlug?: string;
  productPrice?: number | string;
  compareAtPrice?: number | string | null;
  productsTotal?: number | string;
  deliveryFee?: number | string;
  discountAmount?: number | string;
  totalPrice?: number | string;
  remainingStock?: number | null;
  riskScore?: number;
  variantKey?: string | null;
  variantLabel?: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprint(value: string) {
  const pepper =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    "orvix-commerce";
  return sha256(`${pepper}:${value}`);
}

function getSourceAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getDiscountCode(order: OrderInput) {
  return [
    order.discountCode,
    order.discount_code,
    order.couponCode,
    order.coupon_code,
    order.appliedDiscount?.code,
  ]
    .map((value) => clean(value))
    .find(Boolean)
    ?.toUpperCase() || "";
}

function getRpcErrorMessage(error: unknown) {
  const details =
    error instanceof SupabaseAdminError
      ? `${error.message} ${error.details}`
      : error instanceof Error
        ? error.message
        : String(error);

  if (details.includes("CHECKOUT_DISABLED")) {
    return { status: 503, message: "Ordering is temporarily paused. Please try again shortly." };
  }
  if (details.includes("PRODUCT_NOT_FOUND")) {
    return { status: 404, message: "This product could not be found." };
  }
  if (details.includes("PRODUCT_UNAVAILABLE") || details.includes("VARIANT_UNAVAILABLE")) {
    return { status: 409, message: "This product option is currently unavailable for sale." };
  }
  if (details.includes("INVALID_PRODUCT_PRICE")) {
    return { status: 409, message: "This product is not available for ordering yet." };
  }
  if (details.includes("INVALID_QUANTITY")) {
    return { status: 400, message: "The selected quantity is not available." };
  }
  if (details.includes("INVALID_DISCOUNT")) {
    return { status: 400, message: "This discount code is invalid, inactive, expired or has reached its limit." };
  }
  if (details.includes("INSUFFICIENT_STOCK:")) {
    const match = details.match(/INSUFFICIENT_STOCK:(\d+)/);
    const remaining = match?.[1];
    return {
      status: 409,
      message: remaining
        ? `Only ${remaining} item(s) are currently available.`
        : "There is not enough stock for this order.",
    };
  }

  return { status: 500, message: "Could not place your order. Please try again." };
}

async function getCommerceSettings() {
  const rows = await supabaseAdminJson<CommerceSettings[]>(
    "commerce_settings?id=eq.default&select=checkout_enabled,rate_limit_per_minute,duplicate_window_seconds&limit=1"
  );
  return rows[0] || {};
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as OrderInput;

    const fullName = clean(input.fullName);
    const phone = clean(input.phone);
    const customerEmail = clean(input.customerEmail).toLowerCase();
    const productSlug = clean(input.productSlug) || DEFAULT_PRODUCT_SLUG;
    const colour = clean(input.colour);
    const variantKey = clean(input.variantKey) || colour.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const bostaCityId = clean(input.bostaCityId);
    const bostaDistrictId = clean(input.bostaDistrictId);
    const address = clean(input.address);
    const notes = clean(input.notes) || "No notes";
    const quantity = Number(input.quantity);
    const discountCode = getDiscountCode(input);

    if (!fullName || !phone || !productSlug || !colour || !bostaCityId || !bostaDistrictId || !address) {
      return NextResponse.json(
        { success: false, message: "Please complete all required order details." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address or leave it empty." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return NextResponse.json(
        { success: false, message: "Invalid product quantity." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const settings = await getCommerceSettings();
    if (settings.checkout_enabled === false) {
      return NextResponse.json(
        { success: false, message: "Ordering is temporarily paused. Please try again shortly." },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
      );
    }

    const sourceAddress = getSourceAddress(request);
    const userAgent = request.headers.get("user-agent") || "unknown";
    const sourceHash = fingerprint(sourceAddress);
    const userAgentHash = fingerprint(userAgent);

    const rateLimit = Math.max(1, Math.min(Number(settings.rate_limit_per_minute || 20), 1000));
    const allowed = await supabaseAdminJson<boolean>(
      "rpc/orvix_take_rate_limit",
      {
        method: "POST",
        body: JSON.stringify({
          p_key: `order:${sourceHash}`,
          p_limit: rateLimit,
          p_window_seconds: 60,
        }),
      }
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many checkout attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
      );
    }

    const bostaCities = await getBostaCities();
    const selectedCity = bostaCities.find((city) => city.id === bostaCityId);
    if (!selectedCity) {
      return NextResponse.json(
        { success: false, message: "The selected delivery city is invalid. Please select it again." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const bostaDistricts = await getBostaDistricts(selectedCity.id);
    const selectedDistrict = bostaDistricts.find((district) => district.id === bostaDistrictId);
    if (!selectedDistrict) {
      return NextResponse.json(
        { success: false, message: "The selected delivery district is invalid. Please select it again." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const deliveryArea = getDeliveryAreaForBostaCity(selectedCity);
    const duplicateWindowSeconds = Math.max(
      60,
      Math.min(Number(settings.duplicate_window_seconds || 600), 86400)
    );
    const explicitIdempotencyKey = clean(request.headers.get("idempotency-key"));
    const timeBucket = Math.floor(Date.now() / (duplicateWindowSeconds * 1000));
    const idempotencyKey = explicitIdempotencyKey || sha256([
      "orvix-order-v3",
      phone.toLowerCase(),
      productSlug.toLowerCase(),
      variantKey.toLowerCase(),
      colour.toLowerCase(),
      quantity,
      selectedCity.id,
      selectedDistrict.id,
      address.toLowerCase(),
      discountCode,
      timeBucket,
    ].join("|"));

    const checkoutSessionKey =
      clean(request.headers.get("x-checkout-session")) ||
      clean(request.cookies.get(CHECKOUT_SESSION_COOKIE)?.value) ||
      sha256(`${sourceHash}:${userAgentHash}:${Math.floor(Date.now() / 1800000)}`);

    let created: CreateOrderResult;
    try {
      created = await supabaseAdminJson<CreateOrderResult>(
        "rpc/orvix_create_order_v3",
        {
          method: "POST",
          body: JSON.stringify({
            p_idempotency_key: idempotencyKey,
            p_checkout_session_key: checkoutSessionKey,
            p_product_slug: productSlug,
            p_variant_key: variantKey || null,
            p_colour: colour,
            p_quantity: quantity,
            p_customer_name: fullName,
            p_phone: phone,
            p_customer_email: customerEmail || null,
            p_governorate: selectedCity.name,
            p_bosta_city_id: selectedCity.id,
            p_bosta_city_name: selectedCity.name,
            p_bosta_city_sector: selectedCity.sector ?? null,
            p_bosta_zone_id: selectedDistrict.zoneId ?? null,
            p_bosta_zone_name: selectedDistrict.zoneName ?? null,
            p_bosta_district_id: selectedDistrict.id,
            p_bosta_district_name: selectedDistrict.name,
            p_address: address,
            p_notes: notes,
            p_delivery_fee: deliveryArea.fee,
            p_discount_code: discountCode || null,
            p_source_hash: sourceHash,
            p_user_agent_hash: userAgentHash,
          }),
        }
      );
    } catch (error) {
      const mapped = getRpcErrorMessage(error);
      console.error("Atomic order creation error:", error);
      return NextResponse.json(
        { success: false, message: mapped.message },
        { status: mapped.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!created?.orderNumber) {
      return NextResponse.json(
        { success: false, message: "Your order could not be confirmed. Please try again." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const order = {
      id: created.orderId,
      order_number: created.orderNumber,
      shipping_number: created.shippingNumber,
      product_name: created.productName,
      product_slug: created.productSlug,
      product_price: Number(created.productPrice || 0),
      products_total: Number(created.productsTotal || 0),
      delivery_fee: Number(created.deliveryFee || 0),
      discount_amount: Number(created.discountAmount || 0),
      total_price: Number(created.totalPrice || 0),
      colour,
      quantity,
      risk_score: Number(created.riskScore || 0),
      variant_key: created.variantKey || null,
      variant_label: created.variantLabel || null,
    };

    return NextResponse.json(
      {
        success: true,
        duplicate: Boolean(created.duplicate),
        orderNumber: created.orderNumber,
        shippingNumber: created.shippingNumber,
        remainingStock: created.remainingStock,
        order,
      },
      {
        status: created.duplicate ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Order v3 API error:", error);
    return NextResponse.json(
      { success: false, message: "Could not place your order. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
