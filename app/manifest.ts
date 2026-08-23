import type { MetadataRoute } from "next";
import { loadSiteSettings } from "@/lib/site-settings-server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await loadSiteSettings();
  return {
    id: "/orvix-app-v4",
    name: settings.brandName,
    short_name: settings.shortName,
    description: settings.seoDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    orientation: "portrait-primary",
    categories: ["shopping", "business"],
    icons: [
      {
        src: settings.faviconUrl,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: settings.faviconUrl,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
