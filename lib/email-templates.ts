type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

export function escapeEmailHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emailShell(input: {
  preview: string;
  eyebrow: string;
  title: string;
  body: string;
  footer?: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#08090b;color:#ffffff;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(input.preview)}</div>
    <div style="padding:32px 14px;background:#08090b">
      <div style="max-width:620px;margin:0 auto;border:1px solid #24262b;border-radius:28px;overflow:hidden;background:#111317">
        <div style="padding:26px 28px;border-bottom:1px solid #24262b">
          <div style="font-size:16px;font-weight:900;letter-spacing:6px">ORVIX</div>
          <div style="margin-top:7px;font-size:10px;font-weight:800;letter-spacing:2px;color:#747985">SECURE CUSTOMER SERVICE</div>
        </div>
        <div style="padding:34px 28px">
          <div style="font-size:10px;font-weight:900;letter-spacing:2px;color:#8d93a0">${escapeEmailHtml(input.eyebrow)}</div>
          <h1 style="margin:12px 0 0;font-size:32px;line-height:1.1;letter-spacing:-1px">${escapeEmailHtml(input.title)}</h1>
          ${input.body}
        </div>
        <div style="padding:20px 28px;border-top:1px solid #24262b;color:#747985;font-size:11px;line-height:1.7">
          ${input.footer || "This security email was sent automatically by ORVIX. If you did not request it, you can safely ignore it."}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function actionButton(label: string, href: string) {
  return `<p style="margin:26px 0 0"><a href="${escapeEmailHtml(href)}" style="display:inline-block;padding:15px 22px;border-radius:14px;background:#ffffff;color:#050505;text-decoration:none;font-size:13px;font-weight:900">${escapeEmailHtml(label)}</a></p>`;
}

export function accountConfirmationEmail(input: {
  customerName: string;
  actionUrl: string;
}): EmailContent {
  const name = input.customerName.trim() || "there";
  return {
    subject: "Confirm your ORVIX account",
    html: emailShell({
      preview: "Confirm your email to activate your ORVIX account.",
      eyebrow: "EMAIL CONFIRMATION",
      title: `Welcome, ${name}.`,
      body: `
        <p style="margin:18px 0 0;color:#b7bbc3;font-size:15px;line-height:1.8">Confirm this email address to activate your account and keep your orders and customer-service replies together.</p>
        ${actionButton("Confirm email", input.actionUrl)}
        <p style="margin:20px 0 0;color:#777d88;font-size:11px;line-height:1.7">For your security, use the button only if you created an ORVIX account.</p>`,
    }),
    text: `Welcome, ${name}. Confirm your ORVIX account: ${input.actionUrl}\n\nIf you did not create this account, ignore this email.`,
  };
}

export function accountSignInEmail(input: {
  actionUrl: string;
}): EmailContent {
  return {
    subject: "Your secure ORVIX sign-in link",
    html: emailShell({
      preview: "Use this secure link to sign in to ORVIX.",
      eyebrow: "SECURE SIGN-IN",
      title: "Sign in to ORVIX.",
      body: `
        <p style="margin:18px 0 0;color:#b7bbc3;font-size:15px;line-height:1.8">Use the button below to sign in. The link is personal, so do not forward this email.</p>
        ${actionButton("Sign in securely", input.actionUrl)}`,
    }),
    text: `Sign in to ORVIX: ${input.actionUrl}\n\nIf you did not request this link, ignore this email.`,
  };
}

export function passwordResetEmail(input: { actionUrl: string }): EmailContent {
  return {
    subject: "Reset your ORVIX password",
    html: emailShell({
      preview: "Use this secure link to choose a new ORVIX password.",
      eyebrow: "PASSWORD RESET",
      title: "Choose a new password.",
      body: `
        <p style="margin:18px 0 0;color:#b7bbc3;font-size:15px;line-height:1.8">Use the button below to open the secure password reset page. The link is personal and expires automatically.</p>
        ${actionButton("Reset password", input.actionUrl)}`,
    }),
    text: `Reset your ORVIX password: ${input.actionUrl}\n\nIf you did not request this, ignore this email.`,
  };
}

export function adminLoginOtpEmail(input: { otp: string; expiresInMinutes: number }): EmailContent {
  return {
    subject: `${input.otp} is your ORVIX admin login code`,
    html: emailShell({
      preview: `Your ORVIX admin login code is ${input.otp}.`,
      eyebrow: "ADMIN TWO-STEP VERIFICATION",
      title: "Confirm this admin login.",
      body: `
        <p style="margin:18px 0 0;color:#b7bbc3;font-size:15px;line-height:1.8">Enter this one-time code on the ORVIX admin login screen:</p>
        <div style="margin:24px 0 0;padding:22px;border:1px solid #31343a;border-radius:18px;background:#08090b;text-align:center;font-size:34px;font-weight:900;letter-spacing:10px">${escapeEmailHtml(input.otp)}</div>
        <p style="margin:16px 0 0;color:#777d88;font-size:12px;line-height:1.7">The code expires in ${input.expiresInMinutes} minutes and can only be used once.</p>`,
      footer: "This code protects the ORVIX admin dashboard. Never forward or share it.",
    }),
    text: `Your ORVIX admin login code is ${input.otp}. It expires in ${input.expiresInMinutes} minutes.`,
  };
}

export function trackingOtpEmail(input: {
  customerName?: string | null;
  otp: string;
  expiresInMinutes: number;
}): EmailContent {
  const name = input.customerName?.trim();
  return {
    subject: `${input.otp} is your ORVIX tracking code`,
    html: emailShell({
      preview: `Your ORVIX order tracking code is ${input.otp}.`,
      eyebrow: "ORDER TRACKING CODE",
      title: name ? `Hi ${name}.` : "Verify your order.",
      body: `
        <p style="margin:18px 0 0;color:#b7bbc3;font-size:15px;line-height:1.8">Enter this one-time code on the ORVIX tracking page:</p>
        <div style="margin:24px 0 0;padding:22px;border:1px solid #31343a;border-radius:18px;background:#08090b;text-align:center;font-size:34px;font-weight:900;letter-spacing:10px">${escapeEmailHtml(input.otp)}</div>
        <p style="margin:16px 0 0;color:#777d88;font-size:12px;line-height:1.7">The code expires in ${input.expiresInMinutes} minutes and can only be used once.</p>`,
    }),
    text: `Your ORVIX tracking code is ${input.otp}. It expires in ${input.expiresInMinutes} minutes. Do not share it.`,
  };
}
