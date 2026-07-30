import {
  NextRequest,
  NextResponse,
} from "next/server";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function normalisePhone(value: string) {
  return value.replace(/\D/g, "");
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

    const duplicateFilters: string[] = [];

    if (email) {
      duplicateFilters.push(
        `email.eq.${encodeURIComponent(email)}`
      );
    }

    if (phone) {
      duplicateFilters.push(
        `phone.eq.${encodeURIComponent(phone)}`
      );
    }

    if (duplicateFilters.length > 0) {
      const duplicateResponse = await fetch(
        `${supabaseUrl}/rest/v1/product_waitlist?product_slug=eq.garmin-cirqa&or=(${duplicateFilters.join(
          ","
        )})&select=id&limit=1`,
        {
          headers: {
            apikey: supabaseSecretKey,
            Authorization: `Bearer ${supabaseSecretKey}`,
            "Content-Type":
              "application/json",
          },
          cache: "no-store",
        }
      );

      if (duplicateResponse.ok) {
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
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/product_waitlist`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
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
          colour,
          size,
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