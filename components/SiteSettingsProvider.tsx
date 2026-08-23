"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-config";

const SiteSettingsContext = createContext<SiteSettings>(DEFAULT_SITE_SETTINGS);

export function SiteSettingsProvider({
  children,
  settings,
}: {
  children: ReactNode;
  settings: SiteSettings;
}) {
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
