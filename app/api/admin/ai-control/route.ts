import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-auth";

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
    process.env.VERCEL ||
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.OPENAI_API_KEY
  );
}

function aiProvider() {
  if (process.env.VERCEL || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    return "Vercel AI Gateway";
  }
  if (process.env.OPENAI_API_KEY) return "OpenAI API";
  return "Unavailable";
}

export async function GET(request: NextRequest) {
  if (!hasAdminPermission(request, "assistant")) {
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
    provider: aiProvider(),
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminPermission(request, "assistant")) {
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
    provider: aiProvider(),
  });
}
