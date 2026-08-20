"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Customer = { name?: string; customerName?: string; phone?: string; totalSpent?: number; orderCount?: number; cancelledCount?: number; segment?: string; lastOrderAt?: string };
type Inventory = { id: string; product_name?: string; productName?: string; stock_quantity?: number; low_stock_limit?: number; reorderSuggested?: number };
type Order = { id: string; order_number?: string; customer_name?: string; status?: string; total_price?: number | string; created_at?: string };
type Alert = { id: string; severity: string; title: string; body: string; targetUrl?: string };
type Dashboard = {
  today: { orders: number; sales: number; deliveredSales: number; profit: number; waitingConfirmation: number; unreadChats: number };
  allTime: { deliveredSales: number; realProfit: number };
  alerts: Alert[];
  inventory: Inventory[];
  customers?: Customer[];
  actionOrders?: Order[];
  delayedOrders?: Order[];
  recentReturns?: Array<Record<string, unknown>>;
  recentAudit?: Array<Record<string, unknown>>;
  stats?: { returns?: number; lowStock?: number };
};
type Result = { success?: boolean; message?: string; dashboard?: Dashboard; roleLabel?: string };

function money(value: unknown) {
  const n = Number(value || 0);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })} EGP`;
}

export default function BusinessOsPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [role, setRole] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/os", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as Result;
      if (!response.ok || !result.success || !result.dashboard) throw new Error(result.message || "Could not load Business OS.");
      setData(result.dashboard); setRole(result.roleLabel || "Admin");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load Business OS."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!data && loading) return <main className="p-8 text-center text-white/35">Loading ORVIX Business OS…</main>;
  if (!data) return <main className="p-8"><p className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-5 text-red-100">{error || "Business OS unavailable."}</p></main>;

  const customers = (data.customers || []).slice(0, 6);
  const inventory = data.inventory.slice().sort((a, b) => Number(b.reorderSuggested || 0) - Number(a.reorderSuggested || 0)).slice(0, 6);
  const actionOrders = (data.actionOrders || []).slice(0, 6);
  const delayed = (data.delayedOrders || []).slice(0, 6);

  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 text-white sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/28">ORVIX BUSINESS OS · {role}</p><h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Business Command Center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-white/38">Customers, profit, order operations, delays, returns, inventory and audit activity in one place.</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/ai" className="rounded-xl bg-violet-300 px-4 py-2.5 text-xs font-black text-black">Ask ORVIX AI</Link><button onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/65">Refresh</button></div></header>
    {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] p-3 text-sm text-red-100">{error}</p>}

    <section className={`mt-6 grid grid-cols-2 gap-3 xl:grid-cols-6 ${loading ? "opacity-60" : ""}`}>
      {[["Sales today", money(data.today.sales)], ["Profit today", money(data.today.profit)], ["All-time profit", money(data.allTime.realProfit)], ["Need confirm", data.today.waitingConfirmation], ["Delayed", delayed.length], ["Returns", data.stats?.returns || 0]].map(([l,v]) => <article key={String(l)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/28">{l}</p><p className="mt-2 text-xl font-black">{v}</p></article>)}
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-2">
      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Customer 360 CRM</p><h2 className="mt-1 text-xl font-black">Top customers</h2></div><Link href="/admin/command-center/advanced#customers" className="text-xs font-black text-violet-200">Open CRM →</Link></div><div className="mt-4 space-y-2">{customers.length === 0 ? <p className="py-8 text-center text-sm text-white/25">No customer history yet.</p> : customers.map((c, i) => <div key={`${c.phone}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="min-w-0"><p className="truncate text-sm font-black">{c.customerName || c.name || c.phone || "Customer"}</p><p className="mt-1 text-[10px] text-white/30">{c.phone} · {c.orderCount || 0} orders · {c.segment || "Customer"}</p></div><p className="shrink-0 text-xs font-black text-emerald-200">{money(c.totalSpent)}</p></div>)}</div></article>

      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Order Operations</p><h2 className="mt-1 text-xl font-black">Needs action</h2></div><Link href="/admin/orders-v2" className="text-xs font-black text-violet-200">Open orders →</Link></div><div className="mt-4 space-y-2">{actionOrders.length === 0 ? <p className="py-8 text-center text-sm text-emerald-200/70">No urgent order actions.</p> : actionOrders.map((o) => <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3"><div><p className="text-sm font-black">{o.order_number || "Order"}</p><p className="mt-1 text-[10px] text-white/30">{o.customer_name || "Customer"} · {String(o.status || "new").replaceAll("_", " ")}</p></div><p className="text-xs font-black">{money(o.total_price)}</p></div>)}</div></article>
    </section>

    <section className="mt-5 grid gap-5 xl:grid-cols-3">
      <article className="rounded-2xl border border-amber-300/12 bg-amber-500/[0.035] p-5"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-100/45">Late alerts</p><h2 className="mt-1 text-lg font-black">Delayed orders</h2></div><span className="text-2xl font-black text-amber-200">{delayed.length}</span></div><div className="mt-4 space-y-2">{delayed.slice(0,4).map((o) => <div key={o.id} className="rounded-xl bg-black/20 p-3"><p className="text-xs font-black">{o.order_number || "Order"}</p><p className="mt-1 text-[10px] text-white/30">{String(o.status || "").replaceAll("_", " ")}</p></div>)}</div></article>
      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><div className="flex justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Inventory</p><h2 className="mt-1 text-lg font-black">Restock priority</h2></div><Link href="/admin/products" className="text-xs font-black text-violet-200">Manage →</Link></div><div className="mt-4 space-y-2">{inventory.map((item) => <div key={item.id} className="rounded-xl bg-black/20 p-3"><div className="flex justify-between gap-2"><p className="truncate text-xs font-black">{item.productName || item.product_name || "Product"}</p><p className="text-xs font-black">{item.stock_quantity || 0}</p></div><p className="mt-1 text-[10px] text-white/30">Suggested reorder: {item.reorderSuggested || 0}</p></div>)}</div></article>
      <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Systems</p><h2 className="mt-1 text-lg font-black">Growth & control</h2><div className="mt-4 grid gap-2">{[["Checkout Recovery", "/admin/recovery"], ["Marketing Attribution", "/admin/attribution"], ["Returns / Audit", "/admin/command-center/advanced"], ["Notification Center", "/admin/notifications"], ["Verified Reviews", "/admin/reviews"]].map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 text-xs font-black text-white/60 hover:text-white">{label} →</Link>)}</div></article>
    </section>
  </main>;
}
