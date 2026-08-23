import { NextRequest, NextResponse } from "next/server";
import { getLatestAdminNotification } from "@/lib/admin-push";
import { hasAdminPermission } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!hasAdminPermission(request, "dashboard")) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const notification = await getLatestAdminNotification();
  return NextResponse.json({ success: true, notification });
}
