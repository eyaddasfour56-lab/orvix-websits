import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { accountSignInEmail } from "@/lib/email-templates";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import { supabaseAuthAdmin } from "@/lib/supabase-auth-admin";
import { sendOrvixEmail, siteOrigin } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

async function allowed(request: Request) {
  const key = `account-email-sign-in:${hash(clientIp(request)).slice(0, 32)}`;
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: 8, p_window_seconds: 10 * 60 }),
  });
}

export async function POST(request: Request) {
  const genericMessage = "If this email belongs to an active ORVIX account, a secure sign-in link has been sent.";
  try {
    if (!(await allowed(request))) {
      return NextResponse.json(
        { success: false, message: "Too many email attempts. Please wait a few minutes." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = (await request.json()) as { email?: string };
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const profiles = await supabaseAdminJson<Array<{ id: string; email: string }>>(
      `customer_profiles?email=eq.${postgrestValue(email)}&select=id,email&limit=1`
    );
    if (!profiles.length) {
      return NextResponse.json({ success: true, message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
    }

    const supabase = supabaseAuthAdmin();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteOrigin(request)}/account/confirm` },
    });
    const actionLink = data?.properties?.action_link;
    if (error || !actionLink) {
      console.error("Could not generate account sign-in link:", error);
      return NextResponse.json({ success: true, message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
    }

    const emailContent = accountSignInEmail({ actionUrl: actionLink });
    await sendOrvixEmail({
      to: email,
      ...emailContent,
      idempotencyKey: `account-sign-in-${profiles[0].id}-${Math.floor(Date.now() / 60_000)}`,
    });

    return NextResponse.json({ success: true, message: genericMessage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Account email sign-in error:", error);
    return NextResponse.json(
      { success: false, message: "Could not send the sign-in email right now. Please try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
