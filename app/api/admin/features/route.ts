import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/admin-audit";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const flags = await supabaseAdminJson<Array<Record<string, unknown>>>(
      "feature_flags?select=*&order=flag_key.asc"
    );
    return NextResponse.json(
      { success: true, flags },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Feature flags GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load feature flags." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  if (readAdminRole(request) === "orders") {
    return NextResponse.json({ success: false, message: "Owner or Manager access is required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const key = String(body.key || "").trim();
    if (!key || !/^[a-z0-9_-]{2,80}$/i.test(key)) {
      return NextResponse.json({ success: false, message: "Invalid feature flag." }, { status: 400 });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.enabled === "boolean") payload.enabled = body.enabled;
    if (body.rolloutPercent !== undefined) {
      payload.rollout_percent = Math.max(0, Math.min(100, Math.round(Number(body.rolloutPercent) || 0)));
    }

    await supabaseAdminJson(`feature_flags?flag_key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    await auditAdminAction(request, "update_feature_flag", "feature_flag", key, payload);

    const flags = await supabaseAdminJson<Array<Record<string, unknown>>>(
      "feature_flags?select=*&order=flag_key.asc"
    );
    return NextResponse.json({ success: true, message: `${key} updated.`, flags });
  } catch (error) {
    console.error("Feature flags PATCH error:", error);
    return NextResponse.json({ success: false, message: "Could not update feature flag." }, { status: 500 });
  }
}
