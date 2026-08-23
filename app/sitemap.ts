import type { MetadataRoute } from "next";
import { loadSiteSettings } from "@/lib/site-settings-server";

type ProductRow = { slug?: string; updated_at?: string; status?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await loadSiteSettings();
  const now = new Date();
  const staticPaths = [
    { path: "", priority: 1, frequency: "daily" as const },
    { path: "/policies/shipping", priority: 0.35, frequency: "monthly" as const },
    { path: "/policies/returns", priority: 0.35, frequency: "monthly" as const },
    { path: "/policies/warranty", priority: 0.35, frequency: "monthly" as const },
    { path: "/policies/privacy", priority: 0.25, frequency: "yearly" as const },
    { path: "/policies/terms", priority: 0.25, frequency: "yearly" as const },
  ];

  let products: ProductRow[] = [];
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    try {
      const response = await fetch(
        `${url}/rest/v1/products?status=neq.hidden&select=slug,updated_at,status&order=display_order.asc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
      );
      if (response.ok) products = (await response.json()) as ProductRow[];
    } catch {
      products = [];
    }
  }

  return [
    ...staticPaths.map((item) => ({
      url: `${settings.siteUrl}${item.path}`,
      lastModified: now,
      changeFrequency: item.frequency,
      priority: item.priority,
      alternates: {
        languages: {
          en: `${settings.siteUrl}${item.path}`,
          ar: `${settings.siteUrl}${item.path}`,
        },
      },
    })),
    ...products
      .filter((product) => product.slug)
      .map((product) => ({
        url: `${settings.siteUrl}/products/${encodeURIComponent(String(product.slug))}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: "daily" as const,
        priority: product.status === "available" || product.status === "preorder" ? 0.9 : 0.65,
      })),
  ];
}
