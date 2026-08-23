import "server-only";

type SentResponse = {
  success?: boolean;
  data?: {
    recipients?: Array<{
      message_id?: string;
      channel?: string;
    }>;
  } | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
  meta?: {
    request_id?: string;
  };
};

const SENT_REQUEST_TIMEOUT_MS = 4_000;

function sentApiKey() {
  return process.env.SENT_DM_API_KEY || process.env.SENT_API_KEY || "";
}

export function trackingSmsReady() {
  return (
    process.env.SENT_TRACKING_SMS_ENABLED === "true" &&
    Boolean(sentApiKey())
  );
}

export function orderUpdateSmsReady() {
  return (
    process.env.SENT_ORDER_SMS_ENABLED === "true" &&
    Boolean(sentApiKey())
  );
}

export function checkoutPhoneSmsReady() {
  return (
    process.env.SENT_CHECKOUT_SMS_ENABLED === "true" &&
    Boolean(sentApiKey())
  );
}

async function sendSms(input: {
  to: string;
  text: string;
  idempotencyKey: string;
}) {
  const apiKey = sentApiKey();
  if (!apiKey) throw new Error("Sent SMS credentials are missing.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SENT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.sent.dm/v3/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        to: [input.to],
        channel: ["sms"],
        text: input.text,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const result = (await response.json().catch(() => ({}))) as SentResponse;
    if (!response.ok || !result.success) {
      const code = result.error?.code || `HTTP_${response.status}`;
      throw new Error(`${code}: ${result.error?.message || "SMS was not accepted."}`);
    }

    const messageId = result.data?.recipients?.[0]?.message_id;
    if (!messageId) throw new Error("Sent did not return a message id.");

    console.info("Customer SMS accepted:", {
      messageId,
      requestId: result.meta?.request_id || null,
    });
    return { messageId };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("The SMS provider did not respond in time.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendOrderUpdateSms(input: {
  to: string;
  text: string;
  idempotencyKey: string;
}) {
  return sendSms(input);
}

export async function sendCheckoutOtpSms(input: {
  to: string;
  otp: string;
  challengeId: string;
  expiresInMinutes: number;
}) {
  return sendSms({
    to: input.to,
    idempotencyKey: `checkout_otp_${input.challengeId}`,
    text: `Your ORVIX checkout code is ${input.otp}. It expires in ${input.expiresInMinutes} minutes. Do not share it.`,
  });
}

export async function sendTrackingOtpSms(input: {
  to: string;
  otp: string;
  challengeId: string;
  expiresInMinutes: number;
}) {
  return sendSms({
    to: input.to,
    idempotencyKey: `tracking_otp_${input.challengeId}`,
    text: `Your secure order tracking code is ${input.otp}. It expires in ${input.expiresInMinutes} minutes. Do not share it.`,
  });
}
