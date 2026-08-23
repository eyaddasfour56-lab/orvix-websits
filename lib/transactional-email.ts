import "server-only";

import { Resend } from "resend";

type TransactionalEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

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

  const resend = new Resend(apiKey);
  const result = await resend.emails.send(
    {
      from:
        process.env.RESEND_FROM_EMAIL ||
        "ORVIX <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    },
    { idempotencyKey: input.idempotencyKey }
  );

  if (result.error) {
    throw new Error(result.error.message || "The email could not be sent.");
  }

  return result.data;
}
