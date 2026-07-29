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
  customer_name: string;
  phone: string;
  governorate: string;
  address: string;
  colour: string;
  quantity: number;
  products_total: number;
  delivery_fee: number;
  discount_amount: number;
  total_price: number;
  status: string;
  created_at: string;
};

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
      return NextResponse.json(
        {
          success: false,
          message:
            "Server configuration is incomplete.",
        },
        { status: 500 }
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
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your order number and phone number.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(
        orderNumber
      )}&select=order_number,customer_name,phone,governorate,address,colour,quantity,products_total,delivery_fee,discount_amount,total_price,status,created_at&limit=1`,
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

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not check your order right now.",
        },
        { status: 500 }
      );
    }

    const orders =
      (await response.json()) as OrderRow[];

    const order = orders[0];

    if (
      !order ||
      normalizePhone(order.phone) !== phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No order was found with these details.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
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
      },
    });
  } catch (error) {
    console.error("Track order API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not check your order right now.",
      },
      { status: 500 }
    );
  }
}