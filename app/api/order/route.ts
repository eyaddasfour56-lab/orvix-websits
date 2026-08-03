import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey =
  process.env.RESEND_API_KEY;

const resend = resendApiKey
  ? new Resend(resendApiKey)
  : null;

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

const PRODUCT_NAME =
  "Google Fitbit Air";

const PRODUCT_SLUG =
  "google-fitbit-air";

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

type DiscountType =
  | "free_delivery"
  | "fixed_amount"
  | "percentage";

type OrderData = {
  fullName?: string;
  phone?: string;

  customerEmail?: string | null;

  governorate?: string;
  address?: string;
  notes?: string;

  colour?: string;
  quantity?: number;

  discountCode?: string | null;
  discount_code?: string | null;

  couponCode?: string | null;
  coupon_code?: string | null;

  appliedDiscount?: {
    code?: string | null;
  } | null;
};

type DiscountRow = {
  id: number | string;
  code: string;

  discount_type: string;

  discount_value:
    | number
    | string;

  usage_limit:
    | number
    | string
    | null;

  times_used:
    | number
    | string
    | null;

  active: boolean;

  expires_at: string | null;
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("en-GB");
}

function createOrderNumber() {
  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ORVIX-${Date.now()}-${randomPart}`;
}

function createShippingNumber() {
  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `SHIP-${Date.now()}-${randomPart}`;
}

function normaliseDiscountType(
  value: string
): DiscountType | null {
  const cleanValue = String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  const freeDeliveryTypes = [
    "free_delivery",
    "free_shipping",
    "free_delivery_code",
    "delivery",
    "shipping",
    "delivery_discount",
    "shipping_discount",
  ];

  if (
    freeDeliveryTypes.includes(cleanValue)
  ) {
    return "free_delivery";
  }

  const fixedAmountTypes = [
    "fixed_amount",
    "fixed",
    "amount",
    "cash",
    "money",
    "fixed_discount",
    "amount_discount",
    "cash_discount",
    "amount_off",
  ];

  if (
    fixedAmountTypes.includes(cleanValue)
  ) {
    return "fixed_amount";
  }

  const percentageTypes = [
    "percentage",
    "percent",
    "percentage_off",
    "percent_off",
    "percentage_discount",
    "percent_discount",
  ];

  if (
    percentageTypes.includes(cleanValue)
  ) {
    return "percentage";
  }

  return null;
}

function getSubmittedDiscountCode(
  order: OrderData
) {
  const possibleCodes = [
    order.discountCode,
    order.discount_code,
    order.couponCode,
    order.coupon_code,
    order.appliedDiscount?.code,
  ];

  const receivedCode =
    possibleCodes.find((value) => {
      return String(value ?? "").trim();
    });

  return String(receivedCode ?? "")
    .trim()
    .toUpperCase();
}

async function findDiscountCode(
  code: string
): Promise<DiscountRow | null> {
  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    return null;
  }

  /*
    ilike بدل eq علشان الكود يشتغل
    سواء كان محفوظ Capital أو Small.
  */
  const requestUrl =
    `${supabaseUrl}/rest/v1/` +
    `delivery_discount_codes` +
    `?select=*` +
    `&code=ilike.${encodeURIComponent(
      code
    )}` +
    `&limit=1`;

  const response = await fetch(
    requestUrl,
    {
      method: "GET",

      headers: {
        apikey: supabaseSecretKey,

        Authorization:
          `Bearer ${supabaseSecretKey}`,
      },

      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Discount lookup error:",
      errorText
    );

    throw new Error(
      "Could not check the discount code."
    );
  }

  const rows =
    (await response.json()) as DiscountRow[];

  return rows[0] ?? null;
}

function validateDiscount(
  discount: DiscountRow
) {
  if (!discount.active) {
    return "This discount code is inactive.";
  }

  if (discount.expires_at) {
    const expiryTime = new Date(
      discount.expires_at
    ).getTime();

    if (
      Number.isFinite(expiryTime) &&
      expiryTime < Date.now()
    ) {
      return "This discount code has expired.";
    }
  }

  const usageLimit =
    discount.usage_limit === null
      ? null
      : Number(discount.usage_limit);

  const timesUsed = Number(
    discount.times_used || 0
  );

  if (
    usageLimit !== null &&
    Number.isFinite(usageLimit) &&
    timesUsed >= usageLimit
  ) {
    return "This discount code has reached its usage limit.";
  }

  const discountType =
    normaliseDiscountType(
      discount.discount_type
    );

  if (!discountType) {
    return "This discount code has an unsupported discount type.";
  }

  const discountValue = Number(
    discount.discount_value
  );

  if (
    discountType === "fixed_amount" &&
    (!Number.isFinite(discountValue) ||
      discountValue <= 0)
  ) {
    return "This discount code has an invalid discount amount.";
  }

  if (
    discountType === "percentage" &&
    (!Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      discountValue > 100)
  ) {
    return "This discount code has an invalid discount percentage.";
  }

  return null;
}

async function increaseDiscountUsage(
  discount: DiscountRow
) {
  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    return;
  }

  const currentUsage = Number(
    discount.times_used || 0
  );

  const response = await fetch(
    `${supabaseUrl}/rest/v1/delivery_discount_codes?id=eq.${encodeURIComponent(
      String(discount.id)
    )}`,
    {
      method: "PATCH",

      headers: {
        apikey: supabaseSecretKey,

        Authorization:
          `Bearer ${supabaseSecretKey}`,

        "Content-Type":
          "application/json",

        Prefer: "return=minimal",
      },

      body: JSON.stringify({
        times_used: currentUsage + 1,
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    console.error(
      "Discount usage update error:",
      errorText
    );

    throw new Error(
      "Could not update discount usage."
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const order =
      (await request.json()) as OrderData;

    const fullName = String(
      order.fullName ?? ""
    ).trim();

    const phone = String(
      order.phone ?? ""
    ).trim();

    const customerEmail = String(
      order.customerEmail ?? ""
    )
      .trim()
      .toLowerCase();

    const governorate = String(
      order.governorate ?? ""
    ).trim();

    const address = String(
      order.address ?? ""
    ).trim();

    const notes =
      String(order.notes ?? "").trim() ||
      "No notes";

    const colour = String(
      order.colour ?? ""
    ).trim();

    const quantity = Number(
      order.quantity
    );

    if (
      !fullName ||
      !phone ||
      !governorate ||
      !address ||
      !colour ||
      !quantity
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please complete all required order details.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      customerEmail &&
      !isValidEmail(customerEmail)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address or leave it empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid product quantity.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedDeliveryArea =
      deliveryAreas.find(
        (area) =>
          area.name === governorate
      );

    if (!selectedDeliveryArea) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected delivery area is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      الأسعار الأساسية من السيرفر،
      وليس من الـCheckout.
    */
    const productName =
      PRODUCT_NAME;

    const productSlug =
      PRODUCT_SLUG;

    const productPrice =
      PRODUCT_PRICE;

    const originalProductsTotal =
      productPrice * quantity;

    const originalDeliveryFee =
      selectedDeliveryArea.fee;

    let verifiedProductDiscount = 0;

    let verifiedDeliveryDiscount = 0;

    let verifiedProductsTotal =
      originalProductsTotal;

    let verifiedDeliveryFee =
      originalDeliveryFee;

    let verifiedDiscountCode = "";

    let verifiedDiscountType:
      | DiscountType
      | null = null;

    let verifiedDiscountValue = 0;

    let verifiedDiscount:
      | DiscountRow
      | null = null;

    /*
      يستقبل كود الخصم حتى لو الـCheckout
      بعته باسم مختلف.
    */
    const submittedDiscountCode =
      getSubmittedDiscountCode(order);

    console.log(
      "Submitted discount code:",
      submittedDiscountCode ||
        "NO DISCOUNT CODE RECEIVED"
    );

    if (submittedDiscountCode) {
      const discount =
        await findDiscountCode(
          submittedDiscountCode
        );

      if (!discount) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid discount code.",
          },
          {
            status: 400,
          }
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
          {
            status: 400,
          }
        );
      }

      const discountType =
        normaliseDiscountType(
          discount.discount_type
        );

      if (!discountType) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This discount code has an unsupported discount type.",
          },
          {
            status: 400,
          }
        );
      }

      const discountValue = Math.max(
        Number(
          discount.discount_value
        ) || 0,
        0
      );

      verifiedDiscount = discount;

      verifiedDiscountCode = String(
        discount.code
      )
        .trim()
        .toUpperCase();

      verifiedDiscountType =
        discountType;

      verifiedDiscountValue =
        discountValue;

      /*
        شحن مجاني:
        المنتج كما هو والمندوب يحصل صفر.
      */
      if (
        discountType ===
        "free_delivery"
      ) {
        verifiedDeliveryDiscount =
          originalDeliveryFee;

        verifiedDeliveryFee = 0;
      }

      /*
        خصم مبلغ ثابت على المنتج.
      */
      if (
        discountType ===
        "fixed_amount"
      ) {
        verifiedProductDiscount =
          Math.min(
            Math.round(
              discountValue
            ),
            originalProductsTotal
          );

        verifiedProductsTotal =
          Math.max(
            originalProductsTotal -
              verifiedProductDiscount,
            0
          );
      }

      /*
        خصم نسبة على المنتج.
      */
      if (
        discountType ===
        "percentage"
      ) {
        verifiedProductDiscount =
          Math.min(
            Math.round(
              originalProductsTotal *
                (discountValue / 100)
            ),
            originalProductsTotal
          );

        verifiedProductsTotal =
          Math.max(
            originalProductsTotal -
              verifiedProductDiscount,
            0
          );
      }
    }

    const verifiedTotalDiscount =
      verifiedProductDiscount +
      verifiedDeliveryDiscount;

    const verifiedTotalPrice =
      Math.max(
        verifiedProductsTotal +
          verifiedDeliveryFee,
        0
      );

    console.log(
      "Verified order pricing:",
      {
        submittedDiscountCode,
        verifiedDiscountCode,
        verifiedDiscountType,
        verifiedDiscountValue,

        originalProductsTotal,

        verifiedProductDiscount,
        verifiedProductsTotal,

        originalDeliveryFee,

        verifiedDeliveryDiscount,
        verifiedDeliveryFee,

        verifiedTotalDiscount,
        verifiedTotalPrice,
      }
    );

    const orderNumber =
      createOrderNumber();

    const shippingNumber =
      createShippingNumber();

    const labelCreatedAt =
      new Date().toISOString();

    const supabaseResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/orders`,
        {
          method: "POST",

          headers: {
            apikey:
              supabaseSecretKey,

            Authorization:
              `Bearer ${supabaseSecretKey}`,

            "Content-Type":
              "application/json",

            Prefer:
              "return=representation",
          },

          body: JSON.stringify({
            order_number:
              orderNumber,

            shipping_number:
              shippingNumber,

            shipping_status:
              "ready_to_print",

            label_created_at:
              labelCreatedAt,

            label_printed_at:
              null,

            payment_method:
              "instapay_on_delivery",

            product_name:
              productName,

            product_slug:
              productSlug,

            customer_name:
              fullName,

            phone,

            customer_email:
              customerEmail || null,

            governorate,
            address,
            notes,
            colour,
            quantity,

            product_price:
              productPrice,

            /*
              ده المبلغ المطلوب تحويله
              إلى ORVIX عبر InstaPay.

              بيتسجل بعد خصم المنتج.
            */
            products_total:
              verifiedProductsTotal,

            /*
              ده المبلغ اللي المندوب هيحصله.

              بيتسجل بعد خصم الشحن.
            */
            delivery_fee:
              verifiedDeliveryFee,

            /*
              إجمالي خصم المنتج والشحن.
            */
            discount_amount:
              verifiedTotalDiscount,

            /*
              المنتجات بعد الخصم
              + الشحن بعد الخصم.
            */
            total_price:
              verifiedTotalPrice,

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
        {
          status: 500,
        }
      );
    }

    const savedOrders =
      await supabaseResponse.json();

    const savedOrder =
      Array.isArray(savedOrders) &&
      savedOrders.length > 0
        ? savedOrders[0]
        : null;

    console.log(
      "Saved order pricing:",
      {
        products_total:
          savedOrder?.products_total,

        delivery_fee:
          savedOrder?.delivery_fee,

        discount_amount:
          savedOrder?.discount_amount,

        total_price:
          savedOrder?.total_price,
      }
    );

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

    const requestOrigin = new URL(
      request.url
    ).origin;

    const trackOrderUrl =
      `${requestOrigin}/track-order?orderNumber=` +
      encodeURIComponent(
        orderNumber
      );

    const safeProductName =
      escapeHtml(productName);

    const safeFullName =
      escapeHtml(fullName);

    const safePhone =
      escapeHtml(phone);

    const safeCustomerEmail =
      customerEmail
        ? escapeHtml(customerEmail)
        : "Not provided";

    const safeGovernorate =
      escapeHtml(governorate);

    const safeAddress =
      escapeHtml(address);

    const safeNotes =
      escapeHtml(notes);

    const safeColour =
      escapeHtml(colour);

    const safeDiscountCode =
      escapeHtml(
        verifiedDiscountCode ||
          "None"
      );

    const safeDiscountType =
      escapeHtml(
        verifiedDiscountType ||
          "None"
      );

    const safeTrackOrderUrl =
      escapeHtml(trackOrderUrl);

    const safeShippingNumber =
      escapeHtml(shippingNumber);

    const notificationEmail =
      process.env
        .ORDER_NOTIFICATION_EMAIL ||
      process.env.RESEND_TO_EMAIL;

    const senderEmail =
      process.env.RESEND_FROM_EMAIL ||
      "ORVIX Orders <onboarding@resend.dev>";

    let adminEmailSent = false;

    let customerEmailSent = false;

    if (resend) {
      if (notificationEmail) {
        try {
          const adminEmailResult =
            await resend.emails.send({
              from: senderEmail,

              to: notificationEmail,

              subject:
                `New ORVIX order — ${orderNumber}`,

              html: `
                <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111;">
                  <h1>
                    New ORVIX Order
                  </h1>

                  <p style="color:#666;">
                    A new order has been placed and its shipping label is ready to print.
                  </p>

                  <div style="background:#111;color:#fff;border-radius:16px;padding:20px;margin-top:24px;">
                    <p>
                      <strong>Order number:</strong>
                      ${orderNumber}
                    </p>

                    <p>
                      <strong>Shipping number:</strong>
                      ${safeShippingNumber}
                    </p>

                    <p>
                      <strong>Shipping status:</strong>
                      Ready to print
                    </p>
                  </div>

                  <div style="background:#f4f4f4;border-radius:16px;padding:20px;margin-top:16px;">
                    <p>
                      <strong>Customer:</strong>
                      ${safeFullName}
                    </p>

                    <p>
                      <strong>Phone:</strong>
                      ${safePhone}
                    </p>

                    <p>
                      <strong>Email:</strong>
                      ${safeCustomerEmail}
                    </p>

                    <p>
                      <strong>Governorate:</strong>
                      ${safeGovernorate}
                    </p>

                    <p>
                      <strong>Address:</strong>
                      ${safeAddress}
                    </p>

                    <p>
                      <strong>Notes:</strong>
                      ${safeNotes}
                    </p>
                  </div>

                  <div style="background:#f4f4f4;border-radius:16px;padding:20px;margin-top:16px;">
                    <p>
                      <strong>Product:</strong>
                      ${safeProductName}
                    </p>

                    <p>
                      <strong>Colour:</strong>
                      ${safeColour}
                    </p>

                    <p>
                      <strong>Quantity:</strong>
                      ${quantity}
                    </p>

                    <p>
                      <strong>Product price:</strong>
                      ${formatMoney(
                        productPrice
                      )} EGP
                    </p>

                    <p>
                      <strong>Original products total:</strong>
                      ${formatMoney(
                        originalProductsTotal
                      )} EGP
                    </p>

                    ${
                      verifiedProductDiscount >
                      0
                        ? `
                          <p style="color:#16803a;">
                            <strong>Product discount:</strong>
                            -${formatMoney(
                              verifiedProductDiscount
                            )} EGP
                          </p>
                        `
                        : ""
                    }

                    <p>
                      <strong>Products after discount:</strong>
                      ${formatMoney(
                        verifiedProductsTotal
                      )} EGP
                    </p>

                    <p>
                      <strong>Original delivery:</strong>
                      ${formatMoney(
                        originalDeliveryFee
                      )} EGP
                    </p>

                    ${
                      verifiedDeliveryDiscount >
                      0
                        ? `
                          <p style="color:#16803a;">
                            <strong>Delivery discount:</strong>
                            -${formatMoney(
                              verifiedDeliveryDiscount
                            )} EGP
                          </p>
                        `
                        : ""
                    }

                    <p>
                      <strong>Final delivery:</strong>
                      ${
                        verifiedDeliveryFee ===
                        0
                          ? "FREE"
                          : `${formatMoney(
                              verifiedDeliveryFee
                            )} EGP`
                      }
                    </p>

                    <p>
                      <strong>Discount code:</strong>
                      ${safeDiscountCode}
                    </p>

                    <p>
                      <strong>Discount type:</strong>
                      ${safeDiscountType}
                    </p>

                    <p>
                      <strong>Total discount:</strong>
                      ${formatMoney(
                        verifiedTotalDiscount
                      )} EGP
                    </p>

                    <p style="font-size:18px;color:#5b21b6;">
                      <strong>
                        InstaPay to ORVIX:
                        ${formatMoney(
                          verifiedProductsTotal
                        )} EGP
                      </strong>
                    </p>

                    <p style="font-size:18px;color:#1d4ed8;">
                      <strong>
                        Courier collection:
                        ${formatMoney(
                          verifiedDeliveryFee
                        )} EGP
                      </strong>
                    </p>

                    <p style="font-size:20px;">
                      <strong>
                        Final total:
                        ${formatMoney(
                          verifiedTotalPrice
                        )} EGP
                      </strong>
                    </p>
                  </div>
                </div>
              `,
            });

          if (
            adminEmailResult.error
          ) {
            console.error(
              "Admin Resend email error:",
              adminEmailResult.error
            );
          } else {
            adminEmailSent = true;
          }
        } catch (adminEmailError) {
          console.error(
            "Admin Resend email error:",
            adminEmailError
          );
        }
      }

      if (customerEmail) {
        try {
          const customerEmailResult =
            await resend.emails.send({
              from: senderEmail,

              to: customerEmail,

              subject:
                `Your ORVIX order — ${orderNumber}`,

              html: `
                <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111;background:#fff;">
                  <div style="text-align:center;padding:10px 0 24px;">
                    <p style="letter-spacing:5px;font-weight:700;margin:0;">
                      ORVIX
                    </p>

                    <h1 style="margin:24px 0 8px;font-size:30px;">
                      Order Received
                    </h1>

                    <p style="color:#666;line-height:1.6;margin:0;">
                      Thank you, ${safeFullName}. Your order has been received successfully.
                    </p>
                  </div>

                  <div style="background:#111;color:#fff;border-radius:18px;padding:22px;text-align:center;">
                    <p style="color:#aaa;margin:0;font-size:13px;">
                      ORDER NUMBER
                    </p>

                    <p style="font-size:21px;font-weight:700;margin:10px 0 0;word-break:break-word;">
                      ${orderNumber}
                    </p>

                    <p style="color:#aaa;margin:20px 0 0;font-size:13px;">
                      SHIPPING NUMBER
                    </p>

                    <p style="font-size:18px;font-weight:700;margin:10px 0 0;word-break:break-word;">
                      ${safeShippingNumber}
                    </p>
                  </div>

                  <div style="background:#f5f5f5;border-radius:18px;padding:22px;margin-top:18px;">
                    <h2 style="margin-top:0;font-size:20px;">
                      Order summary
                    </h2>

                    <p>
                      <strong>Product:</strong>
                      ${safeProductName}
                    </p>

                    <p>
                      <strong>Colour:</strong>
                      ${safeColour}
                    </p>

                    <p>
                      <strong>Quantity:</strong>
                      ${quantity}
                    </p>

                    <p>
                      <strong>Original products total:</strong>
                      ${formatMoney(
                        originalProductsTotal
                      )} EGP
                    </p>

                    ${
                      verifiedProductDiscount >
                      0
                        ? `
                          <p style="color:#16803a;">
                            <strong>Product discount:</strong>
                            -${formatMoney(
                              verifiedProductDiscount
                            )} EGP
                          </p>
                        `
                        : ""
                    }

                    <p>
                      <strong>Products after discount:</strong>
                      ${formatMoney(
                        verifiedProductsTotal
                      )} EGP
                    </p>

                    <p>
                      <strong>Delivery:</strong>
                      ${
                        verifiedDeliveryFee ===
                        0
                          ? "FREE"
                          : `${formatMoney(
                              verifiedDeliveryFee
                            )} EGP`
                      }
                    </p>

                    ${
                      verifiedDeliveryDiscount >
                      0
                        ? `
                          <p style="color:#16803a;">
                            <strong>Delivery discount:</strong>
                            -${formatMoney(
                              verifiedDeliveryDiscount
                            )} EGP
                          </p>
                        `
                        : ""
                    }

                    ${
                      verifiedDiscountCode
                        ? `
                          <p>
                            <strong>Discount code:</strong>
                            ${safeDiscountCode}
                          </p>
                        `
                        : ""
                    }

                    <div style="border-top:1px solid #ddd;padding-top:16px;margin-top:16px;">
                      <p style="color:#5b21b6;">
                        <strong>
                          InstaPay to ORVIX:
                          ${formatMoney(
                            verifiedProductsTotal
                          )} EGP
                        </strong>
                      </p>

                      <p style="color:#1d4ed8;">
                        <strong>
                          Courier collection:
                          ${formatMoney(
                            verifiedDeliveryFee
                          )} EGP
                        </strong>
                      </p>
                    </div>

                    <p style="font-size:21px;border-top:1px solid #ddd;padding-top:16px;">
                      <strong>
                        Total:
                        ${formatMoney(
                          verifiedTotalPrice
                        )} EGP
                      </strong>
                    </p>
                  </div>

                  <div style="background:#f5f5f5;border-radius:18px;padding:22px;margin-top:18px;">
                    <h2 style="margin-top:0;font-size:20px;">
                      Delivery details
                    </h2>

                    <p>
                      <strong>Governorate:</strong>
                      ${safeGovernorate}
                    </p>

                    <p>
                      <strong>Address:</strong>
                      ${safeAddress}
                    </p>
                  </div>

                  <a
                    href="${safeTrackOrderUrl}"
                    style="display:block;background:#111;color:#fff;text-decoration:none;text-align:center;font-weight:700;border-radius:999px;padding:17px 24px;margin-top:22px;"
                  >
                    Track Your Order
                  </a>

                  <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">
                    © 2026 ORVIX. All rights reserved.
                  </p>
                </div>
              `,
            });

          if (
            customerEmailResult.error
          ) {
            console.error(
              "Customer Resend email error:",
              customerEmailResult.error
            );
          } else {
            customerEmailSent = true;
          }
        } catch (
          customerEmailError
        ) {
          console.error(
            "Customer Resend email error:",
            customerEmailError
          );
        }
      }
    } else {
      console.warn(
        "Order saved, but email was not sent because RESEND_API_KEY is missing."
      );
    }

    return NextResponse.json({
      success: true,

      message:
        "Order placed successfully.",

      orderNumber,
      shippingNumber,

      shippingStatus:
        "ready_to_print",

      labelCreatedAt,

      order: savedOrder,

      product: {
        name: productName,
        slug: productSlug,
      },

      pricing: {
        productPrice,

        originalProductsTotal,

        productsTotal:
          verifiedProductsTotal,

        discountedProductsTotal:
          verifiedProductsTotal,

        originalDeliveryFee,

        productDiscount:
          verifiedProductDiscount,

        deliveryDiscount:
          verifiedDeliveryDiscount,

        totalDiscount:
          verifiedTotalDiscount,

        deliveryFee:
          verifiedDeliveryFee,

        totalPrice:
          verifiedTotalPrice,

        discountCode:
          verifiedDiscountCode ||
          null,

        discountType:
          verifiedDiscountType,

        discountValue:
          verifiedDiscountValue,
      },

      shipping: {
        shippingNumber,

        status:
          "ready_to_print",

        labelCreatedAt,

        printedAt: null,
      },

      email: {
        provided:
          customerEmail.length > 0,

        adminSent:
          adminEmailSent,

        customerSent:
          customerEmailSent,
      },
    });
  } catch (error) {
    console.error(
      "Order API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Could not place your order.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  try {
    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?select=*&order=label_created_at.desc`,
      {
        method: "GET",

        headers: {
          apikey:
            supabaseSecretKey,

          Authorization:
            `Bearer ${supabaseSecretKey}`,
        },

        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Could not load orders:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load orders.",
        },
        {
          status: 500,
        }
      );
    }

    const orders =
      await response.json();

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Orders GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Could not load orders.",
      },
      {
        status: 500,
      }
    );
  }
}