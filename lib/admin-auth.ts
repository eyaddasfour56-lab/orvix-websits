import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE =
  "orvix_admin_session";

export const ANALYTICS_EXCLUSION_COOKIE =
  "orvix_analytics_excluded";

function createSignedToken(
  secret: string,
  purpose: string
) {
  return createHmac("sha256", secret)
    .update(purpose)
    .digest("hex");
}

export function createAdminSession(
  secret: string
) {
  return createSignedToken(
    secret,
    "orvix-admin-session"
  );
}

export function createAnalyticsExclusion(
  secret: string
) {
  return createSignedToken(
    secret,
    "orvix-analytics-exclusion"
  );
}

function hasValidSignedCookie(
  request: NextRequest,
  cookieName: string,
  expectedValue: string
) {
  const receivedValue =
    request.cookies.get(cookieName)?.value;

  if (!receivedValue) {
    return false;
  }

  const receivedBuffer = Buffer.from(
    receivedValue
  );

  const expectedBuffer = Buffer.from(
    expectedValue
  );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    )
  );
}

export function isAdminAuthenticated(
  request: NextRequest
) {
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET;

  if (!sessionSecret) {
    return false;
  }

  return hasValidSignedCookie(
    request,
    ADMIN_SESSION_COOKIE,
    createAdminSession(sessionSecret)
  );
}

export function isAnalyticsExcluded(
  request: NextRequest
) {
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET;

  if (!sessionSecret) {
    return false;
  }

  return (
    isAdminAuthenticated(request) ||
    hasValidSignedCookie(
      request,
      ANALYTICS_EXCLUSION_COOKIE,
      createAnalyticsExclusion(
        sessionSecret
      )
    )
  );
}
