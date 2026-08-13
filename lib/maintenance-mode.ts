import "server-only";

import {
  postgrestValue,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

/*
  The website already has a durable discount-code table in production.
  A reserved, hidden row is used as the global maintenance switch so the
  dashboard toggle works immediately without a separate database migration.
*/
export const MAINTENANCE_SETTING_CODE =
  "__ORVIX_SYSTEM_MAINTENANCE__";

type MaintenanceSettingRow = {
  active: boolean;
  updated_at: string | null;
};

export type MaintenanceStatus = {
  enabled: boolean;
  updatedAt: string | null;
};

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const rows =
    await supabaseAdminJson<
      MaintenanceSettingRow[]
    >(
      `delivery_discount_codes?code=eq.${postgrestValue(
        MAINTENANCE_SETTING_CODE
      )}&select=active,updated_at&limit=1`
    );

  const setting = rows[0];

  return {
    enabled: Boolean(setting?.active),
    updatedAt:
      setting?.updated_at || null,
  };
}

export async function setMaintenanceStatus(
  enabled: boolean
): Promise<MaintenanceStatus> {
  const updatedAt =
    new Date().toISOString();

  const rows =
    await supabaseAdminJson<
      MaintenanceSettingRow[]
    >(
      "delivery_discount_codes?on_conflict=code&select=active,updated_at",
      {
        method: "POST",
        headers: {
          Prefer:
            "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          code: MAINTENANCE_SETTING_CODE,
          discount_type:
            "free_delivery",
          discount_value: 100,
          minimum_order_value: 0,
          maximum_discount: null,
          usage_limit: null,
          times_used: 0,
          active: enabled,
          starts_at: null,
          expires_at: null,
          updated_at: updatedAt,
        }),
      }
    );

  const setting = rows[0];

  return {
    enabled: Boolean(setting?.active),
    updatedAt:
      setting?.updated_at || updatedAt,
  };
}
