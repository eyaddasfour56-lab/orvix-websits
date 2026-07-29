import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const PRODUCT_PRICE = 7900;

const deliveryAreas = [
  {
    name: "Cairo",
    fee: 70,
  },
  {
    name: "Alexandria",
    fee: 75,
  },
  {
    name: "Delta and Canal Cities",
    fee: 85,
  },
  {
    name: "Upper Egypt and Red Sea",
    fee: 100,
  },
  {
    name:
      "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
    fee: 140,
  },
];

type OrderData = {
  fullName: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  colour: string;
  quantity: number;
  productPrice?: number;
  deliveryFee?: number;
  originalDeliveryFee?: number;
  discountCode?: string;
  deliveryDiscount?: number;
  totalPrice?: number;
};

type DiscountRow = {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
  expires_at: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createOrderNumber() {
  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ORVIX-${Date.now()}-${randomPart}`;
}

async function findDiscountCode(
  code: string
): Promise<DiscountRow | null> {
  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/delivery_discount_codes?code=eq.${encodeURIComponent(
      code
    )}&select=*`,
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
    throw new Error(
      "Could not check the discount code."
    );
  }

  const rows = (await response.json()) as DiscountRow[];

  return rows[0] ?? null;
}

function validateDiscount(discount: DiscountRow) {
  if (!discount.active) {
    return "This discount code is inactive.";
  }

  if (
    discount.expires_at &&
    new Date(discount.expires_at).getTime() <
      Date.now()
  ) {
    return "This discount code has expired.";
  }

  if (
    discount.usage_limit !== null &&
    Number(discount.times_used) >=
      Number(discount.usage_limit)
  ) {
    return "This discount code has reached its usage limit.";
  }

  if (discount.discount_type !== "free_delivery") {
    return "This code cannot be used for free delivery.";
  }

  return null;
}

