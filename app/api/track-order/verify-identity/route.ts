import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import {
  createTrackingSessionToken,
  secureHexEqual,
  trackingClientIp,
  trackingHash,
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
  attempts: number;
  max_attempts: number;
  verification_method: string;
  expires_at: string;
  consumed_at?: string | null;
};

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

async function takeRateLimit(key: string, limit: number, seconds: number) {
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: seconds }),
  });
}

async function failAttempt(challenge: ChallengeRow) {
  const attempts = Math.min(
    Number(challenge.max_attempts || 5),
    Number(challenge.attempts || 0) + 1
  );
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
    const body = (await request.json()) as { challengeId?: string; email?: string };
    const challengeId = String(body.challengeId || "").trim();
    const email = normalizeEmail(body.email);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId)) {
      return json(
        { success: false, code: "INVALID_CHALLENGE", message: "Start verification again." },
        400
      );
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return json(
        { success: false, code: "INVALID_EMAIL", message: "Enter the exact email used at checkout." },
        400
      );
    }

    const ipHash = trackingHash("tracking-ip", trackingClientIp(request));
    const emailHash = trackingHash("tracking-email", email);
    const challengeHash = trackingHash("tracking-challenge", challengeId);
    const [ipAllowed, emailAllowed, challengeAllowed] = await Promise.all([
      takeRateLimit(`tracking-identity-ip:${ipHash}`, 20, 10 * 60),
      takeRateLimit(`tracking-identity-email:${emailHash}`, 8, 10 * 60),
      takeRateLimit(`tracking-identity-challenge:${challengeHash}`, 5, 10 * 60),
    ]);
    if (!ipAllowed || !emailAllowed || !challengeAllowed) {
      return json(
        { success: false, code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes." },
        429
      );
    }

    const rows = await supabaseAdminJson<ChallengeRow[]>(
      `order_tracking_otp_challenges?id=eq.${postgrestValue(challengeId)}&select=id,phone_normalized,email_normalized,attempts,max_attempts,verification_method,expires_at,consumed_at&limit=1`
    );
    const challenge = rows[0];
    const unavailable =
      !challenge ||
      challenge.verification_method !== "checkout_email" ||
      !challenge.email_normalized ||
      Boolean(challenge.consumed_at) ||
      new Date(challenge.expires_at).getTime() <= Date.now() ||
      Number(challenge.attempts || 0) >= Number(challenge.max_attempts || 5);

    if (unavailable) {
      return json(
        {
          success: false,
          code: "IDENTITY_MISMATCH",
          message: "The phone and checkout email could not be verified.",
        },
        400
      );
    }

    const receivedHash = trackingHash("tracking-email-match", email);
    const expectedHash = trackingHash(
      "tracking-email-match",
      normalizeEmail(challenge.email_normalized)
    );
    if (!secureHexEqual(receivedHash, expectedHash)) {
      await failAttempt(challenge);
      return json(
        {
          success: false,
          code: "IDENTITY_MISMATCH",
          message: "The phone and checkout email could not be verified.",
        },
        400
      );
    }

    const now = new Date().toISOString();
    const consumed = await supabaseAdminJson<Array<{ id: string }>>(
      `order_tracking_otp_challenges?id=eq.${postgrestValue(challenge.id)}&consumed_at=is.null&attempts=lt.${Number(challenge.max_attempts || 5)}&verification_method=eq.checkout_email`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ verified_at: now, consumed_at: now }),
      }
    );
    if (!consumed.length) {
      return json(
        { success: false, code: "CHALLENGE_USED", message: "Start verification again." },
        400
      );
    }

    const token = createTrackingSessionToken();
    const expiresAt = new Date(
      Date.now() + TRACKING_SESSION_TTL_SECONDS * 1000
    ).toISOString();
    await supabaseAdminJson("order_tracking_sessions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: randomUUID(),
        token_hash: trackingSessionHash(token),
        phone_normalized: challenge.phone_normalized,
        email_normalized: normalizeEmail(challenge.email_normalized),
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
    console.error("Tracking identity verification error:", error);
    return json(
      { success: false, code: "UNKNOWN_ERROR", message: "Could not verify those details right now." },
      500
    );
  }
}
