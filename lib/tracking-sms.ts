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

export async function sendTrackingOtpSms(input: {
  to: string;
  otp: string;
  challengeId: string;
  expiresInMinutes: number;
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
        "Idempotency-Key": `tracking_otp_${input.challengeId}`,
      },
      body: JSON.stringify({
        to: [input.to],
        channel: ["sms"],
        text: `Your secure order tracking code is ${input.otp}. It expires in ${input.expiresInMinutes} minutes. Do not share it.`,
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
    if (!messageId) {
      throw new Error("Sent did not return a message id.");
    }

    console.info("Tracking SMS accepted:", {
      messageId,
      requestId: result.meta?.request_id || null,
    });
    return { messageId };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The SMS provider did not respond in time.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
