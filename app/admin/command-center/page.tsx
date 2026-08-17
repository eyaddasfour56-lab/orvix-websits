"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type AlertItem = {
  id: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  body: string;
  targetUrl: string;
  persisted?: boolean;
};

type InventoryItem = {
  id: string;
  product_slug: string;
  product_name: string;
  stock_quantity: number;
  low_stock_limit: number;
  is_available: boolean;
  reorderTarget: number;
  reorderSuggested: number;
};

type OrderItem = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  product_name?: string | null;
  colour?: string | null;
  quantity: number;
  total_price: number | string;
  status: string;
  bosta_last_error?: string | null;
};

type Dashboard = {
  today: {
    orders: number;
    sales: number;
    deliveredSales: number;
    profit: number;
    waitingConfirmation: number;
    unreadChats: number;
  };
  allTime: { deliveredSales: number; realProfit: number };
  summaryText: string;
  alerts: AlertItem[];
  inventory: InventoryItem[];
  actionOrders: OrderItem[];
  stats: {
    lowStock: number;
    unreadChats: number;
    waitingChats: number;
    missingExpensePayer: number;
    returns: number;
  };
};

type ApiResult = {
  success?: boolean;
  message?: string;
  answer?: string;
  roleLabel?: string;
  dashboard?: Dashboard;
  partial?: boolean;
};

