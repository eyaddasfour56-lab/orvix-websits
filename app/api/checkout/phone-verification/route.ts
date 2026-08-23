import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  checkoutPhoneVerificationRequired,
  createCheckoutPhoneToken,
} from "@/lib/checkout-phone-verification";
import { sendCheckoutOtpSms } from "@/lib/tracking-sms";
import {
  createTrackingOtp,
  maskTrackingPhone,
  normalizeTrackingPhone,
  secureHexEqual,
  trackingClientIp,
  trackingHash,
  trackingPhoneE164,
} from "@/lib/tracking-security";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

const OTP_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

type Challenge = {
  id: string;
  phone_normalized: string;
  otp_hash: string;
  ip_hash?: string | null;
  attempts: number;
  expires_at: string;
  verified_at?: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function otpHash(challengeId: string, otp: string) {
  return trackingHash("checkout-otp", `${challengeId}:${otp}`);
}

async function takeRateLimit(key: string, limit: number, seconds: number) {
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: seconds }),
  });
}

export async function GET() {
  return json({ success: true, required: checkoutPhoneVerificationRequired() });
}

export async function POST(request: NextRequest) {
  try {
    if (!checkoutPhoneVerificationRequired()) return json({ success: true, required: false });

    const body = (await request.json()) as { phone?: unknown };
    const phone = normalizeTrackingPhone(body.phone);
    if (!/^01\d{9}$/.test(phone)) {
      return json({ success: false, required: true, message: "Enter a valid Egyptian mobile number." }, 400);
    }

    const phoneHash = trackingHash("checkout-phone", phone);
    const ipHash = trackingHash("checkout-ip", trackingClientIp(request));
    const [phoneAllowed, ipAllowed] = await Promise.all([
      takeRateLimit(`checkout-otp-phone:${phoneHash}`, 5, 10 * 60),
      takeRateLimit(`checkout-otp-ip:${ipHash}`, 12, 10 * 60),
    ]);
    if (!phoneAllowed || !ipAllowed) {
      return json({ success: false, required: true, message: "Too many code requests. Please wait a few minutes." }, 429);
    }

    const challengeId = randomUUID();
    const otp = createTrackingOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();
    await supabaseAdminJson("checkout_phone_challenges", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: challengeId,
        phone_normalized: phone,
        otp_hash: otpHash(challengeId, otp),
        ip_hash: ipHash,
        expires_at: expiresAt,
      }),
    });

    try {
      await sendCheckoutOtpSms({
        to: trackingPhoneE164(phone),
        otp,
        challengeId,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      });
    } catch (error) {
      await supabaseAdminJson(`checkout_phone_challenges?id=eq.${postgrestValue(challengeId)}`, { method: "DELETE" });
      throw error;
    }

    return json({
      success: true,
      required: true,
      challengeId,
      maskedPhone: maskTrackingPhone(phone),
      expiresIn: OTP_TTL_SECONDS,
      message: "A secure checkout code was sent by SMS.",
    });
  } catch (error) {
    console.error("Checkout OTP request error:", error);
    return json({ success: false, required: true, message: "Could not send the checkout code right now." }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkoutPhoneVerificationRequired()) return json({ success: true, required: false, verified: true, token: "" });

    const body = (await request.json()) as { challengeId?: unknown; otp?: unknown };
    const challengeId = String(body.challengeId || "").trim();
    const otp = String(body.otp || "").replace(/\D/g, "").slice(0, 6);
    if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(otp)) {
      return json({ success: false, required: true, message: "Enter the valid 6-digit code." }, 400);
    }

    const ipHash = trackingHash("checkout-ip", trackingClientIp(request));
    const allowed = await takeRateLimit(`checkout-otp-verify:${ipHash}`, 12, 10 * 60);
    if (!allowed) return json({ success: false, required: true, message: "Too many attempts. Please wait before trying again." }, 429);

    const rows = await supabaseAdminJson<Challenge[]>(
      `checkout_phone_challenges?id=eq.${postgrestValue(challengeId)}&select=id,phone_normalized,otp_hash,ip_hash,attempts,expires_at,verified_at&limit=1`
    );
    const challenge = rows[0];
    if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now() || Number(challenge.attempts || 0) >= MAX_ATTEMPTS || (challenge.ip_hash && challenge.ip_hash !== ipHash)) {
      return json({ success: false, required: true, message: "This code is invalid or expired. Request a new one." }, 401);
    }

    if (!secureHexEqual(otpHash(challenge.id, otp), challenge.otp_hash)) {
      const attempts = Number(challenge.attempts || 0) + 1;
      await supabaseAdminJson(`checkout_phone_challenges?id=eq.${postgrestValue(challenge.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ attempts }),
      });
      return json({ success: false, required: true, message: "Incorrect verification code." }, 401);
    }

    const verifiedAt = new Date().toISOString();
    await supabaseAdminJson(`checkout_phone_challenges?id=eq.${postgrestValue(challenge.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ verified_at: verifiedAt }),
    });

    return json({
      success: true,
      required: true,
      verified: true,
      token: createCheckoutPhoneToken(challenge.id, challenge.phone_normalized),
      message: "Phone number verified.",
    });
  } catch (error) {
    console.error("Checkout OTP verification error:", error);
    return json({ success: false, required: true, message: "Could not verify the code right now." }, 500);
  }
}
