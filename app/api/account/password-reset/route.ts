import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { passwordResetEmail } from "@/lib/email-templates";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import { supabaseAuthAdmin } from "@/lib/supabase-auth-admin";
import { sendOrvixEmail, siteOrigin } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function allowed(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: `account-password-reset:${hash(ip).slice(0, 32)}`, p_limit: 6, p_window_seconds: 15 * 60 }),
  });
}

export async function POST(request: Request) {
  const genericMessage = "If this email belongs to an ORVIX account, a secure password reset link has been sent.";
  try {
    if (!(await allowed(request))) {
      return NextResponse.json({ success: false, message: "Too many reset attempts. Please wait a few minutes." }, { status: 429 });
    }
    const body = (await request.json()) as { email?: unknown };
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });

    const profiles = await supabaseAdminJson<Array<{ id: string }>>(
      `customer_profiles?email=eq.${postgrestValue(email)}&select=id&limit=1`
    );
    if (!profiles.length) return NextResponse.json({ success: true, message: genericMessage });

    const { data, error } = await supabaseAuthAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteOrigin(request)}/account/reset-password` },
    });
    const actionUrl = data?.properties?.action_link;
    if (error || !actionUrl) {
      console.error("Password reset link generation failed:", error);
      return NextResponse.json({ success: true, message: genericMessage });
    }
    const emailContent = passwordResetEmail({ actionUrl });
    await sendOrvixEmail({
      to: email,
      ...emailContent,
      idempotencyKey: `password-reset-${profiles[0].id}-${Math.floor(Date.now() / 60_000)}`,
    });
    return NextResponse.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ success: false, message: "Could not send the reset email right now. Please try again." }, { status: 500 });
  }
}
