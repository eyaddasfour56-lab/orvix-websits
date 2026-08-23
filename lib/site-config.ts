export type SiteSettings = {
  brandName: string;
  shortName: string;
  taglineEn: string;
  taglineAr: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  instagramUrl: string;
  instagramHandle: string;
  supportEmail: string;
  supportPhone: string;
  siteUrl: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  promoEnabled: boolean;
  promoCode: string;
  promoProductSlug: string;
  promoLabelEn: string;
  promoLabelAr: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandName: "ORVIX",
  shortName: "ORVIX",
  taglineEn: "Fitness technology made simple.",
  taglineAr: "تقنيات لياقة أكثر بساطة.",
  logoUrl: "/logo.jpeg",
  faviconUrl: "/icon.svg",
  primaryColor: "#2563eb",
  accentColor: "#60a5fa",
  instagramUrl: "https://www.instagram.com/orvix_tech/",
  instagramHandle: "@orvix_tech",
  supportEmail: "",
  supportPhone: "",
  siteUrl: "https://orvix-websits.vercel.app",
  seoTitle: "ORVIX | Smart Fitness Technology in Egypt",
  seoDescription:
    "Shop ORVIX smart fitness technology in Egypt with secure checkout, live order tracking and reliable customer service.",
  seoKeywords: ["smart fitness", "fitness tracker", "Egypt", "ORVIX"],
  promoEnabled: true,
  promoCode: "ORVIX15",
  promoProductSlug: "google-fitbit-air",
  promoLabelEn: "Limited offer",
  promoLabelAr: "عرض لفترة محدودة",
};

export type SiteSettingsRow = {
  brand_name?: unknown;
  short_name?: unknown;
  tagline_en?: unknown;
  tagline_ar?: unknown;
  logo_url?: unknown;
  favicon_url?: unknown;
  primary_color?: unknown;
  accent_color?: unknown;
  instagram_url?: unknown;
  instagram_handle?: unknown;
  support_email?: unknown;
  support_phone?: unknown;
  site_url?: unknown;
  seo_title?: unknown;
  seo_description?: unknown;
  seo_keywords?: unknown;
  promo_enabled?: unknown;
  promo_code?: unknown;
  promo_product_slug?: unknown;
  promo_label_en?: unknown;
  promo_label_ar?: unknown;
};

function text(value: unknown, fallback: string) {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

export function normalizeSiteSettings(row?: SiteSettingsRow | null): SiteSettings {
  const fallback = DEFAULT_SITE_SETTINGS;
  if (!row) return fallback;

  return {
    brandName: text(row.brand_name, fallback.brandName),
    shortName: text(row.short_name, fallback.shortName),
    taglineEn: text(row.tagline_en, fallback.taglineEn),
    taglineAr: text(row.tagline_ar, fallback.taglineAr),
    logoUrl: text(row.logo_url, fallback.logoUrl),
    faviconUrl: text(row.favicon_url, fallback.faviconUrl),
    primaryColor: text(row.primary_color, fallback.primaryColor),
    accentColor: text(row.accent_color, fallback.accentColor),
    instagramUrl: text(row.instagram_url, fallback.instagramUrl),
    instagramHandle: text(row.instagram_handle, fallback.instagramHandle),
    supportEmail: String(row.support_email ?? "").trim(),
    supportPhone: String(row.support_phone ?? "").trim(),
    siteUrl: text(row.site_url, fallback.siteUrl).replace(/\/$/, ""),
    seoTitle: text(row.seo_title, fallback.seoTitle),
    seoDescription: text(row.seo_description, fallback.seoDescription),
    seoKeywords: Array.isArray(row.seo_keywords)
      ? row.seo_keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 30)
      : fallback.seoKeywords,
    promoEnabled: typeof row.promo_enabled === "boolean" ? row.promo_enabled : fallback.promoEnabled,
    promoCode: text(row.promo_code, fallback.promoCode).toUpperCase(),
    promoProductSlug: text(row.promo_product_slug, fallback.promoProductSlug).toLowerCase(),
    promoLabelEn: text(row.promo_label_en, fallback.promoLabelEn),
    promoLabelAr: text(row.promo_label_ar, fallback.promoLabelAr),
  };
}

export function siteSettingsToRow(settings: SiteSettings) {
  return {
    brand_name: settings.brandName,
    short_name: settings.shortName,
    tagline_en: settings.taglineEn,
    tagline_ar: settings.taglineAr,
    logo_url: settings.logoUrl,
    favicon_url: settings.faviconUrl,
    primary_color: settings.primaryColor,
    accent_color: settings.accentColor,
    instagram_url: settings.instagramUrl,
    instagram_handle: settings.instagramHandle,
    support_email: settings.supportEmail || null,
    support_phone: settings.supportPhone || null,
    site_url: settings.siteUrl,
    seo_title: settings.seoTitle,
    seo_description: settings.seoDescription,
    seo_keywords: settings.seoKeywords,
    promo_enabled: settings.promoEnabled,
    promo_code: settings.promoCode,
    promo_product_slug: settings.promoProductSlug,
    promo_label_en: settings.promoLabelEn,
    promo_label_ar: settings.promoLabelAr,
  };
}
