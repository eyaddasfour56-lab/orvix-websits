"use client";

import { useEffect, useMemo, useState } from "react";

type MetricData = {
  visitors: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  cancelledOrders: number;
  revenue: number;
  averageOrderValue: number;
  conversionRate: number;
  checkoutConversion: number;
  preorderOrders: number;
};

type FunnelItem = { key: string; label: string; value: number };
type RankItem = { label: string; value: number };
type TimelineItem = {
  date: string;
  visitors: number;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  orders: number;
  revenue: number;
};

type AnalyticsResult = {
  success: boolean;
  message?: string;
  days: number;
  metrics: MetricData;
  funnel: FunnelItem[];
  topViewedProducts: RankItem[];
  topCartProducts: RankItem[];
  topOrderedProducts: RankItem[];
  topColours: RankItem[];
  promoCodes: RankItem[];
  timeline: TimelineItem[];
};

function number(value: number) {
  return Math.round(value).toLocaleString("en-GB");
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("en-GB")} EGP`;
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function metricTone(index: number) {
  const tones = [
    "border-blue-300/10 bg-blue-400/[0.045]",
    "border-violet-300/10 bg-violet-400/[0.045]",
    "border-amber-300/10 bg-amber-400/[0.045]",
    "border-emerald-300/10 bg-emerald-400/[0.045]",
    "border-white/8 bg-white/[0.025]",
  ];
  return tones[index % tones.length];
}

function RankList({ title, items, empty = "No data yet." }: { title: string; items: RankItem[]; empty?: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5">
      <h2 className="text-sm font-black">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="py-6 text-center text-xs text-white/25">{empty}</p> : null}
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-white/58">{item.label}</span><b>{number(item.value)}</b></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-white/60" style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const response = await fetch(`/api/admin/analytics-v2?days=${days}`, { cache: "no-store" });
        const result = (await response.json()) as AnalyticsResult;
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load analytics.");
        if (!cancelled) setData(result);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const funnel = data?.funnel || [];
  const maxFunnel = Math.max(...funnel.map((item) => item.value), 1);
  const dailyPeak = useMemo(() => Math.max(...(data?.timeline || []).map((item) => item.orders), 1), [data]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">COMMERCE INTELLIGENCE</p><h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">Analytics V2</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">Follow the full shopping funnel: visitors, product interest, cart activity, checkout and completed orders.</p></div>
          <div className="flex rounded-xl border border-white/8 bg-white/[0.025] p-1">{[7, 30, 90].map((value) => <button key={value} type="button" onClick={() => setDays(value)} className={`rounded-lg px-4 py-2 text-xs font-black transition ${days === value ? "bg-white text-black" : "text-white/40 hover:text-white"}`}>{value}D</button>)}</div>
        </div>

        {error ? <p className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4 text-sm font-semibold text-red-100">{error}</p> : null}
        {loading && !data ? <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.025] p-12 text-center text-sm text-white/30">Loading commerce analytics…</div> : null}

        {data ? (
          <div className={`mt-7 space-y-6 ${loading ? "opacity-60" : ""}`}>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "Visitors", value: number(data.metrics.visitors), helper: `${days}-day unique traffic` },
                { label: "Add to cart", value: number(data.metrics.addToCart), helper: "Units added to cart" },
                { label: "Orders", value: number(data.metrics.orders), helper: `${data.metrics.cancelledOrders} cancelled` },
                { label: "Conversion", value: percent(data.metrics.conversionRate), helper: "Visitors → orders" },
                { label: "Revenue", value: money(data.metrics.revenue), helper: `AOV ${money(data.metrics.averageOrderValue)}` },
              ].map((metric, index) => <div key={metric.label} className={`rounded-[22px] border p-5 ${metricTone(index)}`}><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/26">{metric.label}</p><p className="mt-2 text-2xl font-black tracking-tight">{metric.value}</p><p className="mt-1 text-[10px] text-white/28">{metric.helper}</p></div>)}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
              <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black">Commerce funnel</h2><p className="mt-1 text-xs text-white/28">Where shoppers progress — and where they drop.</p></div><div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/24">Checkout conversion</p><p className="mt-1 text-lg font-black">{percent(data.metrics.checkoutConversion)}</p></div></div>
                <div className="mt-6 space-y-4">{funnel.map((item, index) => { const previous = index > 0 ? funnel[index - 1].value : item.value; const stepRate = previous > 0 ? (item.value / previous) * 100 : 0; return <div key={item.key}><div className="flex items-center justify-between gap-3"><div><span className="text-xs font-black text-white/65">{item.label}</span>{index > 0 ? <span className="ml-2 text-[9px] font-semibold text-white/22">{percent(stepRate)} from previous</span> : null}</div><b>{number(item.value)}</b></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.055]"><div className="h-full rounded-full bg-white/65 transition-all" style={{ width: `${Math.max(item.value ? 3 : 0, (item.value / maxFunnel) * 100)}%` }} /></div></div>; })}</div>
              </div>

              <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <h2 className="text-lg font-black">Order health</h2>
                <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] font-bold uppercase text-white/25">Pre-order / mixed</p><p className="mt-2 text-xl font-black text-violet-200">{number(data.metrics.preorderOrders)}</p></div><div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] font-bold uppercase text-white/25">Cancelled</p><p className="mt-2 text-xl font-black text-red-200">{number(data.metrics.cancelledOrders)}</p></div><div className="col-span-2 rounded-2xl bg-black/20 p-4"><p className="text-[9px] font-bold uppercase text-white/25">Checkout → order</p><p className="mt-2 text-2xl font-black">{percent(data.metrics.checkoutConversion)}</p></div></div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <RankList title="Most viewed products" items={data.topViewedProducts} />
              <RankList title="Most added to cart" items={data.topCartProducts} />
              <RankList title="Best-selling products" items={data.topOrderedProducts} />
              <RankList title="Most selected colours" items={data.topColours} />
              <RankList title="Promo code usage" items={data.promoCodes} empty="No promo code usage in this period." />
              <section className="rounded-[24px] border border-white/8 bg-white/[0.025] p-5"><h2 className="text-sm font-black">Daily orders</h2><div className="mt-4 flex h-[175px] items-end gap-1.5 overflow-hidden">{data.timeline.slice(-30).map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end"><div title={`${item.date}: ${item.orders} orders · ${money(item.revenue)}`} className="w-full rounded-t-md bg-white/55 transition hover:bg-white" style={{ height: `${Math.max(item.orders ? 8 : 2, (item.orders / dailyPeak) * 145)}px` }} /><span className="mt-2 hidden text-[8px] text-white/20 group-last:block">{item.date.slice(5)}</span></div>)}</div></section>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
