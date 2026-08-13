import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

type TrackOrderRequest = {
  orderNumber?: string;
  phone?: string;
};

type OrderRow = {
  order_number: string;
  phone: string;
  governorate: string;
  colour: string;
  quantity: number;
  products_total: number;
  delivery_fee: number;
  discount_amount: number;
  total_price: number;
  status: string;
  created_at: string;
  shipping_status: string | null;
  bosta_tracking_number: string | null;
  bosta_state_name: string | null;
  bosta_submitted_at: string | null;
  bosta_status_updated_at: string | null;
};

const privateResponseHeaders = {
  "Cache-Control":
    "private, no-store, max-age=0",
};

function trackOrderResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: privateResponseHeaders,
  });
}

function normalizePhone(phone: string) {
  let digits = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (digits.startsWith("0020")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("20")) {
    return `0${digits.slice(2)}`;
  }

  if (digits.startsWith("1")) {
    return `0${digits}`;
  }

  return digits;
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return trackOrderResponse(
        {
          success: false,
          code: "CONFIGURATION_ERROR",
          message:
            "Server configuration is incomplete.",
        },
        500
      );
    }

    const body =
      (await request.json()) as TrackOrderRequest;

    const orderNumber = String(
      body.orderNumber || ""
    )
      .trim()
      .toUpperCase();

    const phone = normalizePhone(
      String(body.phone || "")
    );

    if (!orderNumber || !phone) {
      return trackOrderResponse(
        {
          success: false,
          code: "MISSING_DETAILS",
          message:
            "Please enter your order number and phone number.",
        },
        400
      );
    }

    if (
      orderNumber.length > 80 ||
      phone.length < 10 ||
      phone.length > 15
    ) {
      return trackOrderResponse(
        {
          success: false,
          code: "INVALID_DETAILS",
          message:
            "Please check your order number and phone number.",
        },
        400
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(
        orderNumber
      )}&select=order_number,phone,governorate,colour,quantity,products_total,delivery_fee,discount_amount,total_price,status,created_at,shipping_status,bosta_tracking_number,bosta_state_name,bosta_submitted_at,bosta_status_updated_at&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Track order Supabase error:",
        await response.text()
      );

      return trackOrderResponse(
        {
          success: false,
          code: "LOOKUP_FAILED",
          message:
            "Could not check your order right now.",
        },
        500
      );
    }

    const orders =
      (await response.json()) as OrderRow[];

    const order = orders[0];

    if (
      !order ||
      normalizePhone(order.phone) !== phone
    ) {
      return trackOrderResponse(
        {
          success: false,
          code: "ORDER_NOT_FOUND",
          message:
            "No order was found with these details.",
        },
        404
      );
    }

    return trackOrderResponse({
      success: true,
      order: {
        orderNumber: order.order_number,
        governorate: order.governorate,
        colour: order.colour,
        quantity: order.quantity,
        productsTotal: Number(
          order.products_total || 0
        ),
        deliveryFee: Number(
          order.delivery_fee || 0
        ),
        discountAmount: Number(
          order.discount_amount || 0
        ),
        totalPrice: Number(
          order.total_price || 0
        ),
        status: order.status,
        createdAt: order.created_at,
        shippingStatus:
          order.shipping_status || null,
        trackingNumber:
          order.bosta_tracking_number ||
          null,
        carrierStatus:
          order.bosta_state_name || null,
        lastUpdatedAt:
          order.bosta_status_updated_at ||
          order.bosta_submitted_at ||
          order.created_at,
      },
    });
  } catch (error) {
    console.error("Track order API error:", error);

    return trackOrderResponse(
      {
        success: false,
        code: "UNKNOWN_ERROR",
        message:
          "Could not check your order right now.",
      },
      500
    );
  }
}
