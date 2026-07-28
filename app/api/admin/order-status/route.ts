import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const receivedSession =
    request.cookies.get("orvix_admin_session")?.value;

  if (!sessionSecret || !receivedSession) {
    return false;
  }

  const expectedSession = createAdminSession(sessionSecret);

  const receivedBuffer = Buffer.from(receivedSession);
  const expectedBuffer = Buffer.from(expectedSession);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

const allowedStatuses = [
  "new",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export async function PATCH(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase settings are missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const orderId = String(body.orderId || "");
    const status = String(body.status || "").toLowerCase();

    if (!orderId || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid order or status.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Order status Supabase error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message: "Could not update order status.",
        },
        { status: 500 }
      );
    }

    const updatedOrders = await response.json();

    return NextResponse.json({
      success: true,
      order: updatedOrders[0] || null,
    });
  } catch (error) {
    console.error("Order status API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not update order status.",
      },
      { status: 500 }
    );
  }
}