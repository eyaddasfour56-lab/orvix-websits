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

export async function GET(request: NextRequest) {
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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_views?select=id,created_at`,
      {
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Admin views Supabase error:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: "Could not load website views.",
        },
        { status: 500 }
      );
    }

    const views = await response.json();

    const today = new Date().toDateString();

    const viewsToday = views.filter(
      (view: { created_at: string }) =>
        new Date(view.created_at).toDateString() === today
    ).length;

    return NextResponse.json({
      success: true,
      totalViews: views.length,
      viewsToday,
    });
  } catch (error) {
    console.error("Admin views API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not load website views.",
      },
      { status: 500 }
    );
  }
}