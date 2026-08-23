import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import {
  createTrackingSessionToken,
  secureHexEqual,
  trackingClientIp,
  trackingHash,
  trackingOtpHash,
  trackingSessionHash,
  TRACKING_SESSION_COOKIE,
  TRACKING_SESSION_TTL_SECONDS,
} from "@/lib/tracking-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChallengeRow = {
  id: string;
  phone_normalized: string;
  email_normalized?: string | null;
  otp_hash: string;
  attempts: number;
  max_attempts: number;
  delivery_status: string;
  delivered_at?: string | null;
  expires_at: string;
  consumed_at?: string | null;
};

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

async function failAttempt(challenge: ChallengeRow) {
  const attempts = Math.min(Number(challenge.max_attempts || 5), Number(challenge.attempts || 0) + 1);
  await supabaseAdminJson(
    `order_tracking_otp_challenges?id=eq.${postgrestValue(challenge.id)}&consumed_at=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ attempts }),
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { challengeId?: string; otp?: string };
    const challengeId = String(body.challengeId || "").trim();
    const otp = String(body.otp || "").replace(/\D/g, "").slice(0, 6);

    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(otp)) {
      return json({ success: false, code: "INVALID_OTP", message: "Enter the 6-digit code from your email." }, 400);
    }

    const ipHash = trackingHash("tracking-ip", trackingClientIp(request));
    const allowed = await supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
      method: "POST",
      body: JSON.stringify({
        p_key: `tracking-verify-ip:${ipHash}`,
        p_limit: 30,
        p_window_seconds: 10 * 60,
      }),
    });
    if (!allowed) {
      return json({ success: false, code: "RATE_LIMITED", message: "Too many attempts. Please wait and request a new code." }, 429);
    }

    const rows = await supabaseAdminJson<ChallengeRow[]>(
      `order_tracking_otp_challenges?id=eq.${postgrestValue(challengeId)}&select=id,phone_normalized,email_normalized,otp_hash,attempts,max_attempts,delivery_status,delivered_at,expires_at,consumed_at&limit=1`
    );
    const challenge = rows[0];
    const expired = !challenge || new Date(challenge.expires_at).getTime() <= Date.now();
    const unavailable =
      !challenge ||
      challenge.delivery_status !== "sent" ||
      !challenge.delivered_at ||
      !challenge.email_normalized ||
      Boolean(challenge.consumed_at) ||
      Number(challenge.attempts || 0) >= Number(challenge.max_attempts || 5);

    if (expired || unavailable) {
      return json({ success: false, code: "OTP_EXPIRED", message: "This code is invalid or expired. Request a new one." }, 400);
    }

    const receivedHash = trackingOtpHash(challenge.id, otp);
    if (!secureHexEqual(receivedHash, challenge.otp_hash)) {
      await failAttempt(challenge);
      return json({ success: false, code: "INVALID_OTP", message: "That code is not correct. Check the email and try again." }, 400);
    }

    const now = new Date().toISOString();
    const consumed = await supabaseAdminJson<Array<{ id: string }>>(
      `order_tracking_otp_challenges?id=eq.${postgrestValue(challenge.id)}&consumed_at=is.null&attempts=lt.${Number(challenge.max_attempts || 5)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ verified_at: now, consumed_at: now }),
      }
    );
    if (!consumed.length) {
      return json({ success: false, code: "OTP_EXPIRED", message: "This code has already been used. Request a new one." }, 400);
    }

    const token = createTrackingSessionToken();
    const expiresAt = new Date(Date.now() + TRACKING_SESSION_TTL_SECONDS * 1000).toISOString();
    await supabaseAdminJson("order_tracking_sessions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: randomUUID(),
        token_hash: trackingSessionHash(token),
        phone_normalized: challenge.phone_normalized,
        email_normalized: challenge.email_normalized,
        expires_at: expiresAt,
        last_used_at: now,
      }),
    });

    const response = json({ success: true, expiresIn: TRACKING_SESSION_TTL_SECONDS });
    response.cookies.set(TRACKING_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TRACKING_SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Tracking OTP verification error:", error);
    return json({ success: false, code: "UNKNOWN_ERROR", message: "Could not verify the code right now." }, 500);
  }
}
