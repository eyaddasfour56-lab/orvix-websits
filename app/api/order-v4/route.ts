import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBostaCities, getBostaDistricts } from "@/lib/bosta";
import { getDeliveryAreaForBostaCity } from "@/lib/shipping-pricing";
import { SupabaseAdminError, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHECKOUT_SESSION_COOKIE = "orvix_checkout_session";

type CartInput = {
  productSlug?: string;
  variantKey?: string | null;
  colour?: string | null;
  quantity?: number;
};

type OrderInput = {
  fullName?: string;
  phone?: string;
  customerEmail?: string | null;
  items?: CartInput[];
  bostaCityId?: string;
  bostaDistrictId?: string;
  address?: string;
  notes?: string;
  discountCode?: string | null;
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
  productsTotal?: number | string;
  deliveryFee?: number | string;
  discountAmount?: number | string;
  totalPrice?: number | string;
  orderType?: "standard" | "preorder" | "mixed";
  paymentStatus?: string;
  estimatedDeliveryFrom?: string | null;
  estimatedDeliveryTo?: string | null;
  riskScore?: number;
  items?: Array<Record<string, unknown>>;
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

function normaliseItems(items: CartInput[] | undefined) {
  if (!Array.isArray(items)) return [];

  const grouped = new Map<string, Required<CartInput>>();

  for (const rawItem of items) {
    const productSlug = clean(rawItem?.productSlug).toLowerCase();
    const variantKey = clean(rawItem?.variantKey) || "";
    const colour = clean(rawItem?.colour) || "Standard";
    const quantity = Number(rawItem?.quantity);

    if (!productSlug || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      continue;
    }

    const key = `${productSlug}|${variantKey.toLowerCase()}|${colour.toLowerCase()}`;
    const existing = grouped.get(key);
    grouped.set(key, {
      productSlug,
      variantKey: variantKey || null,
      colour,
      quantity: (existing?.quantity || 0) + quantity,
    });
  }

  return Array.from(grouped.values()).sort((a, b) =>
    `${a.productSlug}|${a.variantKey || ""}|${a.colour}`.localeCompare(
      `${b.productSlug}|${b.variantKey || ""}|${b.colour}`
    )
  );
}

function getRpcError(error: unknown) {
  const details =
    error instanceof SupabaseAdminError
      ? `${error.message} ${error.details}`
      : error instanceof Error
        ? error.message
        : String(error);

  if (details.includes("CHECKOUT_DISABLED")) {
    return { status: 503, message: "Ordering is temporarily paused. Please try again shortly." };
  }
  if (details.includes("INVALID_ITEMS") || details.includes("INVALID_CART_QUANTITY")) {
    return { status: 400, message: "Your cart is invalid. Please review the items and try again." };
  }
  if (details.includes("PRODUCT_NOT_FOUND")) {
    return { status: 404, message: "One of the products in your cart could not be found." };
  }
  if (details.includes("PRODUCT_UNAVAILABLE") || details.includes("VARIANT_UNAVAILABLE")) {
    return { status: 409, message: "One of the selected product options is currently unavailable." };
  }
  if (details.includes("INVALID_PRODUCT_PRICE")) {
    return { status: 409, message: "One of the products is not available for ordering yet." };
  }
  if (details.includes("INVALID_QUANTITY")) {
    return { status: 400, message: "One of the selected quantities is not available." };
  }
  if (details.includes("INVALID_DISCOUNT")) {
    return { status: 400, message: "This discount code is invalid, inactive, expired or has reached its limit." };
  }
  if (details.includes("INSUFFICIENT_STOCK")) {
    const match = details.match(/INSUFFICIENT_STOCK:([^: ]+):(\d+)/);
    return {
      status: 409,
      message: match
        ? `Only ${match[2]} item(s) are currently available for ${match[1]}.`
        : "There is not enough stock for one of the products in your cart.",
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

async function trackCompletedOrder(input: {
  orderId?: string;
  orderNumber?: string;
  items: Array<Required<CartInput>>;
  visitorId: string;
  sessionId: string;
}) {
  try {
    await supabaseAdminJson("analytics_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        event_name: "order_completed",
        visitor_id: input.visitorId || null,
        session_id: input.sessionId || null,
        path: "/checkout",
        order_id: input.orderId || null,
        order_number: input.orderNumber || null,
        product_slug: input.items[0]?.productSlug || null,
        metadata: {
          itemCount: input.items.length,
          quantity: input.items.reduce((total, item) => total + item.quantity, 0),
          products: input.items.map((item) => item.productSlug),
        },
      }),
    });
  } catch (error) {
    console.error("Order analytics event error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as OrderInput;
    const fullName = clean(input.fullName);
    const phone = clean(input.phone);
    const customerEmail = clean(input.customerEmail).toLowerCase();
    const items = normaliseItems(input.items);
    const bostaCityId = clean(input.bostaCityId);
    const bostaDistrictId = clean(input.bostaDistrictId);
    const address = clean(input.address);
    const notes = clean(input.notes) || "No notes";
    const discountCode = clean(input.discountCode).toUpperCase();

    if (!fullName || !phone || !bostaCityId || !bostaDistrictId || !address || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Please complete all required order details." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    if (items.length > 20 || totalQuantity > 20) {
      return NextResponse.json(
        { success: false, message: "Your cart can contain up to 20 units per order." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address or leave it empty." },
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
    const sourceHash = fingerprint(sourceAddress);
    const userAgentHash = fingerprint(request.headers.get("user-agent") || "unknown");
    const rateLimit = Math.max(1, Math.min(Number(settings.rate_limit_per_minute || 20), 1000));

    const allowed = await supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
      method: "POST",
      body: JSON.stringify({ p_key: `order-v4:${sourceHash}`, p_limit: rateLimit, p_window_seconds: 60 }),
    });

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many checkout attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
      );
    }

    const [cities, districts] = await Promise.all([
      getBostaCities(),
      getBostaDistricts(bostaCityId),
    ]);
    const city = cities.find((candidate) => candidate.id === bostaCityId);
    const district = districts.find((candidate) => candidate.id === bostaDistrictId);

    if (!city || !district) {
      return NextResponse.json(
        { success: false, message: "The selected delivery location is invalid. Please select it again." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const deliveryArea = getDeliveryAreaForBostaCity(city);
    const duplicateWindowSeconds = Math.max(60, Math.min(Number(settings.duplicate_window_seconds || 600), 86400));
    const explicitIdempotencyKey = clean(request.headers.get("idempotency-key"));
    const timeBucket = Math.floor(Date.now() / (duplicateWindowSeconds * 1000));
    const idempotencyKey = explicitIdempotencyKey || sha256([
      "orvix-order-v4",
      phone.toLowerCase(),
      items.map((item) => `${item.productSlug}:${item.variantKey || ""}:${item.colour}:${item.quantity}`).join(","),
      city.id,
      district.id,
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
      created = await supabaseAdminJson<CreateOrderResult>("rpc/orvix_create_order_v4", {
        method: "POST",
        body: JSON.stringify({
          p_idempotency_key: idempotencyKey,
          p_checkout_session_key: checkoutSessionKey,
          p_items: items,
          p_customer_name: fullName,
          p_phone: phone,
          p_customer_email: customerEmail || null,
          p_governorate: city.name,
          p_bosta_city_id: city.id,
          p_bosta_city_name: city.name,
          p_bosta_city_sector: city.sector ?? null,
          p_bosta_zone_id: district.zoneId ?? null,
          p_bosta_zone_name: district.zoneName ?? null,
          p_bosta_district_id: district.id,
          p_bosta_district_name: district.name,
          p_address: address,
          p_notes: notes,
          p_delivery_fee: deliveryArea.fee,
          p_discount_code: discountCode || null,
          p_source_hash: sourceHash,
          p_user_agent_hash: userAgentHash,
        }),
      });
    } catch (error) {
      const mapped = getRpcError(error);
      console.error("Order v4 atomic creation error:", error);
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

    const visitorId = clean(request.headers.get("x-orvix-visitor"));
    const analyticsSessionId = clean(request.headers.get("x-orvix-session"));
    await trackCompletedOrder({
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      items,
      visitorId,
      sessionId: analyticsSessionId,
    });

    return NextResponse.json(
      {
        success: true,
        duplicate: Boolean(created.duplicate),
        orderNumber: created.orderNumber,
        orderId: created.orderId,
        shippingNumber: created.shippingNumber,
        orderType: created.orderType || "standard",
        paymentStatus: created.paymentStatus || "pending",
        estimatedDeliveryFrom: created.estimatedDeliveryFrom || null,
        estimatedDeliveryTo: created.estimatedDeliveryTo || null,
        productsTotal: Number(created.productsTotal || 0),
        deliveryFee: Number(created.deliveryFee || 0),
        discountAmount: Number(created.discountAmount || 0),
        totalPrice: Number(created.totalPrice || 0),
        items: Array.isArray(created.items) ? created.items : [],
      },
      {
        status: created.duplicate ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Order v4 API error:", error);
    return NextResponse.json(
      { success: false, message: "Could not place your order. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
