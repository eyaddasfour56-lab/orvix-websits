import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  ANALYTICS_EXCLUSION_COOKIE,
  createAdminSession,
  createAnalyticsExclusion,
} from "@/lib/admin-auth";

const ADMIN_SESSION_MAX_AGE =
  60 * 60 * 24 * 7;
const ANALYTICS_EXCLUSION_MAX_AGE =
  60 * 60 * 24 * 365;

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
      ADMIN_SESSION_COOKIE,
      createAdminSession(sessionSecret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: ADMIN_SESSION_MAX_AGE,
      }
    );

    response.cookies.set(
      ANALYTICS_EXCLUSION_COOKIE,
      createAnalyticsExclusion(
        sessionSecret
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge:
          ANALYTICS_EXCLUSION_MAX_AGE,
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
