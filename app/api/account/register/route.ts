import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { normalizeCustomerPhone } from "@/lib/customer-auth-server";
import { accountConfirmationEmail } from "@/lib/email-templates";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import { supabaseAuthAdmin } from "@/lib/supabase-auth-admin";
import { sendOrvixEmail, siteOrigin } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_SIGNUPS_PER_WINDOW = 5;

function clean(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function enforceRateLimit(request: Request) {
  const now = Date.now();
  const bucketStartMs = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const bucketStart = new Date(bucketStartMs).toISOString();
  const bucketKey = `customer-signup:${hash(clientIp(request)).slice(0, 24)}`;

  const rows = await supabaseAdminJson<Array<{ hits: number }>>(
    `commerce_rate_limits?bucket_key=eq.${postgrestValue(bucketKey)}&bucket_start=eq.${postgrestValue(bucketStart)}&select=hits&limit=1`
  );

  const hits = Number(rows[0]?.hits || 0);
  if (hits >= MAX_SIGNUPS_PER_WINDOW) {
    return false;
  }

  if (rows[0]) {
    await supabaseAdminJson(
      `commerce_rate_limits?bucket_key=eq.${postgrestValue(bucketKey)}&bucket_start=eq.${postgrestValue(bucketStart)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ hits: hits + 1 }),
      }
    );
  } else {
    await supabaseAdminJson("commerce_rate_limits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ bucket_key: bucketKey, bucket_start: bucketStart, hits: 1 }),
    });
  }

  return true;
}

export async function POST(request: Request) {
  let createdUserId = "";
  try {
    if (!(await enforceRateLimit(request))) {
      return NextResponse.json(
        { success: false, message: "Too many account attempts. Please try again in a few minutes." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const fullName = clean(body.fullName, 160);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 254).toLowerCase();
    const password = String(body.password ?? "");

    if (fullName.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your full name." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    }
    if (phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ success: false, message: "Enter a valid phone number." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ success: false, message: "Password must be 8 to 128 characters." }, { status: 400 });
    }

    const supabase = supabaseAuthAdmin();
    const redirectTo = `${siteOrigin(request)}/account/confirm`;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    if (error || !data.user) {
      const text = String(error?.message || "").toLowerCase();
      const duplicate = text.includes("already") || text.includes("exists") || text.includes("registered");
      return NextResponse.json(
        {
          success: false,
          message: duplicate
            ? "An account with this email already exists. Log in instead."
            : "Could not create your account. Please try again.",
        },
        { status: duplicate ? 409 : 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    createdUserId = data.user.id;
    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      throw new Error("Supabase did not create an email confirmation link.");
    }

    await supabaseAdminJson("customer_profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        phone_normalized: normalizeCustomerPhone(phone),
        updated_at: new Date().toISOString(),
      }),
    });

    const emailContent = accountConfirmationEmail({
      customerName: fullName,
      actionUrl: actionLink,
    });
    await sendOrvixEmail({
      to: email,
      ...emailContent,
      idempotencyKey: `account-confirmation-${data.user.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created. Check your email and press Confirm email before logging in.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Customer registration error:", error);
    if (createdUserId) {
      try {
        await supabaseAuthAdmin().auth.admin.deleteUser(createdUserId);
      } catch (cleanupError) {
        console.error("Could not clean up an account after email delivery failed:", cleanupError);
      }
    }
    return NextResponse.json(
      {
        success: false,
        message: "Could not create the account or send its confirmation email. Please try again.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
