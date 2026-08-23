import type { MetadataRoute } from "next";
import { loadSiteSettings } from "@/lib/site-settings-server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await loadSiteSettings();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/account/",
        "/checkout/",
        "/order/",
        "/order-success/",
        "/edit-order/",
        "/track-order/",
        "/chat/",
      ],
    },
    sitemap: `${settings.siteUrl}/sitemap.xml`,
    host: settings.siteUrl,
  };
}
