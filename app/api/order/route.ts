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
    name:
      "Upper Egypt and Red Sea",
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

  customerEmail?:
    | string
    | null;

  governorate?: string;
  address?: string;
  notes?: string;

  colour?: string;
  quantity?: number;

  discountCode?:
    | string
    | null;
};

type DiscountRow = {
  id: number;
  code: string;

  discount_type: string;
  discount_value: number;

  usage_limit:
    | number
    | null;

  times_used: number;

  active: boolean;

  expires_at:
    | string
    | null;
};

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function createOrderNumber() {
  const randomPart =
    Math.floor(
      1000 +
        Math.random() * 9000
    );

  return `ORVIX-${Date.now()}-${randomPart}`;
}

function createShippingNumber() {
  const randomPart =
    Math.floor(
      1000 +
        Math.random() * 9000
    );

  return `SHIP-${Date.now()}-${randomPart}`;
}

function normaliseDiscountType(
  value: string
): DiscountType | null {
  const cleanValue =
    String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll("-", "_")
      .replaceAll(" ", "_");

  if (
    cleanValue ===
      "free_delivery" ||
    cleanValue ===
      "free_shipping" ||
    cleanValue ===
      "delivery" ||
    cleanValue ===
      "shipping"
  ) {
    return "free_delivery";
  }

  if (
    cleanValue ===
      "fixed_amount" ||
    cleanValue === "fixed" ||
    cleanValue === "amount" ||
    cleanValue === "cash" ||
    cleanValue === "money"
  ) {
    return "fixed_amount";
  }

  if (
    cleanValue ===
      "percentage" ||
    cleanValue === "percent" ||
    cleanValue ===
      "percentage_off"
  ) {
    return "percentage";
  }

  return null;
}

async function findDiscountCode(
  code: string
): Promise<
  DiscountRow | null
