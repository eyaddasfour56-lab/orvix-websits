import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase settings are missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const page = String(body.page || "/").slice(0, 200);

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_views`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          page,
          ip_address: ipAddress,
          user_agent: userAgent,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("View saving error:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: "Could not record view.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("View API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not record view.",
      },
      { status: 500 }
    );
  }
}