import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ANALYTICS_EXCLUSION_COOKIE,
  AdminRole,
  createAdminRoleCookie,
  createAdminSession,
  createAnalyticsExclusion,
} from "@/lib/admin-auth";

const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const ANALYTICS_EXCLUSION_MAX_AGE = 60 * 60 * 24 * 365;

function matches(submitted: string, configured?: string) {
  if (!configured) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const ownerPassword = process.env.ADMIN_PASSWORD;
    const managerPassword = process.env.ADMIN_MANAGER_PASSWORD;
    const ordersPassword = process.env.ADMIN_ORDERS_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!ownerPassword || !sessionSecret) {
      return NextResponse.json(
        { success: false, message: "Admin settings are missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const submittedPassword = String(body.password || "");

    let role: AdminRole | null = null;
    if (matches(submittedPassword, ownerPassword)) role = "owner";
    else if (matches(submittedPassword, managerPassword)) role = "manager";
    else if (matches(submittedPassword, ordersPassword)) role = "orders";

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Incorrect password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, role });

    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(sessionSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    response.cookies.set(ADMIN_ROLE_COOKIE, createAdminRoleCookie(sessionSecret, role), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    response.cookies.set(
      ANALYTICS_EXCLUSION_COOKIE,
      createAnalyticsExclusion(sessionSecret),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: ANALYTICS_EXCLUSION_MAX_AGE,
      }
    );

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { success: false, message: "Could not log in." },
      { status: 500 }
    );
  }
}
