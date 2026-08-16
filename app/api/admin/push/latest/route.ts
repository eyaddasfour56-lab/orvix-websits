import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLatestAdminNotification } from "@/lib/admin-push";

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

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const notification = await getLatestAdminNotification();
  return NextResponse.json({ success: true, notification });
}
