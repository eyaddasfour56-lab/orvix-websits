import {
  NextRequest,
  NextResponse,
} from "next/server";

import { Resend } from "resend";

const resendApiKey =
  process.env.RESEND_API_KEY;

const resend = resendApiKey
  ? new Resend(resendApiKey)
  : null;

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL;

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "ORVIX Waitlist <onboarding@resend.dev>";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function normalisePhone(value: string) {
  return value.replace(/\D/g, "");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type WaitlistEmailData = {
  customerName: string;
  email: string;
  phone: string;
  colour: string;
  size: string;
};

async function sendWaitlistNotificationEmail(
  data: WaitlistEmailData
) {
  if (!resend) {
    console.warn(
      "Waitlist email skipped: RESEND_API_KEY is missing."
    );

    return;
  }

  if (!ADMIN_EMAIL) {
    console.warn(
      "Waitlist email skipped: ADMIN_EMAIL is missing."
    );

    return;
  }

  const safeCustomerName =
    escapeHtml(data.customerName);

  const safeEmail = escapeHtml(
    data.email || "Not provided"
  );

  const safePhone = escapeHtml(
    data.phone || "Not provided"
  );

  const safeColour = escapeHtml(
    data.colour || "Not selected"
  );

  const safeSize = escapeHtml(
    data.size || "Not selected"
  );

  const emailResult =
    await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `New Garmin CIRQA Waitlist Entry - ${data.customerName}`,
      text: `
New Garmin CIRQA Waitlist Entry

Name: ${data.customerName}
Email: ${data.email || "Not provided"}
Phone: ${data.phone || "Not provided"}
Colour: ${data.colour || "Not selected"}
Size: ${data.size || "Not selected"}

This message was sent automatically from ORVIX.
      `.trim(),
      html: `
        <div
          style="
            margin: 0;
            padding: 32px 16px;
            background-color: #050505;
            font-family: Arial, Helvetica, sans-serif;
            color: #ffffff;
          "
        >
          <div
            style="
              max-width: 600px;
              margin: 0 auto;
              padding: 30px;
              background-color: #111111;
              border: 1px solid #292929;
              border-radius: 18px;
            "
          >
            <div
              style="
                margin-bottom: 24px;
                padding-bottom: 20px;
                border-bottom: 1px solid #292929;
              "
            >
              <p
                style="
                  margin: 0 0 8px;
                  color: #999999;
                  font-size: 13px;
                  font-weight: 700;
                  letter-spacing: 2px;
                "
              >
                ORVIX
              </p>

              <h1
                style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 26px;
                  line-height: 1.3;
                "
              >
                New Waitlist Entry
              </h1>

              <p
                style="
                  margin: 10px 0 0;
                  color: #aaaaaa;
                  font-size: 15px;
                "
              >
                A new customer joined the Garmin CIRQA waiting list.
              </p>
            </div>

            <table
              style="
                width: 100%;
                border-collapse: collapse;
                font-size: 15px;
              "
            >
              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Name
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    font-weight: 700;
                    text-align: right;
                    border-bottom: 1px solid #242424;
                  "
                >
                  ${safeCustomerName}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Email
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    text-align: right;
                    border-bottom: 1px solid #242424;
                  "
                >
                  ${safeEmail}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Phone
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    text-align: right;
                    border-bottom: 1px solid #242424;
                  "
                >
                  ${safePhone}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Product
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    text-align: right;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Garmin CIRQA
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                    border-bottom: 1px solid #242424;
                  "
                >
                  Colour
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    text-align: right;
                    border-bottom: 1px solid #242424;
                  "
                >
                  ${safeColour}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding: 13px 0;
                    color: #888888;
                  "
                >
                  Size
                </td>

                <td
                  style="
                    padding: 13px 0;
                    color: #ffffff;
                    text-align: right;
                  "
                >
                  ${safeSize}
                </td>
              </tr>
            </table>

            <p
              style="
                margin: 28px 0 0;
                color: #666666;
                font-size: 12px;
                text-align: center;
              "
            >
              This notification was sent automatically from ORVIX.
            </p>
          </div>
        </div>
      `,
    });

  if (emailResult.error) {
    throw new Error(
      `Resend error: ${emailResult.error.message}`
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase settings are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const customerName = String(
      body.customerName || ""
    ).trim();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const phone = String(
      body.phone || ""
    ).trim();

    const colour = String(
      body.colour || ""
    ).trim();

    const size = String(
      body.size || ""
    ).trim();

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your name.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your email or phone number.",
        },
        {
          status: 400,
        }
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      phone &&
      normalisePhone(phone).length < 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid phone number.",
        },
        {
          status: 400,
        }
      );
    }

    const duplicateFilters: string[] =
      [];

    if (email) {
      duplicateFilters.push(
        `email.eq.${encodeURIComponent(
          email
        )}`
      );
    }

    if (phone) {
      duplicateFilters.push(
        `phone.eq.${encodeURIComponent(
          phone
        )}`
      );
    }

    if (duplicateFilters.length > 0) {
      const duplicateUrl =
        `${supabaseUrl}/rest/v1/product_waitlist` +
        `?product_slug=eq.garmin-cirqa` +
        `&or=(${duplicateFilters.join(
          ","
        )})` +
        `&select=id` +
        `&limit=1`;

      const duplicateResponse =
        await fetch(duplicateUrl, {
          method: "GET",
          headers: {
            apikey: supabaseSecretKey,
            Authorization:
              `Bearer ${supabaseSecretKey}`,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        });

      if (!duplicateResponse.ok) {
        const duplicateError =
          await duplicateResponse.text();

        console.error(
          "Waitlist duplicate check error:",
          duplicateError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Could not check the notification list.",
          },
          {
            status: 500,
          }
        );
      }

      const existingEntries =
        await duplicateResponse.json();

      if (
        Array.isArray(existingEntries) &&
        existingEntries.length > 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are already on the Garmin CIRQA notification list.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/product_waitlist`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization:
            `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          product_name: "Garmin CIRQA",
          product_slug: "garmin-cirqa",
          customer_name: customerName,
          email: email || null,
          phone: phone || null,
          colour: colour || null,
          size: size || null,
          status: "waiting",
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Waitlist Supabase error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not join the notification list.",
        },
        {
          status: 500,
        }
      );
    }

    const createdEntries =
      await response.json();

    try {
      await sendWaitlistNotificationEmail({
        customerName,
        email,
        phone,
        colour,
        size,
      });

      console.log(
        "Waitlist notification email sent successfully."
      );
    } catch (emailError) {
      console.error(
        "Waitlist notification email error:",
        emailError
      );

      // العميل يفضل متسجل حتى لو إرسال الإيميل فشل.
    }

    return NextResponse.json({
      success: true,
      message:
        "You are on the list! We will notify you when Garmin CIRQA becomes available.",
      entry:
        createdEntries[0] || null,
    });
  } catch (error) {
    console.error(
      "Waitlist API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not join the notification list.",
      },
      {
        status: 500,
      }
    );
  }
}