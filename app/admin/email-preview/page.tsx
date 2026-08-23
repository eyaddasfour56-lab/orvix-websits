import {
  accountConfirmationEmail,
  accountSignInEmail,
  trackingOtpEmail,
} from "@/lib/email-templates";

const previews = [
  {
    title: "Account confirmation",
    description: "Sent immediately after a customer creates an account.",
    html: accountConfirmationEmail({
      customerName: "Eyad",
      actionUrl: "https://orvix-websits.vercel.app/account/confirm?preview=1",
    }).html,
  },
  {
    title: "Secure email sign-in",
    description: "Sent when a customer chooses email sign-in instead of a password.",
    html: accountSignInEmail({
      actionUrl: "https://orvix-websits.vercel.app/account/confirm?preview=1",
    }).html,
  },
  {
    title: "Order tracking OTP",
    description: "Sent before any customer order data becomes visible.",
    html: trackingOtpEmail({
      customerName: "Eyad",
      otp: "482917",
      expiresInMinutes: 10,
    }).html,
  },
];

export default function AdminEmailPreviewPage() {
  const sender = process.env.RESEND_FROM_EMAIL || "ORVIX <onboarding@resend.dev>";
  const testingOnly = /@resend\.dev\b/i.test(sender);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-200/45">ADVANCED · EMAIL DELIVERY</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Customer email previews</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/38">These are the exact branded templates used by account confirmation, email sign-in and secure order tracking. Preview codes and links below are examples only.</p>

        <section className={`mt-6 rounded-[22px] border p-5 ${testingOnly ? "border-amber-300/20 bg-amber-300/[0.06]" : "border-emerald-300/20 bg-emerald-300/[0.06]"}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${testingOnly ? "text-amber-200/70" : "text-emerald-200/70"}`}>
            {testingOnly ? "TEST DELIVERY MODE" : "CUSTOM SENDER CONFIGURED"}
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-white/70">
            {testingOnly
              ? "The current Resend test sender can deliver only to the Resend account owner. Verify an ORVIX domain and set RESEND_FROM_EMAIL before sending to customers."
              : `Emails are configured to send from ${sender}. Confirm that its domain remains verified in Resend.`}
          </p>
        </section>

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          {previews.map((preview) => (
            <section key={preview.title} className="overflow-hidden rounded-[26px] border border-white/[0.09] bg-white/[0.025]">
              <div className="border-b border-white/[0.08] p-5">
                <h2 className="text-lg font-black">{preview.title}</h2>
                <p className="mt-1 text-xs leading-5 text-white/32">{preview.description}</p>
              </div>
              <iframe
                title={`${preview.title} preview`}
                srcDoc={preview.html}
                sandbox=""
                className="h-[650px] w-full bg-[#08090b]"
              />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
