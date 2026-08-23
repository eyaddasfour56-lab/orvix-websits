import "server-only";

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

const EMAIL_REQUEST_TIMEOUT_MS = 3_000;

export function transactionalEmailSenderReady() {
  const sender = process.env.RESEND_FROM_EMAIL?.trim().toLowerCase();
  return Boolean(sender && !sender.includes("onboarding@resend.dev"));
}

export function siteOrigin(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL;

  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function sendOrvixEmail(input: TransactionalEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is missing.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "ORVIX <onboarding@resend.dev>",
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await response.text();
    let result: ResendEmailResponse = {};
    if (raw) {
      try {
        result = JSON.parse(raw) as ResendEmailResponse;
      } catch {
        // A non-JSON provider response is handled by the status check below.
      }
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
          result.error?.message ||
          `The email provider returned HTTP ${response.status}.`
      );
    }

    if (!result.id) {
      throw new Error("The email provider did not confirm delivery.");
    }

    return { id: result.id };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The email provider did not respond in time.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
