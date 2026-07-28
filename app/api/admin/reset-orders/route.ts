import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const receivedSession =
    request.cookies.get("orvix_admin_session")?.value;

  if (!sessionSecret || !receivedSession) {