type InventoryResult = {
  success?: boolean;
  message?: string;
};

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function Metric({ label, value, helper, tone = "white" }: { label: string; value: string; helper: string; tone?: "white" | "green" | "blue" | "red" | "violet" }) {
  const toneClass = {
    white: "border-white/10 bg-white/[0.04]",
    green: "border-emerald-400/20 bg-emerald-500/[0.08]",
    blue: "border-blue-400/20 bg-blue-500/[0.08]",
    red: "border-red-400/20 bg-red-500/[0.08]",
    violet: "border-violet-400/20 bg-violet-500/[0.08]",
  }[tone];

  return (
    <article className={`rounded-[24px] border p-4 sm:p-5 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-white/30">{helper}</p>
    </article>
  );
}

export default function CommandCenterPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [roleLabel, setRoleLabel] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("اسألني عن الربح، الأوردرات، الستوك، العملاء أو أي حاجة مهمة في ORVIX.");
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/os", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.dashboard) {
        throw new Error(result.message || "Could not load ORVIX OS.");
      }
      setDashboard(result.dashboard);
      setRoleLabel(result.roleLabel || "Admin");
      setStockDrafts(Object.fromEntries(result.dashboard.inventory.map((item) => [item.id, item.stock_quantity])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load ORVIX OS.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function osAction(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/os", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Action failed.");
      if (result.message) setNotice(result.message);
      await load();
      return result;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setBusy("assistant");
    setError("");
    try {
      const response = await fetch("/api/admin/os", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ask", question: value }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Assistant could not answer.");
      setAnswer(result.answer || "No answer available.");
      setQuestion("");
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : "Assistant could not answer.");
    } finally {
      setBusy("");
    }
  }

  function changeStock(item: InventoryItem, delta: number) {
    setStockDrafts((current) => ({
      ...current,
      [item.id]: Math.max(0, Math.round(Number(current[item.id] ?? item.stock_quantity) + delta)),
    }));
  }

  async function saveStock(item: InventoryItem) {
    const nextStock = Math.max(0, Math.round(Number(stockDrafts[item.id] ?? item.stock_quantity)));
    setBusy(`stock-${item.id}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/inventory/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockQuantity: nextStock,
          lowStockLimit: item.low_stock_limit,
          isAvailable: item.is_available,
        }),
      });
      const result = (await response.json()) as InventoryResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update stock.");
      setNotice(result.message || "Stock updated.");
      await load();
    } catch (stockError) {
      setError(stockError instanceof Error ? stockError.message : "Could not update stock.");
    } finally {
      setBusy("");
    }
  }

  if (loading && !dashboard) {
    return <main className="min-h-screen bg-[#050505] p-6 text-white"><div className="mx-auto max-w-6xl rounded-[28px] border border-white/10 bg-white/[0.035] p-10 text-center text-white/40">Loading ORVIX OS…</div></main>;
  }

  if (!dashboard) {
    return <main className="min-h-screen bg-[#050505] p-6 text-white"><div className="mx-auto max-w-4xl rounded-[28px] border border-red-400/20 bg-red-500/[0.08] p-8">{error || "ORVIX OS unavailable."}</div></main>;
  }

  const importantAlerts = dashboard.alerts.slice(0, 4);
  const importantOrders = dashboard.actionOrders.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-200/60">ORVIX OS</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/35">{roleLabel}</span>
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black">Refresh</button>
            <Link href="/admin/command-center/advanced" className="rounded-full bg-white px-5 py-2.5 text-xs font-black text-black">Advanced</Link>
          </div>
        </header>

        {error && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-100">{error}</div>}
        {notice && <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-3 text-sm font-bold text-emerald-100">{notice}</div>}

        <section className="mt-5 rounded-[26px] border border-violet-400/20 bg-violet-500/[0.07] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/50">TODAY</p>
          <p className="mt-2 text-base font-black leading-6 text-violet-50 sm:text-xl">{dashboard.summaryText}</p>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Sales" value={money(dashboard.today.sales)} helper={`${dashboard.today.orders} orders today`} tone="blue" />
          <Metric label="Profit" value={money(dashboard.today.profit)} helper="Delivered profit" tone={dashboard.today.profit >= 0 ? "green" : "red"} />
          <Metric label="Need Confirm" value={String(dashboard.today.waitingConfirmation)} helper="Orders waiting" tone={dashboard.today.waitingConfirmation ? "violet" : "white"} />
          <Metric label="Chats" value={String(dashboard.today.unreadChats)} helper={`${dashboard.stats.waitingChats} urgent`} tone={dashboard.stats.waitingChats ? "red" : "white"} />
        </section>

        <section id="assistant" className="mt-4 rounded-[28px] border border-violet-400/25 bg-violet-500/[0.08] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/55">ORVIX ASSISTANT</p>
              <h2 className="mt-1 text-2xl font-black">Ask your business</h2>
            </div>
            <span className="rounded-full border border-violet-300/15 bg-black/20 px-3 py-1.5 text-[10px] font-black text-violet-100/60">LIVE DATA</span>
          </div>
          <div className="mt-4 min-h-[82px] rounded-2xl border border-violet-300/10 bg-black/25 p-4 text-sm font-bold leading-6 text-violet-50">{answer}</div>
          <form onSubmit={askAssistant} className="mt-3 flex gap-2">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="اسأل: كام ربحنا؟ الستوك كام؟ إيه الأوردرات اللي محتاجة action؟" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25" />
            <button disabled={busy === "assistant"} className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">{busy === "assistant" ? "..." : "Ask"}</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Profit today", "Stock status", "Delayed orders", "Top customer"].map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/45">{prompt}</button>
            ))}
          </div>
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">IMPORTANT</p><h2 className="mt-1 text-xl font-black">Needs attention</h2></div>
              <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-black text-white/35">{dashboard.alerts.length}</span>
            </div>
            <div className="mt-4 space-y-2">
              {importantAlerts.length === 0 ? <div className="rounded-2xl bg-emerald-500/[0.06] p-4 text-sm font-black text-emerald-100">Everything clear ✓</div> : importantAlerts.map((alert) => (
                <Link key={alert.id} href={alert.targetUrl} className="block rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-sm font-black">{alert.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/35">{alert.body}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">ORDERS</p><h2 className="mt-1 text-xl font-black">Ready now</h2></div>
              <Link href="/admin" className="text-xs font-black text-white/35">All →</Link>
            </div>
            <div className="mt-4 space-y-2">
              {importantOrders.length === 0 ? <p className="rounded-2xl bg-white/[0.025] p-4 text-sm text-white/35">No orders waiting.</p> : importantOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-black">#{order.order_number} · {order.customer_name}</p><p className="mt-1 text-xs text-white/35">{order.product_name} · Qty {order.quantity}</p></div>
                    <p className="text-sm font-black">{money(order.total_price)}</p>
                  </div>
                  {order.bosta_last_error && <p className="mt-2 text-xs font-bold text-red-200">Bosta needs attention</p>}
                  <button disabled={busy === `process-${order.id}`} onClick={() => void osAction({ action: "process_order", orderId: order.id }, `process-${order.id}`)} className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black disabled:opacity-40">{busy === `process-${order.id}` ? "Working…" : "Process Order"}</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section id="inventory" className="mt-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">STOCK</p><h2 className="mt-1 text-xl font-black">Quick edit</h2></div>
            <Link href="/admin/inventory" className="text-xs font-black text-white/35">Full Inventory →</Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {dashboard.inventory.map((item) => {
              const draft = Math.max(0, Number(stockDrafts[item.id] ?? item.stock_quantity));
              const low = item.is_available && draft <= item.low_stock_limit;
              return (
                <article key={item.id} className={`rounded-[24px] border p-4 ${low ? "border-amber-400/20 bg-amber-500/[0.06]" : "border-white/8 bg-black/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className={`text-[10px] font-black uppercase ${low ? "text-amber-200/70" : "text-white/30"}`}>{low ? "LOW STOCK" : "IN STOCK"}</p><h3 className="mt-1 text-base font-black">{item.product_name}</h3></div>
                    <p className="text-3xl font-black">{draft}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => changeStock(item, -5)} className="rounded-xl border border-white/10 py-2 text-xs font-black">−5</button>
                    <button type="button" onClick={() => changeStock(item, -1)} className="rounded-xl border border-white/10 py-2 text-xs font-black">−1</button>
                    <button type="button" onClick={() => changeStock(item, 1)} className="rounded-xl border border-white/10 py-2 text-xs font-black">+1</button>
                    <button type="button" onClick={() => changeStock(item, 5)} className="rounded-xl border border-white/10 py-2 text-xs font-black">+5</button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input type="number" min="0" step="1" value={draft} onChange={(event) => setStockDrafts((current) => ({ ...current, [item.id]: Math.max(0, Math.round(Number(event.target.value || 0))) }))} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#111] px-3 py-2.5 text-center text-sm font-black outline-none" />
                    <button disabled={busy === `stock-${item.id}`} onClick={() => void saveStock(item)} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black disabled:opacity-40">{busy === `stock-${item.id}` ? "Saving…" : "Save"}</button>
                  </div>
                  <p className="mt-2 text-[10px] text-white/25">Low stock at {item.low_stock_limit} · Suggested reorder {item.reorderSuggested || 0}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/admin/cashflow" className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 text-sm font-black text-emerald-100">Cash Flow</Link>
          <Link href="/admin/chats" className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.06] p-4 text-sm font-black text-blue-100">Chats</Link>
          <Link href="/admin/inventory" className="rounded-2xl border border-amber-400/15 bg-amber-500/[0.06] p-4 text-sm font-black text-amber-100">Inventory</Link>
          <Link href="/admin/command-center/advanced" className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4 text-sm font-black text-violet-100">Advanced</Link>
        </section>
      </div>
    </main>
  );
}
