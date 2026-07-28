import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!adminPassword || !sessionSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin settings are missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const submittedPassword = String(body.password || "");

    const submittedBuffer = Buffer.from(submittedPassword);
    const passwordBuffer = Buffer.from(adminPassword);

    const passwordMatches =
      submittedBuffer.length === passwordBuffer.length &&
      timingSafeEqual(submittedBuffer, passwordBuffer);

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect password.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set(
      "orvix_admin_session",
      createAdminSession(sessionSecret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not log in.",
      },
      { status: 500 }
    );
  }
}