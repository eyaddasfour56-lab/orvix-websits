import "server-only";

import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "crypto";

export const TRACKING_SESSION_COOKIE = "orvix_tracking_session";
export const TRACKING_OTP_TTL_SECONDS = 10 * 60;
export const TRACKING_SESSION_TTL_SECONDS = 30 * 60;

function secret() {
  const value =
    process.env.TRACKING_OTP_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY;

  if (!value) {
    throw new Error("Tracking security settings are missing.");
  }

  return value;
}

export function normalizeTrackingPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) return `0${digits.slice(2)}`;
  if (digits.startsWith("1")) return `0${digits}`;
  return digits;
}

export function trackingPhoneCandidates(value: unknown) {
  const local = normalizeTrackingPhone(value);
  if (!/^01\d{9}$/.test(local)) return [];
  const international = `20${local.slice(1)}`;
  return Array.from(
    new Set([local, international, `+${international}`, `00${international}`])
  );
}

export function trackingPhoneE164(value: unknown) {
  const local = normalizeTrackingPhone(value);
  return /^01\d{9}$/.test(local) ? `+20${local.slice(1)}` : "";
}

export function maskTrackingPhone(value: unknown) {
  const local = normalizeTrackingPhone(value);
  if (!/^01\d{9}$/.test(local)) return "";
  return `${local.slice(0, 3)}${"•".repeat(6)}${local.slice(-2)}`;
}

export function trackingHash(purpose: string, value: string) {
  return createHmac("sha256", secret())
    .update(`${purpose}:${value}`)
    .digest("hex");
}

export function trackingOtpHash(challengeId: string, otp: string) {
  return trackingHash("otp", `${challengeId}:${otp}`);
}

export function trackingSessionHash(token: string) {
  return trackingHash("session", token);
}

export function createTrackingOtp() {
  return String(randomInt(100000, 1000000));
}

export function createTrackingSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function secureHexEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export function maskTrackingEmail(value: string) {
  const [local = "", domain = ""] = value.split("@");
  if (!local || !domain) return "";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, Math.min(8, local.length - visible.length)))}@${domain}`;
}

export function trackingClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return (
    forwarded.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
