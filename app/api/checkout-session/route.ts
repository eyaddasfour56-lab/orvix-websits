import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE_NAME = "orvix_checkout_session";
const VALID_STAGES = new Set([
  "checkout_started",
  "checkout_active",
  "checkout_left",
  "order_submitting",
]);

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprint(value: string) {
  const pepper =
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    "orvix-commerce";
  return sha256(`${pepper}:${value}`);
}

function sourceAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getOrCreateSessionKey(request: NextRequest) {
  const cookie = clean(request.cookies.get(COOKIE_NAME)?.value, 120);
  if (cookie && /^[A-Za-z0-9_-]{16,120}$/.test(cookie)) return cookie;
  return `checkout_${randomUUID().replaceAll("-", "")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const stage = clean(body.stage, 40);
    const safeStage = VALID_STAGES.has(stage) ? stage : "checkout_active";
    const sessionKey = getOrCreateSessionKey(request);
    const sourceHash = fingerprint(sourceAddress(request));
    const userAgentHash = fingerprint(request.headers.get("user-agent") || "unknown");

    const payload = {
      session_key: sessionKey,
      source_hash: sourceHash,
      user_agent_hash: userAgentHash,
      visitor_id: clean(body.visitorId, 120) || null,
      analytics_session_id: clean(body.analyticsSessionId, 120) || null,
      product_slug: clean(body.productSlug, 120) || null,
      variant_key: clean(body.variantKey, 120) || null,
      stage: safeStage,
      metadata: {
        path: clean(body.path, 300) || "/checkout",
        referrer: clean(body.referrer, 500) || null,
      },
      last_seen_at: new Date().toISOString(),
    };

    await supabaseAdminJson(
      "checkout_sessions?on_conflict=session_key",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(payload),
      }
    );

    const response = NextResponse.json(
      { success: true, sessionKey },
      { headers: { "Cache-Control": "no-store" } }
    );

    response.cookies.set(COOKIE_NAME, sessionKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Checkout session tracker error:", error);
    return NextResponse.json(
      { success: false },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
