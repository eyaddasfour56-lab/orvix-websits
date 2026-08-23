import "server-only";

import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
  type SiteSettings,
  type SiteSettingsRow,
} from "@/lib/site-config";

export async function loadSiteSettings(): Promise<SiteSettings> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return DEFAULT_SITE_SETTINGS;

  try {
    const response = await fetch(
      `${url}/rest/v1/site_settings?id=eq.default&select=*&limit=1`,
      {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) return DEFAULT_SITE_SETTINGS;
    const rows = (await response.json()) as SiteSettingsRow[];
    return normalizeSiteSettings(rows[0]);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
