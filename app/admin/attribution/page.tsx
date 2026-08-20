"use client";

import { useCallback, useEffect, useState } from "react";

type Bucket = { label: string; orders: number; value: number };
type Result = {
  success: boolean;
  message?: string;
  days: number;
  metrics: { attributedOrders: number; attributedValue: number; trackedSources: number; trackedCampaigns: number };
  sources: Bucket[];
  campaigns: Bucket[];
  recent: Array<{ orderNumber: string; source: string; campaign: string; createdAt: string }>;
};

function money(value: number) {
  return `${Math.round(value || 0).toLocaleString("en-GB")} EGP`;
}

export default function AttributionPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/attribution?days=${days}`, { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as Result;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load attribution.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load attribution.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 text-white sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/28">ORVIX GROWTH</p><h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Marketing Attribution</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">See which traffic sources and campaigns actually create orders, not just page views.</p></div>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.025] p-1">{[7, 30, 90].map((value) => <button key={value} type="button" onClick={() => setDays(value)} className={`rounded-lg px-4 py-2 text-xs font-black ${days === value ? "bg-white text-black" : "text-white/40"}`}>{value}D</button>)}</div>
      </header>

      {error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm font-bold text-red-100">{error}</p>}
      {loading && !data && <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-12 text-center text-white/30">Loading…</div>}

      {data && <>
        <section className={`mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
          {[["Attributed orders", data.metrics.attributedOrders], ["Attributed value", money(data.metrics.attributedValue)], ["Sources", data.metrics.trackedSources], ["Campaigns", data.metrics.trackedCampaigns]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">{label}</p><p className="mt-3 text-2xl font-black">{value}</p></article>)}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><h2 className="text-lg font-black">Top sources</h2><div className="mt-4 space-y-3">{data.sources.length === 0 ? <p className="py-8 text-center text-sm text-white/28">No attributed orders yet.</p> : data.sources.map((item) => <div key={item.label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{item.label}</p><p className="mt-1 text-xs text-white/30">{item.orders} orders</p></div><p className="text-sm font-black text-emerald-200">{money(item.value)}</p></div></div>)}</div></div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><h2 className="text-lg font-black">Top campaigns</h2><div className="mt-4 space-y-3">{data.campaigns.length === 0 ? <p className="py-8 text-center text-sm text-white/28">No campaign tags yet.</p> : data.campaigns.map((item) => <div key={item.label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{item.label}</p><p className="mt-1 text-xs text-white/30">{item.orders} orders</p></div><p className="text-sm font-black">{money(item.value)}</p></div></div>)}</div></div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><h2 className="text-lg font-black">Recent attributed orders</h2><div className="mt-4 divide-y divide-white/[0.06]">{data.recent.map((item, index) => <div key={`${item.orderNumber}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-black">{item.orderNumber}</p><p className="mt-1 text-xs text-white/30">{new Date(item.createdAt).toLocaleString("en-GB", { timeZone: "Africa/Cairo" })}</p></div><div className="text-right"><p className="text-xs font-black text-violet-200">{item.source}</p><p className="mt-1 text-[10px] text-white/28">{item.campaign}</p></div></div>)}</div></section>
      </>}
    </main>
  );
}