async function increaseDiscountUsage(
  discount: DiscountRow
) {
  if (!supabaseUrl || !supabaseSecretKey) {
    return;
  }

  await fetch(
    `${supabaseUrl}/rest/v1/delivery_discount_codes?id=eq.${discount.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        times_used: Number(discount.times_used) + 1,
      }),
    }
  );
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const order =
      (await request.json()) as OrderData;

    if (
      !order.fullName ||
      !order.phone ||
      !order.governorate ||
      !order.address ||
      !order.colour ||
      !order.quantity
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required order details.",
        },
        { status: 400 }
      );
    }

    const fullName = String(order.fullName).trim();
    const phone = String(order.phone).trim();
    const governorate = String(
      order.governorate
    ).trim();
    const address = String(order.address).trim();
    const notes = String(
      order.notes || "No notes"
    ).trim();
    const colour = String(order.colour).trim();

    const quantity = Number(order.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product quantity.",
        },
        { status: 400 }
      );
    }

    const selectedDeliveryArea =
      deliveryAreas.find(
        (area) => area.name === governorate
      );

    if (!selectedDeliveryArea) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected delivery area is invalid.",
        },
        { status: 400 }
      );
    }

    const productPrice = PRODUCT_PRICE;
    const productsTotal =
      productPrice * quantity;

    const originalDeliveryFee =
      selectedDeliveryArea.fee;

    let verifiedDeliveryFee =
      originalDeliveryFee;

    let verifiedDeliveryDiscount = 0;
    let verifiedDiscountCode = "";
    let verifiedDiscount: DiscountRow | null =
      null;

    const submittedDiscountCode = String(
      order.discountCode || ""
    )
      .trim()
      .toUpperCase();

    if (submittedDiscountCode) {
      const discount = await findDiscountCode(
        submittedDiscountCode
      );

      if (!discount) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid discount code.",
          },
          { status: 400 }
        );
      }

      const discountError =
        validateDiscount(discount);

      if (discountError) {
        return NextResponse.json(
          {
            success: false,
            message: discountError,
          },
          { status: 400 }
        );
      }

      verifiedDiscount = discount;
      verifiedDiscountCode = discount.code;
      verifiedDeliveryDiscount =
        originalDeliveryFee;
      verifiedDeliveryFee = 0;
    }

    const verifiedTotalPrice =
      productsTotal + verifiedDeliveryFee;

    const orderNumber = createOrderNumber();

    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: fullName,
          phone,
          governorate,
          address,
          notes,
          colour,
          quantity,
          product_price: productPrice,
          products_total: productsTotal,
          delivery_fee: verifiedDeliveryFee,
          discount_amount:
            verifiedDeliveryDiscount,
          total_price: verifiedTotalPrice,
          status: "new",
        }),
      }
    );

    if (!supabaseResponse.ok) {
      const supabaseError =
        await supabaseResponse.text();

      console.error(
        "Supabase order error:",
        supabaseError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not save your order. Please try again.",
        },
        { status: 500 }
      );
    }

    const savedOrders =
      await supabaseResponse.json();

    if (verifiedDiscount) {
      try {
        await increaseDiscountUsage(
          verifiedDiscount
        );
      } catch (usageError) {
        console.error(
          "Could not increase discount usage:",
          usageError
        );
      }
    }

    const safeFullName = escapeHtml(fullName);
    const safePhone = escapeHtml(phone);
    const safeGovernorate =
      escapeHtml(governorate);
    const safeAddress = escapeHtml(address);
    const safeNotes = escapeHtml(notes);
    const safeColour = escapeHtml(colour);
    const safeDiscountCode = escapeHtml(
      verifiedDiscountCode || "None"
    );

    const notificationEmail =
      process.env.ORDER_NOTIFICATION_EMAIL ||
      process.env.RESEND_TO_EMAIL;

    if (resend && notificationEmail) {
      try {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "ORVIX Orders <onboarding@resend.dev>",
          to: notificationEmail,
          subject: `New ORVIX order — ${orderNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111;">
              <h1 style="margin-bottom:8px;">New ORVIX Order</h1>

              <p style="color:#666;margin-top:0;">
                A new order has been placed on the website.
              </p>

              <div style="background:#f4f4f4;border-radius:16px;padding:20px;margin-top:24px;">
                <p><strong>Order number:</strong> ${orderNumber}</p>
                <p><strong>Customer:</strong> ${safeFullName}</p>
                <p><strong>Phone:</strong> ${safePhone}</p>
                <p><strong>Governorate:</strong> ${safeGovernorate}</p>
                <p><strong>Address:</strong> ${safeAddress}</p>
                <p><strong>Notes:</strong> ${safeNotes}</p>
              </div>

              <div style="background:#f4f4f4;border-radius:16px;padding:20px;margin-top:16px;">
                <p><strong>Product:</strong> Google Fitbit Air</p>
                <p><strong>Colour:</strong> ${safeColour}</p>
                <p><strong>Quantity:</strong> ${quantity}</p>
                <p><strong>Product price:</strong> ${productPrice.toLocaleString(
                  "en-GB"
                )} EGP</p>
                <p><strong>Products total:</strong> ${productsTotal.toLocaleString(
                  "en-GB"
                )} EGP</p>
                <p><strong>Original delivery:</strong> ${originalDeliveryFee.toLocaleString(
                  "en-GB"
                )} EGP</p>
                <p><strong>Discount code:</strong> ${safeDiscountCode}</p>
                <p><strong>Delivery discount:</strong> ${verifiedDeliveryDiscount.toLocaleString(
                  "en-GB"
                )} EGP</p>
                <p><strong>Final delivery:</strong> ${verifiedDeliveryFee.toLocaleString(
                  "en-GB"
                )} EGP</p>

                <p style="font-size:20px;">
                  <strong>Final total: ${verifiedTotalPrice.toLocaleString(
                    "en-GB"
                  )} EGP</strong>
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailError) {
        console.error(
          "Resend email error:",
          emailError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order placed successfully.",
      orderNumber,
      order:
        Array.isArray(savedOrders) &&
        savedOrders.length > 0
          ? savedOrders[0]
          : null,
      pricing: {
        productPrice,
        productsTotal,
        originalDeliveryFee,
        deliveryDiscount:
          verifiedDeliveryDiscount,
        deliveryFee: verifiedDeliveryFee,
        totalPrice: verifiedTotalPrice,
        discountCode:
          verifiedDiscountCode || null,
      },
    });
  } catch (error) {
    console.error("Order API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not place your order.",
      },
      { status: 500 }
    );
  }
}