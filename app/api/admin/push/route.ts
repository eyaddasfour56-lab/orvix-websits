import { NextRequest, NextResponse } from "next/server";
import { getPushConfig, savePushSubscription } from "@/lib/admin-push";
import { hasAdminPermission } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!hasAdminPermission(request, "dashboard")) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const config = await getPushConfig();
  if (!config) {
    return NextResponse.json({ success: false, message: "Push is not configured." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    publicKey: config.vapid_public_key,
  });
}

export async function POST(request: NextRequest) {
  if (!hasAdminPermission(request, "dashboard")) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    const body = await request.json();
    const endpoint = String(body?.endpoint || "").trim();
    const p256dh = String(body?.keys?.p256dh || "").trim();
    const auth = String(body?.keys?.auth || "").trim();

    if (!endpoint.startsWith("https://")) {
      return NextResponse.json({ success: false, message: "Invalid push subscription." }, { status: 400 });
    }

    const saved = await savePushSubscription({
      endpoint,
      keys: { p256dh, auth },
    });

    return NextResponse.json({ success: saved }, { status: saved ? 200 : 500 });
  } catch (error) {
    console.error("Push subscription API error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
