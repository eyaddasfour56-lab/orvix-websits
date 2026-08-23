import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { checkoutPhoneSmsReady } from "@/lib/tracking-sms";
import { normalizeTrackingPhone } from "@/lib/tracking-security";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

const TOKEN_TTL_SECONDS = 20 * 60;

type CheckoutPhoneChallenge = {
  id: string;
  phone_normalized: string;
  verified_at?: string | null;
  expires_at: string;
};

function secret() {
  const value =
    process.env.CHECKOUT_OTP_SECRET ||
    process.env.TRACKING_OTP_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY;
  if (!value) throw new Error("Checkout verification settings are missing.");
  return value;
}

function signature(challengeId: string, phone: string, expiresAt: number) {
  return createHmac("sha256", secret())
    .update(`checkout-phone:${challengeId}:${phone}:${expiresAt}`)
    .digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkoutPhoneVerificationRequired() {
  return checkoutPhoneSmsReady();
}

export function createCheckoutPhoneToken(challengeId: string, phoneValue: unknown) {
  const phone = normalizeTrackingPhone(phoneValue);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return `${challengeId}.${expiresAt}.${signature(challengeId, phone, expiresAt)}`;
}

export async function verifyCheckoutPhoneToken(phoneValue: unknown, tokenValue: unknown) {
  if (!checkoutPhoneVerificationRequired()) return { required: false, valid: true };

  const phone = normalizeTrackingPhone(phoneValue);
  const [challengeId = "", expiryRaw = "", receivedSignature = ""] = String(tokenValue || "").split(".");
  const expiresAt = Number(expiryRaw);
  if (!/^01\d{9}$/.test(phone) || !/^[0-9a-f-]{36}$/i.test(challengeId) || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return { required: true, valid: false };
  }

  const expectedSignature = signature(challengeId, phone, expiresAt);
  if (!safeEqual(receivedSignature, expectedSignature)) return { required: true, valid: false };

  const rows = await supabaseAdminJson<CheckoutPhoneChallenge[]>(
    `checkout_phone_challenges?id=eq.${postgrestValue(challengeId)}&phone_normalized=eq.${postgrestValue(phone)}&verified_at=not.is.null&expires_at=gt.${postgrestValue(new Date().toISOString())}&select=id,phone_normalized,verified_at,expires_at&limit=1`
  );
  return { required: true, valid: Boolean(rows[0]), challengeId };
}
