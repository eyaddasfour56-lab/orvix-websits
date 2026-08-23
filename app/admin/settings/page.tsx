"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from "@/lib/site-config";

type ApiResult = {
  success?: boolean;
  message?: string;
  settings?: SiteSettings;
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  type?: string;
  dir?: "ltr" | "rtl";
};

function Field({ label, value, onChange, hint, type = "text", dir = "ltr" }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/32">{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-white/25"
      />
      {hint ? <span className="mt-1.5 block text-[10px] leading-4 text-white/25">{hint}</span> : null}
    </label>
  );
}

export default function BrandSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/site-settings", { cache: "no-store" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.settings) {
        throw new Error(result.message || "Could not load brand settings.");
      }
      setSettings(result.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load brand settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<Key extends keyof SiteSettings>(key: Key, value: SiteSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.settings) {
        throw new Error(result.message || "Could not save brand settings.");
      }
      setSettings(result.settings);
      setMessage(result.message || "Brand settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save brand settings.");
    } finally {
      setSaving(false);
    }
  }

  const previewStyle = useMemo(
    () => ({
      background: `radial-gradient(circle at 20% 10%, ${settings.primaryColor}55, transparent 36%), linear-gradient(135deg, #12141a, #08090b)`,
      borderColor: `${settings.accentColor}55`,
    }),
    [settings.accentColor, settings.primaryColor]
  );

  return (
    <main className="min-h-[calc(100vh-64px)] px-3 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/45">BRAND CONTROL CENTER</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Brand, social and SEO</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/35">Change the storefront identity, official contact links, search appearance and live promotion from one screen.</p>
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/60">Open storefront ↗</a>
        </header>

        {loading ? <div className="mt-6 rounded-3xl border border-white/10 p-8 text-sm font-bold text-white/35">Loading settings…</div> : null}
        {error ? <p className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.07] p-4 text-xs font-bold text-red-100">{error}</p> : null}
        {message ? <p className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 text-xs font-bold text-emerald-100">{message}</p> : null}

        {!loading ? (
          <form onSubmit={save} className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <p className="text-xs font-black">Identity</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Brand name" value={settings.brandName} onChange={(value) => update("brandName", value)} />
                  <Field label="Short name" value={settings.shortName} onChange={(value) => update("shortName", value)} hint="Used in compact navigation and the installable app." />
                  <Field label="English tagline" value={settings.taglineEn} onChange={(value) => update("taglineEn", value)} />
                  <Field label="Arabic tagline" value={settings.taglineAr} onChange={(value) => update("taglineAr", value)} dir="rtl" />
                  <Field label="Logo URL" value={settings.logoUrl} onChange={(value) => update("logoUrl", value)} hint="Use /logo.jpeg or an HTTPS image URL." />
                  <Field label="Favicon URL" value={settings.faviconUrl} onChange={(value) => update("faviconUrl", value)} hint="Use /icon.svg or an HTTPS icon URL." />
                  <Field label="Primary colour" value={settings.primaryColor} onChange={(value) => update("primaryColor", value)} type="color" />
                  <Field label="Accent colour" value={settings.accentColor} onChange={(value) => update("accentColor", value)} type="color" />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <p className="text-xs font-black">Official contact</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Instagram URL" value={settings.instagramUrl} onChange={(value) => update("instagramUrl", value)} type="url" />
                  <Field label="Instagram handle" value={settings.instagramHandle} onChange={(value) => update("instagramHandle", value)} />
                  <Field label="Support email" value={settings.supportEmail} onChange={(value) => update("supportEmail", value)} type="email" />
                  <Field label="Support phone" value={settings.supportPhone} onChange={(value) => update("supportPhone", value)} type="tel" />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <p className="text-xs font-black">Search and social previews</p>
                <div className="mt-5 space-y-4">
                  <Field label="Production site URL" value={settings.siteUrl} onChange={(value) => update("siteUrl", value)} type="url" />
                  <Field label="SEO title" value={settings.seoTitle} onChange={(value) => update("seoTitle", value)} hint={`${settings.seoTitle.length}/70 characters`} />
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/32">SEO description</span>
                    <textarea value={settings.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold outline-none focus:border-white/25" />
                    <span className="mt-1.5 block text-[10px] text-white/25">{settings.seoDescription.length}/180 characters</span>
                  </label>
                  <Field label="SEO keywords" value={settings.seoKeywords.join(", ")} onChange={(value) => update("seoKeywords", value.split(",").map((item) => item.trim()).filter(Boolean))} hint="Comma separated." />
                </div>
              </section>

              <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-xs font-black">Live promotion</p><p className="mt-1 text-[10px] text-white/28">The banner calculates its price and discount from live commerce data.</p></div>
                  <button type="button" onClick={() => update("promoEnabled", !settings.promoEnabled)} className={`rounded-full px-4 py-2 text-[10px] font-black ${settings.promoEnabled ? "bg-emerald-300 text-black" : "bg-white/8 text-white/45"}`}>{settings.promoEnabled ? "Enabled" : "Disabled"}</button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Discount code" value={settings.promoCode} onChange={(value) => update("promoCode", value.toUpperCase())} />
                  <Field label="Product slug" value={settings.promoProductSlug} onChange={(value) => update("promoProductSlug", value.toLowerCase())} />
                  <Field label="English label" value={settings.promoLabelEn} onChange={(value) => update("promoLabelEn", value)} />
                  <Field label="Arabic label" value={settings.promoLabelAr} onChange={(value) => update("promoLabelAr", value)} dir="rtl" />
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
              <section style={previewStyle} className="overflow-hidden rounded-[30px] border p-6 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">LIVE PREVIEW</p>
                <div className="mt-7 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white text-sm font-black text-black">{settings.shortName.slice(0, 1)}</div>
                  <p className="text-xl font-black tracking-[0.2em]">{settings.shortName}</p>
                </div>
                <h2 className="mt-10 text-3xl font-black leading-tight">{settings.taglineEn}</h2>
                <p className="mt-4 text-sm leading-6 text-white/50">{settings.seoDescription}</p>
                <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs font-black">{settings.promoEnabled ? `${settings.promoLabelEn} · ${settings.promoCode}` : "Promotion hidden"}</div>
              </section>
              <button type="submit" disabled={saving} className="h-14 w-full rounded-2xl bg-white text-sm font-black text-black transition hover:bg-blue-50 disabled:opacity-45">{saving ? "Saving…" : "Save & publish settings"}</button>
              <p className="text-center text-[10px] leading-4 text-white/25">Changes are audited and storefront metadata is refreshed automatically.</p>
            </aside>
          </form>
        ) : null}
      </div>
    </main>
  );
}
