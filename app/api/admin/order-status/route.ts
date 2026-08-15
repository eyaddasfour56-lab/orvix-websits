import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

function createAdminSession(
  secret: string
) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(
  request: NextRequest
) {
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET;

  const receivedSession =
    request.cookies.get(
      "orvix_admin_session"
    )?.value;

  if (
    !sessionSecret ||
    !receivedSession
  ) {
    return false;
  }

  const expectedSession =
    createAdminSession(sessionSecret);

  const receivedBuffer = Buffer.from(
    receivedSession
  );

  const expectedBuffer = Buffer.from(
    expectedSession
  );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    )
  );
}

const allowedStatuses = [
  "new",
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export async function PATCH(
  request: NextRequest
) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

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

    const orderId = String(
      body.orderId || ""
    ).trim();

    const status = String(
      body.status || ""
    )
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("-", "_");

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid order status.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(
        orderId
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status,
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Order status Supabase error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not update order status.",
          details:
            process.env.NODE_ENV ===
            "development"
              ? errorText
              : undefined,
        },
        {
          status: 500,
        }
      );
    }

    const updatedOrders =
      await response.json();

    if (
      !Array.isArray(updatedOrders) ||
      updatedOrders.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Order status updated successfully.",
      order: updatedOrders[0],
    });
  } catch (error) {
    console.error(
      "Order status API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update order status.",
      },
      {
        status: 500,
      }
    );
  }
}