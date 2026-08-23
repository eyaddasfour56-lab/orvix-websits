import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "orvix_admin_session";
export const ADMIN_ROLE_COOKIE = "orvix_admin_role";
export const ANALYTICS_EXCLUSION_COOKIE = "orvix_analytics_excluded";

export type AdminRole = "owner" | "manager" | "orders";
export type AdminPermission =
  | "dashboard"
  | "orders"
  | "inventory"
  | "customers"
  | "returns"
  | "cashflow"
  | "analytics"
  | "bosta"
  | "audit"
  | "roles"
  | "settings"
  | "assistant";

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  owner: ["dashboard", "orders", "inventory", "customers", "returns", "cashflow", "analytics", "bosta", "audit", "roles", "settings", "assistant"],
  manager: ["dashboard", "orders", "inventory", "customers", "returns", "cashflow", "analytics", "bosta", "audit", "assistant"],
  orders: ["dashboard", "orders", "inventory", "customers", "returns", "bosta"],
};

function createSignedToken(secret: string, purpose: string) {
  return createHmac("sha256", secret).update(purpose).digest("hex");
}

export function createAdminSession(secret: string) {
  return createSignedToken(secret, "orvix-admin-session");
}

export function createAnalyticsExclusion(secret: string) {
  return createSignedToken(secret, "orvix-analytics-exclusion");
}

export function createAdminRoleCookie(secret: string, role: AdminRole) {
  const signature = createSignedToken(secret, `orvix-admin-role:${role}`);
  return `${role}.${signature}`;
}

function hasValidSignedCookie(request: NextRequest, cookieName: string, expectedValue: string) {
  const receivedValue = request.cookies.get(cookieName)?.value;
  if (!receivedValue) return false;

  const receivedBuffer = Buffer.from(receivedValue);
  const expectedBuffer = Buffer.from(expectedValue);

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function isAdminAuthenticated(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) return false;

  return hasValidSignedCookie(
    request,
    ADMIN_SESSION_COOKIE,
    createAdminSession(sessionSecret)
  );
}

export function readAdminRole(request: NextRequest): AdminRole {
  if (!isAdminAuthenticated(request)) return "orders";
  const secret = process.env.ADMIN_SESSION_SECRET;
  const raw = request.cookies.get(ADMIN_ROLE_COOKIE)?.value;
  if (!secret || !raw) return "owner";

  for (const role of ["owner", "manager", "orders"] as AdminRole[]) {
    const expected = createAdminRoleCookie(secret, role);
    const a = Buffer.from(raw);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return role;
  }

  return "owner";
}

export function hasAdminPermission(request: NextRequest, permission: AdminPermission) {
  if (!isAdminAuthenticated(request)) return false;
  return rolePermissions[readAdminRole(request)].includes(permission);
}

export function adminRoleLabel(role: AdminRole) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  return "Orders";
}

export function isAnalyticsExcluded(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret) return false;

  return (
    isAdminAuthenticated(request) ||
    hasValidSignedCookie(
      request,
      ANALYTICS_EXCLUSION_COOKIE,
      createAnalyticsExclusion(sessionSecret)
    )
  );
}
