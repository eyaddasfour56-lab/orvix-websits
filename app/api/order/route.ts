import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type OrderData = {
  fullName: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  colour: string;
  quantity: number;
  productPrice: number;
  deliveryFee: number;
  totalPrice: number;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "RESEND_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const order = (await request.json()) as OrderData;

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
          message: "Please complete all required order details.",
        },
        { status: 400 }
      );
    }

    const fullName = escapeHtml(String(order.fullName));
    const phone = escapeHtml(String(order.phone));
    const governorate = escapeHtml(String(order.governorate));
    const address = escapeHtml(String(order.address));
    const notes = escapeHtml(String(order.notes || "No notes"));
    const colour = escapeHtml(String(order.colour));

    const quantity = Number(order.quantity);
    const productPrice = Number(order.productPrice);
    const deliveryFee = Number(order.deliveryFee);
    const totalPrice = Number(order.totalPrice);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(productPrice) ||
      !Number.isFinite(deliveryFee) ||
      !Number.isFinite(totalPrice) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order prices or quantity.",
        },
        { status: 400 }
      );
    }

    const orderNumber = `ORVIX-${Date.now()}`;

    const { data, error } = await resend.emails.send({
      from: "ORVIX Orders <onboarding@resend.dev>",
      to: ["eyadd.asfour56@gmail.com"],
      subject: `New ORVIX Order — ${orderNumber}`,
      html: `
        <div
          style="
            margin: 0;
            padding: 32px;
            background-color: #f4f4f5;
            font-family: Arial, sans-serif;
            color: #111111;
          "
        >
          <div
            style="
              max-width: 650px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 20px;
              overflow: hidden;
            "
          >
            <div
              style="
                padding: 28px;
                background-color: #000000;
                color: #ffffff;
              "
            >
              <h1 style="margin: 0; font-size: 28px;">
                New ORVIX Order
              </h1>

              <p
                style="
                  margin: 10px 0 0;
                  color: #d4d4d8;
                "
              >
                Order number: ${orderNumber}
              </p>
            </div>

            <div style="padding: 28px;">
              <h2
                style="
                  margin-top: 0;
                  font-size: 20px;
                "
              >
                Customer details
              </h2>

              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 28px;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      font-weight: bold;
                    "
                  >
                    Full name
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      text-align: right;
                    "
                  >
                    ${fullName}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      font-weight: bold;
                    "
                  >
                    Phone
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      text-align: right;
                    "
                  >
                    ${phone}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      font-weight: bold;
                    "
                  >
                    Delivery area
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      text-align: right;
                    "
                  >
                    ${governorate}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      font-weight: bold;
                    "
                  >
                    Address
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      text-align: right;
                    "
                  >
                    ${address}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      font-weight: bold;
                    "
                  >
                    Notes
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      border-bottom: 1px solid #e5e7eb;
                      text-align: right;
                    "
                  >
                    ${notes}
                  </td>
                </tr>
              </table>

              <h2 style="font-size: 20px;">
                Order details
              </h2>

              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                "
              >
                <tr>
                  <td style="padding: 10px 0;">
                    Product
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      text-align: right;
                    "
                  >
                    Google Fitbit Air
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0;">
                    Colour
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      text-align: right;
                    "
                  >
                    ${colour}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0;">
                    Quantity
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      text-align: right;
                    "
                  >
                    ${quantity}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0;">
                    Products total
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      text-align: right;
                    "
                  >
                    ${(productPrice * quantity).toLocaleString("en-GB")} EGP
                  </td>
                </tr>

                <tr>
                  <td style="padding: 10px 0;">
                    Delivery fee
                  </td>

                  <td
                    style="
                      padding: 10px 0;
                      text-align: right;
                    "
                  >
                    ${deliveryFee.toLocaleString("en-GB")} EGP
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 16px 0 0;
                      border-top: 2px solid #111111;
                      font-size: 20px;
                      font-weight: bold;
                    "
                  >
                    Final total
                  </td>

                  <td
                    style="
                      padding: 16px 0 0;
                      border-top: 2px solid #111111;
                      text-align: right;
                      font-size: 20px;
                      font-weight: bold;
                    "
                  >
                    ${totalPrice.toLocaleString("en-GB")} EGP
                  </td>
                </tr>
              </table>

              <p
                style="
                  margin: 28px 0 0;
                  padding: 16px;
                  border-radius: 12px;
                  background-color: #f4f4f5;
                  text-align: center;
                "
              >
                Payment method: Cash on delivery
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);

      return NextResponse.json(
        {
          success: false,
          message: error.message || "The order email could not be sent.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderNumber,
        emailId: data?.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Order API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while sending the order.",
      },
      { status: 500 }
    );
  }
}