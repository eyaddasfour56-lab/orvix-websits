import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const received = request.cookies.get("orvix_admin_session")?.value;
  if (!secret || !received) return false;

  const expected = createAdminSession(secret);
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function dbSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, extra?: Record<string, string>) {
  return { apikey: key, "Content-Type": "application/json", ...extra };
}

function aiConfigured() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.OPENAI_API_KEY
  );
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const settings = dbSettings();
  if (!settings) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const response = await fetch(
    `${settings.url}/rest/v1/customer_support_settings?id=eq.default&select=ai_auto_reply&limit=1`,
    { headers: headers(settings.key), cache: "no-store" }
  );

  if (!response.ok) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const rows = (await response.json()) as Array<{ ai_auto_reply?: boolean }>;
  return NextResponse.json({
    success: true,
    enabled: Boolean(rows[0]?.ai_auto_reply),
    configured: aiConfigured(),
    provider: process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY
      ? "Vercel AI Gateway"
      : process.env.OPENAI_API_KEY
        ? "OpenAI API"
        : "Unavailable",
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const settings = dbSettings();
  if (!settings) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const body = await request.json();
  const enabled = Boolean(body?.enabled);
  const now = new Date().toISOString();

  const response = await fetch(
    `${settings.url}/rest/v1/customer_support_settings?id=eq.default`,
    {
      method: "PATCH",
      headers: headers(settings.key),
      body: JSON.stringify({ ai_auto_reply: enabled, updated_at: now }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    enabled,
    configured: aiConfigured(),
  });
}
