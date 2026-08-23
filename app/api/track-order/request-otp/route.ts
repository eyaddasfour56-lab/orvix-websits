import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { trackingOtpEmail } from "@/lib/email-templates";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import {
  createTrackingOtp,
  maskTrackingEmail,
  normalizeTrackingPhone,
  trackingClientIp,
  trackingHash,
  trackingOtpHash,
  trackingPhoneCandidates,
  TRACKING_OTP_TTL_SECONDS,
} from "@/lib/tracking-security";
import {
  sendOrvixEmail,
  transactionalEmailSenderReady,
} from "@/lib/transactional-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 20;

type OrderIdentity = {
  phone: string;
  customer_email?: string | null;
  customer_name?: string | null;
  created_at: string;
};

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateHeaders });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function takeRateLimit(key: string, limit: number, seconds: number) {
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: seconds }),
  });
}

async function updateChallengeDelivery(
  challengeId: string,
  deliveryStatus: "sent" | "failed"
) {
  try {
    await supabaseAdminJson(
      `order_tracking_otp_challenges?id=eq.${postgrestValue(challengeId)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          delivery_status: deliveryStatus,
          delivered_at: deliveryStatus === "sent" ? new Date().toISOString() : null,
        }),
      }
    );
  } catch (statusError) {
    console.error("Tracking OTP delivery status error:", statusError);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = normalizeTrackingPhone(body.phone);
    const candidates = trackingPhoneCandidates(phone);

    if (!String(body.phone || "").trim()) {
      return json({ success: false, code: "MISSING_PHONE", message: "Please enter your phone number." }, 400);
    }
    if (!candidates.length) {
      return json({ success: false, code: "INVALID_PHONE", message: "Please enter a valid Egyptian mobile number." }, 400);
    }

    const phoneHash = trackingHash("tracking-phone", phone);
    const ipHash = trackingHash("tracking-ip", trackingClientIp(request));
    const [phoneAllowed, ipAllowed] = await Promise.all([
      takeRateLimit(`tracking-otp-phone:${phoneHash}`, 4, 10 * 60),
      takeRateLimit(`tracking-otp-ip:${ipHash}`, 12, 10 * 60),
    ]);

    if (!phoneAllowed || !ipAllowed) {
      return json(
        { success: false, code: "RATE_LIMITED", message: "Too many code requests. Please wait a few minutes and try again." },
        429
      );
    }

    const filter = candidates.map((value) => `phone.eq.${postgrestValue(value)}`).join(",");
    const rows = await supabaseAdminJson<OrderIdentity[]>(
      `orders?or=(${filter})&select=phone,customer_email,customer_name,created_at&order=created_at.desc&limit=20`
    );
    const identity = rows.find((row) => {
      const email = String(row.customer_email || "").trim().toLowerCase();
      return normalizeTrackingPhone(row.phone) === phone && isValidEmail(email);
    });

    const challengeId = randomUUID();
    const otp = createTrackingOtp();
    const email = String(identity?.customer_email || "").trim().toLowerCase();
    const expiresAt = new Date(Date.now() + TRACKING_OTP_TTL_SECONDS * 1000).toISOString();
    const senderReady = transactionalEmailSenderReady();

    await supabaseAdminJson("order_tracking_otp_challenges", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: challengeId,
        phone_hash: phoneHash,
        phone_normalized: phone,
        email_normalized: email || null,
        customer_name: identity?.customer_name || null,
        otp_hash: trackingOtpHash(challengeId, otp),
        delivery_status: identity
          ? senderReady
            ? "pending"
            : "failed"
          : "not_found",
        expires_at: expiresAt,
      }),
    });

    if (identity && email) {
      if (!senderReady) {
        return json(
          {
            success: false,
            code: "EMAIL_SETUP_REQUIRED",
            message:
              "Secure code email is temporarily unavailable. Please contact ORVIX Customer Service.",
          },
          503
        );
      }

      const content = trackingOtpEmail({
        customerName: identity.customer_name,
        otp,
        expiresInMinutes: Math.floor(TRACKING_OTP_TTL_SECONDS / 60),
      });

      try {
        await sendOrvixEmail({
          to: email,
          ...content,
          idempotencyKey: `tracking-otp-${challengeId}`,
        });
        await updateChallengeDelivery(challengeId, "sent");
      } catch (emailError) {
        console.error("Tracking OTP email error:", emailError);
        await updateChallengeDelivery(challengeId, "failed");
        return json(
          {
            success: false,
            code: "EMAIL_UNAVAILABLE",
            message:
              "Secure email delivery is not ready for this address yet. Please contact ORVIX Customer Service.",
          },
          503
        );
      }
    }

    return json({
      success: true,
      challengeId,
      maskedEmail: email ? maskTrackingEmail(email) : null,
      expiresIn: TRACKING_OTP_TTL_SECONDS,
      message: "If this phone is linked to an order with an email address, a secure code has been sent.",
    });
  } catch (error) {
    console.error("Tracking OTP request error:", error);
    return json({ success: false, code: "UNKNOWN_ERROR", message: "Could not start secure tracking right now." }, 500);
  }
}
