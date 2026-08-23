import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ANALYTICS_EXCLUSION_COOKIE,
  AdminRole,
  createAdminRoleCookie,
  createAdminSession,
  createAnalyticsExclusion,
} from "@/lib/admin-auth";
import { adminLoginOtpEmail } from "@/lib/email-templates";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import { sendOrvixEmail, transactionalEmailSenderReady } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
const ANALYTICS_EXCLUSION_MAX_AGE = 60 * 60 * 24 * 365;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

type LoginChallenge = {
  id: string;
  role: AdminRole;
  otp_hash: string;
  ip_hash?: string | null;
  attempts: number;
  expires_at: string;
  used_at?: string | null;
};

function matches(submitted: string, configured?: string) {
  if (!configured) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(configured);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function otpHash(secret: string, challengeId: string, otp: string) {
  return createHmac("sha256", secret).update(`${challengeId}:${otp}`).digest("hex");
}

function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

async function takeRateLimit(key: string, limit: number, seconds: number) {
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: seconds }),
  });
}

function twoFactorEmail(role: AdminRole) {
  if (process.env.ADMIN_2FA_ENABLED === "false") return "";
  const roleEmail =
    role === "owner"
      ? process.env.ADMIN_OWNER_2FA_EMAIL
      : role === "manager"
        ? process.env.ADMIN_MANAGER_2FA_EMAIL
        : process.env.ADMIN_ORDERS_2FA_EMAIL;
  return String(roleEmail || process.env.ADMIN_2FA_EMAIL || (role === "owner" ? process.env.ORDER_NOTIFICATION_EMAIL : "") || "").trim();
}

function issueSession(role: AdminRole, sessionSecret: string) {
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
  response.cookies.set(ANALYTICS_EXCLUSION_COOKIE, createAnalyticsExclusion(sessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ANALYTICS_EXCLUSION_MAX_AGE,
  });

  return response;
}

async function verifyChallenge(request: NextRequest, sessionSecret: string, challengeId: string, otp: string) {
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ success: false, message: "Enter the valid 6-digit code." }, { status: 400 });
  }

  const ipHash = hash(requestIp(request));
  const allowed = await takeRateLimit(`admin-otp:${ipHash.slice(0, 32)}`, 12, 15 * 60);
  if (!allowed) return NextResponse.json({ success: false, message: "Too many attempts. Please wait before trying again." }, { status: 429 });

  const rows = await supabaseAdminJson<LoginChallenge[]>(
    `admin_login_challenges?id=eq.${postgrestValue(challengeId)}&select=id,role,otp_hash,ip_hash,attempts,expires_at,used_at&limit=1`
  );
  const challenge = rows[0];
  const expired = !challenge || Boolean(challenge.used_at) || new Date(challenge.expires_at).getTime() <= Date.now();
  if (expired || Number(challenge.attempts || 0) >= MAX_OTP_ATTEMPTS || (challenge.ip_hash && challenge.ip_hash !== ipHash)) {
    return NextResponse.json({ success: false, message: "This code is invalid or expired. Start again." }, { status: 401 });
  }

  const secret = process.env.ADMIN_2FA_SECRET || sessionSecret;
  const expected = otpHash(secret, challenge.id, otp);
  if (!matches(expected, challenge.otp_hash)) {
    const attempts = Number(challenge.attempts || 0) + 1;
    await supabaseAdminJson(`admin_login_challenges?id=eq.${postgrestValue(challenge.id)}&used_at=is.null`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ attempts, used_at: attempts >= MAX_OTP_ATTEMPTS ? new Date().toISOString() : null }),
    });
    return NextResponse.json({ success: false, message: "Incorrect verification code." }, { status: 401 });
  }

  const consumed = await supabaseAdminJson<Array<{ id: string }>>(
    `admin_login_challenges?id=eq.${postgrestValue(challenge.id)}&used_at=is.null&expires_at=gt.${postgrestValue(new Date().toISOString())}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    }
  );
  if (!consumed.length) return NextResponse.json({ success: false, message: "This code is no longer available. Start again." }, { status: 409 });

  return issueSession(challenge.role, sessionSecret);
}

export async function POST(request: NextRequest) {
  try {
    const ownerPassword = process.env.ADMIN_PASSWORD;
    const managerPassword = process.env.ADMIN_MANAGER_PASSWORD;
    const ordersPassword = process.env.ADMIN_ORDERS_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!ownerPassword || !sessionSecret) {
      return NextResponse.json({ success: false, message: "Admin settings are missing." }, { status: 500 });
    }

    const body = (await request.json()) as { password?: unknown; challengeId?: unknown; otp?: unknown };
    const challengeId = String(body.challengeId || "").trim();
    const otp = String(body.otp || "").trim();
    if (challengeId || otp) return verifyChallenge(request, sessionSecret, challengeId, otp);

    const ipHash = hash(requestIp(request));
    const allowed = await takeRateLimit(`admin-login:${ipHash.slice(0, 32)}`, 8, 15 * 60);
    if (!allowed) return NextResponse.json({ success: false, message: "Too many login attempts. Please wait before trying again." }, { status: 429 });

    const submittedPassword = String(body.password || "");
    let role: AdminRole | null = null;
    if (matches(submittedPassword, ownerPassword)) role = "owner";
    else if (matches(submittedPassword, managerPassword)) role = "manager";
    else if (matches(submittedPassword, ordersPassword)) role = "orders";

    if (!role) return NextResponse.json({ success: false, message: "Incorrect password." }, { status: 401 });

    const email = twoFactorEmail(role);
    const twoFactorReady = Boolean(email && process.env.RESEND_API_KEY && transactionalEmailSenderReady());
    if (!twoFactorReady) return issueSession(role, sessionSecret);

    const id = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000).toISOString();
    const secret = process.env.ADMIN_2FA_SECRET || sessionSecret;
    await supabaseAdminJson("admin_login_challenges", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id, role, otp_hash: otpHash(secret, id, code), ip_hash: ipHash, expires_at: expiresAt }),
    });

    try {
      const content = adminLoginOtpEmail({ otp: code, expiresInMinutes: OTP_EXPIRY_MINUTES });
      await sendOrvixEmail({ to: email, ...content, idempotencyKey: `admin-login-${id}` });
    } catch (error) {
      await supabaseAdminJson(`admin_login_challenges?id=eq.${postgrestValue(id)}`, { method: "DELETE" });
      throw error;
    }

    return NextResponse.json({ success: true, requiresOtp: true, challengeId: id });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ success: false, message: "Could not log in." }, { status: 500 });
  }
}