> {
  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    return null;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/delivery_discount_codes?code=eq.${encodeURIComponent(
      code
    )}&select=*`,
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

  if (
    discount.expires_at &&
    new Date(
      discount.expires_at
    ).getTime() < Date.now()
  ) {
    return "This discount code has expired.";
  }

  if (
    discount.usage_limit !==
      null &&
    Number(
      discount.times_used
    ) >=
      Number(
        discount.usage_limit
      )
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

  const discountValue =
    Number(
      discount.discount_value
    );

  if (
    discountType ===
      "fixed_amount" &&
    (!Number.isFinite(
      discountValue
    ) ||
      discountValue <= 0)
  ) {
    return "This discount code has an invalid discount amount.";
  }

  if (
    discountType ===
      "percentage" &&
    (!Number.isFinite(
      discountValue
    ) ||
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

  const response = await fetch(
    `${supabaseUrl}/rest/v1/delivery_discount_codes?id=eq.${discount.id}`,
    {
      method: "PATCH",

      headers: {
        apikey:
          supabaseSecretKey,

        Authorization:
          `Bearer ${supabaseSecretKey}`,

        "Content-Type":
          "application/json",

        Prefer:
          "return=minimal",
      },

      body: JSON.stringify({
        times_used:
          Number(
            discount.times_used
          ) + 1,
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

    const fullName =
      String(
        order.fullName ?? ""
      ).trim();

    const phone =
      String(
        order.phone ?? ""
      ).trim();

    const customerEmail =
      String(
        order.customerEmail ??
          ""
      )
        .trim()
        .toLowerCase();

    const governorate =
      String(
        order.governorate ??
          ""
      ).trim();

    const address =
      String(
        order.address ?? ""
      ).trim();

    const notes =
      String(
        order.notes ?? ""
      ).trim() || "No notes";

    const colour =
      String(
        order.colour ?? ""
      ).trim();

    const quantity =
      Number(order.quantity);

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
      !isValidEmail(
        customerEmail
      )
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
      !Number.isInteger(
        quantity
      ) ||
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
          area.name ===
          governorate
      );

    if (
      !selectedDeliveryArea
    ) {
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
      بيانات المنتج من السيرفر
      علشان العميل ما يقدرش
      يغير السعر من المتصفح.
    */
    const productName =
      PRODUCT_NAME;

    const productSlug =
      PRODUCT_SLUG;

    const productPrice =
      PRODUCT_PRICE;

    /*
      إجمالي المنتجات قبل الخصم.
    */
    const originalProductsTotal =
      productPrice * quantity;

    /*
      مصاريف الشحن قبل الخصم.
    */
    const originalDeliveryFee =
      selectedDeliveryArea.fee;

    let verifiedProductDiscount =
      0;

    let verifiedDeliveryDiscount =
      0;

    /*
      إجمالي المنتجات بعد الخصم.
    */
    let verifiedProductsTotal =
      originalProductsTotal;

    /*
      الشحن بعد الخصم.
    */
    let verifiedDeliveryFee =
      originalDeliveryFee;

    let verifiedDiscountCode =
      "";

    let verifiedDiscountType:
      | DiscountType
      | null = null;

    let verifiedDiscountValue =
      0;

    let verifiedDiscount:
      | DiscountRow
      | null = null;

    const submittedDiscountCode =
      String(
        order.discountCode ??
          ""
      )
        .trim()
        .toUpperCase();

    if (
      submittedDiscountCode
    ) {
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
        validateDiscount(
          discount
        );

      if (discountError) {
        return NextResponse.json(
          {
            success: false,

            message:
              discountError,
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

      const discountValue =
        Math.max(
          Number(
            discount.discount_value
          ) || 0,
          0
        );

      verifiedDiscount =
        discount;

      verifiedDiscountCode =
        String(
          discount.code
        )
          .trim()
          .toUpperCase();

      verifiedDiscountType =
        discountType;

      verifiedDiscountValue =
        discountValue;

      /*
        خصم شحن مجاني.
      */
      if (
        discountType ===
        "free_delivery"
      ) {
        verifiedDeliveryDiscount =
          originalDeliveryFee;

        verifiedDeliveryFee =
          0;
      }

      /*
        خصم مبلغ ثابت
        على قيمة المنتجات.
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
        خصم نسبة مئوية
        على قيمة المنتجات.
      */
      if (
        discountType ===
        "percentage"
      ) {
        verifiedProductDiscount =
          Math.min(
            Math.round(
              originalProductsTotal *
                (discountValue /
                  100)
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
              customerEmail ||
              null,

            governorate,
            address,
            notes,
            colour,
            quantity,

            product_price:
              productPrice,

            /*
              أهم تعديل:

              نسجل قيمة المنتجات
              بعد الخصم، مش السعر الأصلي.

              ده هو الرقم اللي هيظهر
              في ORVIX InstaPay
              داخل الـDashboard والبوليصة.
            */
            products_total:
              verifiedProductsTotal,

            /*
              المندوب يحصل الشحن
              بعد خصم الشحن المجاني.
            */
            delivery_fee:
              verifiedDeliveryFee,

            /*
              إجمالي الخصومات:
              خصم المنتج + خصم الشحن.
            */
            discount_amount:
              verifiedTotalDiscount,

            /*
              الإجمالي النهائي:
              المنتجات بعد الخصم
              + الشحن بعد الخصم.
            */
            total_price:
              verifiedTotalPrice,

            status: "new",
          }),
        }
      );

    if (
      !supabaseResponse.ok
    ) {
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
      Array.isArray(
        savedOrders
      ) &&
      savedOrders.length > 0
        ? savedOrders[0]
        : null;

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

    const requestOrigin =
      new URL(
        request.url
      ).origin;

    const trackOrderUrl =
      `${requestOrigin}/track-order?orderNumber=` +
      encodeURIComponent(
        orderNumber
      );

    const safeProductName =
      escapeHtml(
        productName
      );

    const safeFullName =
      escapeHtml(
        fullName
      );

    const safePhone =
      escapeHtml(phone);

    const safeCustomerEmail =
      customerEmail
        ? escapeHtml(
            customerEmail
          )
        : "Not provided";

    const safeGovernorate =
      escapeHtml(
        governorate
      );

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
      escapeHtml(
        trackOrderUrl
      );

    const safeShippingNumber =
      escapeHtml(
        shippingNumber
      );

    const notificationEmail =
      process.env
        .ORDER_NOTIFICATION_EMAIL ||
      process.env
        .RESEND_TO_EMAIL;

    const senderEmail =
      process.env
        .RESEND_FROM_EMAIL ||
      "ORVIX Orders <onboarding@resend.dev>";

    let adminEmailSent =
      false;

    let customerEmailSent =
      false;

    if (resend) {
      if (
        notificationEmail
      ) {
        try {
          const adminEmailResult =
            await resend.emails.send(
              {
                from: senderEmail,

                to:
                  notificationEmail,

                subject:
                  `New ORVIX order — ${orderNumber}`,

                html: `
                  <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111;">
                    <h1 style="margin-bottom:8px;">
                      New ORVIX Order
                    </h1>

                    <p style="color:#666;margin-top:0;">
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
                        ${productPrice.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      <p>
                        <strong>Original products total:</strong>
                        ${originalProductsTotal.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      ${
                        verifiedProductDiscount >
                        0
                          ? `
                            <p style="color:#16803a;">
                              <strong>Product discount:</strong>
                              -${verifiedProductDiscount.toLocaleString(
                                "en-GB"
                              )} EGP
                            </p>
                          `
                          : ""
                      }

                      <p>
                        <strong>Products total after discount:</strong>
                        ${verifiedProductsTotal.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      <p>
                        <strong>Original delivery:</strong>
                        ${originalDeliveryFee.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      ${
                        verifiedDeliveryDiscount >
                        0
                          ? `
                            <p style="color:#16803a;">
                              <strong>Delivery discount:</strong>
                              -${verifiedDeliveryDiscount.toLocaleString(
                                "en-GB"
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
                            : `${verifiedDeliveryFee.toLocaleString(
                                "en-GB"
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
                        <strong>Discount value:</strong>
                        ${verifiedDiscountValue.toLocaleString(
                          "en-GB"
                        )}
                      </p>

                      <p>
                        <strong>Total discount:</strong>
                        ${verifiedTotalDiscount.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      <p style="font-size:18px;color:#5b21b6;">
                        <strong>
                          InstaPay to ORVIX:
                          ${verifiedProductsTotal.toLocaleString(
                            "en-GB"
                          )} EGP
                        </strong>
                      </p>

                      <p style="font-size:18px;color:#1d4ed8;">
                        <strong>
                          Courier collection:
                          ${verifiedDeliveryFee.toLocaleString(
                            "en-GB"
                          )} EGP
                        </strong>
                      </p>

                      <p style="font-size:20px;">
                        <strong>
                          Final total:
                          ${verifiedTotalPrice.toLocaleString(
                            "en-GB"
                          )} EGP
                        </strong>
                      </p>
                    </div>
                  </div>
                `,
              }
            );

          if (
            adminEmailResult.error
          ) {
            console.error(
              "Admin Resend email error:",
              adminEmailResult.error
            );
          } else {
            adminEmailSent =
              true;
          }
        } catch (
          adminEmailError
        ) {
          console.error(
            "Admin Resend email error:",
            adminEmailError
          );
        }
      }

      if (customerEmail) {
        try {
          const customerEmailResult =
            await resend.emails.send(
              {
                from: senderEmail,

                to:
                  customerEmail,

                subject:
                  `Your ORVIX order — ${orderNumber}`,

                html: `
                  <div style="font-family:Arial,sans-serif;max-width:650px;margin:0 auto;padding:24px;color:#111;background:#ffffff;">
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
                        ${originalProductsTotal.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      ${
                        verifiedProductDiscount >
                        0
                          ? `
                            <p style="color:#16803a;">
                              <strong>Product discount:</strong>
                              -${verifiedProductDiscount.toLocaleString(
                                "en-GB"
                              )} EGP
                            </p>
                          `
                          : ""
                      }

                      <p>
                        <strong>Products after discount:</strong>
                        ${verifiedProductsTotal.toLocaleString(
                          "en-GB"
                        )} EGP
                      </p>

                      <p>
                        <strong>Delivery:</strong>
                        ${
                          verifiedDeliveryFee ===
                          0
                            ? "FREE"
                            : `${verifiedDeliveryFee.toLocaleString(
                                "en-GB"
                              )} EGP`
                        }
                      </p>

                      ${
                        verifiedDeliveryDiscount >
                        0
                          ? `
                            <p style="color:#16803a;">
                              <strong>Delivery discount:</strong>
                              -${verifiedDeliveryDiscount.toLocaleString(
                                "en-GB"
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
                            ${verifiedProductsTotal.toLocaleString(
                              "en-GB"
                            )} EGP
                          </strong>
                        </p>

                        <p style="color:#1d4ed8;">
                          <strong>
                            Courier collection:
                            ${verifiedDeliveryFee.toLocaleString(
                              "en-GB"
                            )} EGP
                          </strong>
                        </p>
                      </div>

                      <p style="font-size:21px;border-top:1px solid #ddd;padding-top:16px;margin-bottom:0;">
                        <strong>
                          Total:
                          ${verifiedTotalPrice.toLocaleString(
                            "en-GB"
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

                    <p style="color:#777;font-size:13px;line-height:1.6;text-align:center;margin-top:24px;">
                      Keep your order number. You will need it with the phone number used during checkout to track your order.
                    </p>

                    <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">
                      © 2026 ORVIX. All rights reserved.
                    </p>
                  </div>
                `,
              }
            );

          if (
            customerEmailResult.error
          ) {
            console.error(
              "Customer Resend email error:",
              customerEmailResult.error
            );
          } else {
            customerEmailSent =
              true;
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

        /*
          السعر الأصلي قبل الخصم.
        */
        originalProductsTotal,

        /*
          السعر الذي سيظهر في
          ORVIX InstaPay.
        */
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

        /*
          المبلغ الذي سيحصله المندوب.
        */
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
          customerEmail.length >
          0,

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
          error instanceof
          Error
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
          error instanceof
          Error
            ? error.message
            : "Could not load orders.",
      },
      {
        status: 500,
      }
    );
  }
}