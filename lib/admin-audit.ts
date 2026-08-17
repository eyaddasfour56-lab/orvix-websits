import "server-only";

import type { NextRequest } from "next/server";
import { adminRoleLabel, readAdminRole } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export async function auditAdminAction(
  request: NextRequest,
  action: string,
  entityType: string,
  entityId?: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    const role = readAdminRole(request);
    await supabaseAdminJson(
      "admin_audit_log",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          actor: adminRoleLabel(role),
          role,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          details,
        }),
      }
    );
  } catch (error) {
    console.error("Admin audit log error:", error);
  }
}
