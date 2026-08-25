"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SiteSettings } from "@/lib/site-config";

type ApiResult = {
  success?: boolean;
  message?: string;
  settings?: SiteSettings;
};

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  automatic?: boolean;
};

const STORAGE_KEY = "orvix-launch-checklist-v1";

const steps: Step[] = [
  {
    id: "brand",
    title: "1. Brand & storefront identity",
    description: "Confirm the buyer brand, logo, colours, official contacts, SEO title and social preview before anything goes live.",
    href: "/admin/settings",
    cta: "Open Brand & SEO",
    automatic: true,
  },
  {
    id: "catalog",
    title: "2. Products, variants & inventory",
    description: "Add the production catalogue, prices, variants, stock states, low-stock limits and availability rules.",
    href: "/admin/products",
    cta: "Review catalogue",
  },
  {
    id: "payments",
    title: "3. Checkout & payment rules",
    description: "Review checkout controls, payment methods, discount behaviour and the final customer-facing order totals.",
    href: "/admin/commerce",
    cta: "Review commerce controls",
  },
  {
    id: "delivery",
    title: "4. Delivery & fulfillment",
    description: "Confirm delivery pricing, service areas, order journey states, courier configuration and test fulfillment from end to end.",
    href: "/admin/fulfillment",
    cta: "Review fulfillment",
  },
  {
    id: "notifications",
    title: "5. Email, SMS & customer verification",
    description: "Preview transactional messages and confirm the provider-owned sender, OTP and account-recovery flows before launch.",
    href: "/admin/email-preview",
    cta: "Review notifications",
  },
  {
    id: "launch",
    title: "6. Launch QA & buyer acceptance",
    description: "Run the storefront, tracking, account, admin, mobile and handover checks with synthetic data before declaring the deployment ready.",
    href: "/admin/handover",
    cta: "Open acceptance checklist",
  },
];

function StatusPill({ done, automatic = false }: { done: boolean; automatic?: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
        done
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
          : "border-amber-300/20 bg-amber-400/10 text-amber-100"
      }`}
    >
      {done ? (automatic ? "Detected ready" : "Complete") : automatic ? "Needs attention" : "Pending"}
    </span>
  );
}

export default function AdminSetupPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // Ignore malformed local checklist data and start clean.
    }

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/site-settings", { cache: "no-store", credentials: "same-origin" });
        const result = (await response.json()) as ApiResult;
        if (!response.ok || !result.success || !result.settings) {
          throw new Error(result.message || "Could not read the current storefront configuration.");
        }
        setSettings(result.settings);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not read the current storefront configuration.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const brandReady = useMemo(() => {
    if (!settings) return false;
    return Boolean(
      settings.brandName.trim() &&
        settings.shortName.trim() &&
        settings.logoUrl.trim() &&
        settings.primaryColor.trim() &&
        settings.seoTitle.trim() &&
        settings.seoDescription.trim() &&
        settings.siteUrl.trim()
    );
  }, [settings]);

  const completion = useMemo(() => {
    return steps.filter((step) => (step.id === "brand" ? brandReady : Boolean(checked[step.id]))).length;
  }, [brandReady, checked]);

  const percentage = Math.round((completion / steps.length) * 100);

  function toggle(id: string) {
    if (id === "brand") return;
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetChecklist() {
    setChecked({});
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="min-h-[calc(100vh-64px)] px-3 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">White-label launch</span>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">Buyer-ready workflow</span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">Setup & launch wizard</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/42">
                Turn a fresh deployment into a production-ready brand without hunting through the codebase. Complete the six launch gates below, then hand the buyer a clean acceptance package.
              </p>
            </div>
            <div className="min-w-[220px] rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/30">Launch readiness</p>
                  <p className="mt-2 text-4xl font-black tracking-[-0.05em]">{percentage}%</p>
                </div>
                <p className="text-xs font-black text-white/40">{completion}/{steps.length}</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-400/[0.07] p-4 text-xs font-bold leading-5 text-amber-100">
            {error} The manual launch checklist still works, but automatic brand detection is unavailable.
          </div>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          {steps.map((step) => {
            const done = step.id === "brand" ? brandReady : Boolean(checked[step.id]);
            return (
              <article key={step.id} className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-[-0.025em]">{step.title}</h2>
                    <p className="mt-2 text-xs font-semibold leading-5 text-white/35">{step.description}</p>
                  </div>
                  <StatusPill done={done} automatic={step.automatic} />
                </div>

                {step.id === "brand" && !loading ? (
                  <div className="mt-4 grid gap-2 rounded-2xl border border-white/8 bg-black/20 p-4 text-[11px] font-bold text-white/38 sm:grid-cols-2">
                    <span>Brand: {settings?.brandName || "—"}</span>
                    <span>Site: {settings?.siteUrl || "—"}</span>
                    <span>SEO: {settings?.seoTitle ? "Configured" : "Missing"}</span>
                    <span>Support contact: {settings?.supportEmail || settings?.supportPhone ? "Configured" : "Recommended"}</span>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link href={step.href} className="rounded-xl bg-white px-4 py-2.5 text-[11px] font-black text-black transition hover:bg-blue-50">
                    {step.cta} →
                  </Link>
                  {!step.automatic ? (
                    <button
                      type="button"
                      onClick={() => toggle(step.id)}
                      className={`rounded-xl border px-4 py-2.5 text-[11px] font-black transition ${
                        done ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.035] text-white/55 hover:bg-white/[0.06]"
                      }`}
                    >
                      {done ? "✓ Marked complete" : "Mark complete"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.045] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/55">Final acceptance</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">A clean buyer handoff, not a code dump</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Use synthetic orders for every demo and acceptance test.",
                "Buyer owns Vercel, Supabase and provider credentials.",
                "Never copy ORVIX production secrets or customer records.",
                "Run storefront, account, tracking, mobile and admin checks before launch.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-emerald-200/10 bg-black/15 p-4 text-xs font-bold leading-5 text-emerald-50/70">
                  <span className="text-emerald-300">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/handover" className="rounded-xl bg-emerald-200 px-4 py-2.5 text-[11px] font-black text-black">Open handover center</Link>
              <Link href="/admin/buyer-preview" target="_blank" className="rounded-xl border border-emerald-200/15 bg-black/20 px-4 py-2.5 text-[11px] font-black text-emerald-50/70">Open safe buyer demo ↗</Link>
              <Link href="/" target="_blank" className="rounded-xl border border-emerald-200/15 bg-black/20 px-4 py-2.5 text-[11px] font-black text-emerald-50/70">Open storefront ↗</Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">Checklist control</p>
            <h2 className="mt-2 text-xl font-black">Reset for a new buyer</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/34">Manual completion marks are stored only in this browser. Reset them when starting a fresh deployment or a new buyer acceptance run.</p>
            <button type="button" onClick={resetChecklist} className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-[11px] font-black text-white/55 hover:bg-white/[0.06]">Reset manual checklist</button>
          </article>
        </section>
      </div>
    </main>
  );
}
