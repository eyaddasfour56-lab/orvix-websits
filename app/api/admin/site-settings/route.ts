import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { auditAdminAction } from "@/lib/admin-audit";
import { hasAdminPermission, isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import {
  normalizeSiteSettings,
  siteSettingsToRow,
  type SiteSettingsRow,
} from "@/lib/site-config";
import { supabaseAdminJson } from "@/lib/supabase-admin";

function unauthorized() {
  return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
}

function cleanUrl(value: unknown, fallback: string, allowRelative = false) {
  const clean = String(value ?? "").trim();
  if (allowRelative && clean.startsWith("/")) return clean;
  try {
    const url = new URL(clean);
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

function cleanMediaUrl(value: unknown, fallback: string) {
  const clean = String(value ?? "").trim();
  if (clean.startsWith("/") && !clean.startsWith("//")) return clean;

  try {
    const url = new URL(clean);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function cleanColor(value: unknown, fallback: string) {
  const clean = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(clean) ? clean : fallback;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "settings")) return unauthorized();

  const rows = await supabaseAdminJson<SiteSettingsRow[]>("site_settings?id=eq.default&select=*&limit=1");
  return NextResponse.json({ success: true, settings: normalizeSiteSettings(rows[0]) });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request) || !hasAdminPermission(request, "settings")) return unauthorized();

  try {
    const currentRows = await supabaseAdminJson<SiteSettingsRow[]>("site_settings?id=eq.default&select=*&limit=1");
    const current = normalizeSiteSettings(currentRows[0]);
    const body = (await request.json()) as Record<string, unknown>;
    const keywordInput = Array.isArray(body.seoKeywords)
      ? body.seoKeywords
      : String(body.seoKeywords ?? "").split(",");

    const next = {
      ...current,
      brandName: String(body.brandName ?? current.brandName).trim().slice(0, 40) || current.brandName,
      shortName: String(body.shortName ?? current.shortName).trim().slice(0, 16) || current.shortName,
      taglineEn: String(body.taglineEn ?? current.taglineEn).trim().slice(0, 180) || current.taglineEn,
      taglineAr: String(body.taglineAr ?? current.taglineAr).trim().slice(0, 180) || current.taglineAr,
      logoUrl: cleanMediaUrl(body.logoUrl, current.logoUrl),
      faviconUrl: cleanMediaUrl(body.faviconUrl, current.faviconUrl),
      primaryColor: cleanColor(body.primaryColor, current.primaryColor),
      accentColor: cleanColor(body.accentColor, current.accentColor),
      instagramUrl: cleanUrl(body.instagramUrl, current.instagramUrl),
      instagramHandle: String(body.instagramHandle ?? current.instagramHandle).trim().slice(0, 80) || current.instagramHandle,
      supportEmail: String(body.supportEmail ?? current.supportEmail).trim().toLowerCase().slice(0, 254),
      supportPhone: String(body.supportPhone ?? current.supportPhone).trim().slice(0, 40),
      siteUrl: cleanUrl(body.siteUrl, current.siteUrl),
      seoTitle: String(body.seoTitle ?? current.seoTitle).trim().slice(0, 70) || current.seoTitle,
      seoDescription: String(body.seoDescription ?? current.seoDescription).trim().slice(0, 180) || current.seoDescription,
      seoKeywords: keywordInput.map((item) => String(item).trim()).filter(Boolean).slice(0, 30),
      promoEnabled: typeof body.promoEnabled === "boolean" ? body.promoEnabled : current.promoEnabled,
      promoCode: String(body.promoCode ?? current.promoCode).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40) || current.promoCode,
      promoProductSlug: String(body.promoProductSlug ?? current.promoProductSlug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 120) || current.promoProductSlug,
      promoLabelEn: String(body.promoLabelEn ?? current.promoLabelEn).trim().slice(0, 80) || current.promoLabelEn,
      promoLabelAr: String(body.promoLabelAr ?? current.promoLabelAr).trim().slice(0, 80) || current.promoLabelAr,
    };

    if (next.brandName.length < 2 || next.shortName.length < 2) {
      return NextResponse.json({ success: false, message: "Brand names must contain at least 2 characters." }, { status: 400 });
    }
    if (next.supportEmail && !/^\S+@\S+\.\S+$/.test(next.supportEmail)) {
      return NextResponse.json({ success: false, message: "Enter a valid support email." }, { status: 400 });
    }

    const rows = await supabaseAdminJson<SiteSettingsRow[]>("site_settings?id=eq.default", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        ...siteSettingsToRow(next),
        updated_by: readAdminRole(request),
        updated_at: new Date().toISOString(),
      }),
    });
    const settings = normalizeSiteSettings(rows[0]);

    await auditAdminAction(request, "site_settings_updated", "site_settings", "default", {
      brandName: settings.brandName,
      promoCode: settings.promoCode,
      promoEnabled: settings.promoEnabled,
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, message: "Brand and SEO settings saved.", settings });
  } catch (error) {
    console.error("Site settings update error:", error);
    return NextResponse.json({ success: false, message: "Could not save site settings." }, { status: 500 });
  }
}
