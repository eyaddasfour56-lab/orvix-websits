"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Funnel = {
  uniqueVisitors: number;
  totalViews: number;
  productViews: number;
  checkoutStarts: number;
  ordersPlaced: number;
  visitorToProductRate: number;
  productToCheckoutRate: number;
  checkoutToOrderRate: number;
  visitorToOrderRate: number;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  funnel?: Funnel;
};

function number(value: number) {
  return value.toLocaleString("en-GB");
}

function rate(value: number) {
  return `${value.toFixed(2)}%`;
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/45">
        {helper}
      </p>
    </article>
  );
}

function FunnelRow({
  label,
  value,
  max,
  accent = false,
}: {
  label: string;
  value: number;
  max: number;
  accent?: boolean;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-bold text-white/70">{label}</span>
        <span className="font-black">{number(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            accent
              ? "bg-gradient-to-r from-emerald-300 to-emerald-500"
              : "bg-gradient-to-r from-blue-300 to-blue-600"
          }`}
          style={{ width: `${Math.min(width, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ConversionAnalyticsPage() {
  const [data, setData] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/conversion", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !result.funnel) {
        throw new Error(result.message || "Could not load conversion analytics.");
      }

      setData(result.funnel);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load conversion analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const insight = useMemo(() => {
    if (!data) return null;

    if (data.productViews > 20 && data.productToCheckoutRate < 15) {
      return {
        title: "Biggest opportunity: product → checkout",
        text: "People are viewing the Fitbit page but too few are starting checkout. Focus on price clarity, stronger proof, and keeping the Order Now button visible.",
      };
    }

    if (data.checkoutStarts > 10 && data.checkoutToOrderRate < 35) {
      return {
        title: "Biggest opportunity: checkout completion",
        text: "Shoppers are reaching checkout but not finishing. Keep fields short, show the final total early, and remove any confusing delivery or payment copy.",
      };
    }

    if (data.uniqueVisitors > 20 && data.visitorToProductRate < 30) {
      return {
        title: "Biggest opportunity: homepage → product",
        text: "More visitors need to reach the product page. The new price-drop hero and clearer calls to action are designed to improve this step.",
      };
    }

    return {
      title: "Funnel is ready to measure",
      text: "Keep watching the same four stages after each campaign so you can tell whether traffic, product interest, checkout completion, or the offer needs improvement.",
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200/70">
              ORVIX ADMIN
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-6xl">
              Conversion Analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
              Follow the path from visitor → Fitbit page → checkout → placed order.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black transition hover:bg-white/10"
            >
              Refresh
            </button>
            <Link
              href="/admin"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-blue-50"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {loading && (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-white/55">
            Loading conversion data…
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-[28px] border border-red-400/20 bg-red-500/[0.07] p-7">
            <p className="font-black text-red-100">Could not load analytics</p>
            <p className="mt-2 text-sm text-red-100/60">{error}</p>
          </div>
        )}

        {!loading && data && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Unique visitors"
                value={number(data.uniqueVisitors)}
                helper={`${number(data.totalViews)} total page views recorded`}
              />
              <MetricCard
                label="Fitbit views"
                value={number(data.productViews)}
                helper={`${rate(data.visitorToProductRate)} of visitors reached the product page`}
              />
              <MetricCard
                label="Checkout starts"
                value={number(data.checkoutStarts)}
                helper={`${rate(data.productToCheckoutRate)} of product views reached checkout`}
              />
              <MetricCard
                label="Orders placed"
                value={number(data.ordersPlaced)}
                helper={`${rate(data.checkoutToOrderRate)} checkout-to-order rate`}
              />
              <MetricCard
                label="Overall conversion"
                value={rate(data.visitorToOrderRate)}
                helper="Placed orders divided by unique visitors"
              />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                      FUNNEL
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Where shoppers are dropping off</h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/45">
                    All-time
                  </span>
                </div>

                <div className="mt-8 space-y-7">
                  <FunnelRow label="Unique visitors" value={data.uniqueVisitors} max={data.uniqueVisitors} />
                  <FunnelRow label="Google Fitbit Air views" value={data.productViews} max={data.uniqueVisitors} />
                  <FunnelRow label="Checkout starts" value={data.checkoutStarts} max={data.uniqueVisitors} />
                  <FunnelRow label="Orders placed" value={data.ordersPlaced} max={data.uniqueVisitors} accent />
                </div>
              </article>

              <article className="rounded-[32px] border border-blue-400/15 bg-blue-500/[0.06] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200/70">
                  ACTIONABLE READOUT
                </p>
                <h2 className="mt-3 text-2xl font-black">{insight?.title}</h2>
                <p className="mt-4 text-sm leading-7 text-white/55">{insight?.text}</p>

                <div className="mt-7 space-y-3 rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Visitor → product</span>
                    <strong>{rate(data.visitorToProductRate)}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Product → checkout</span>
                    <strong>{rate(data.productToCheckoutRate)}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/45">Checkout → order</span>
                    <strong>{rate(data.checkoutToOrderRate)}</strong>
                  </div>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
