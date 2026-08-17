"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type AlertItem = {
  id: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  body: string;
  targetUrl: string;
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
  allTime: {
    deliveredSales: number;
    realProfit: number;
  };
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

type DashboardResult = {
  success?: boolean;
  message?: string;
  roleLabel?: string;
  dashboard?: Dashboard;
  partial?: boolean;
};

type AssistantResult = {
  success?: boolean;
  answer?: string;
  message?: string;
  ai?: boolean;
};

type InventoryResult = {
  success?: boolean;
  message?: string;
};

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function Metric({ label, value, note, emphasis = false }: { label: string; value: string; note: string; emphasis?: boolean }) {
  return (
    <article className={`rounded-2xl border p-4 sm:p-5 ${emphasis ? "border-violet-300/20 bg-violet-500/[0.055]" : "border-white/[0.08] bg-white/[0.028]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-white sm:text-[28px]">{value}</p>
      <p className="mt-1.5 text-[11px] font-medium text-white/30">{note}</p>
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
  const [answer, setAnswer] = useState("Ask about profit, orders, stock, customers, or anything important in ORVIX.");
  const [assistantMode, setAssistantMode] = useState<"ai" | "fallback" | "">("");
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/os", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as DashboardResult;
      if (!response.ok || !result.success || !result.dashboard) {
        throw new Error(result.message || "Could not load ORVIX overview.");
      }
      setDashboard(result.dashboard);
      setRoleLabel(result.roleLabel || "Admin");
      setStockDrafts(Object.fromEntries(result.dashboard.inventory.map((item) => [item.id, item.stock_quantity])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load ORVIX overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function processOrder(order: OrderItem) {
    setBusy(`order-${order.id}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/os", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_order", orderId: order.id }),
      });
      const result = (await response.json()) as DashboardResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not process order.");
      setNotice(result.message || "Order processed.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not process order.");
    } finally {
      setBusy("");
    }
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || busy === "assistant") return;
    setBusy("assistant");
    setError("");
    try {
      const response = await fetch("/api/admin/os/assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const result = (await response.json()) as AssistantResult;
      if (!response.ok || !result.success) throw new Error(result.message || "ORVIX AI could not answer.");
      setAnswer(result.answer || "No answer available.");
      setAssistantMode(result.ai === false ? "fallback" : "ai");
      setQuestion("");
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : "ORVIX AI could not answer.");
    } finally {
      setBusy("");
    }
  }

  function adjustStock(item: InventoryItem, amount: number) {
    setStockDrafts((current) => ({
      ...current,
      [item.id]: Math.max(0, Math.round(Number(current[item.id] ?? item.stock_quantity) + amount)),
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
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] p-5 sm:p-7">
        <div className="mx-auto max-w-[1220px] animate-pulse">
          <div className="h-8 w-52 rounded-lg bg-white/[0.05]" />
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-white/[0.04]" />)}
          </div>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] p-5 sm:p-7">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-6 text-sm font-semibold text-red-100">{error || "ORVIX overview unavailable."}</div>
      </main>
    );
  }

  const importantAlerts = dashboard.alerts.slice(0, 4);
  const actionOrders = dashboard.actionOrders.slice(0, 5);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1220px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/35">ORVIX / Overview</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Good to see you.</h1>
            <p className="mt-1.5 text-sm font-medium text-white/35">Here is what matters in the business right now.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35 sm:inline-flex">{roleLabel}</span>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-white/65 hover:bg-white/[0.055]">Refresh</button>
            <Link href="/admin/command-center/advanced" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black hover:bg-white/90">Advanced</Link>
          </div>
        </header>

        {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm font-semibold text-red-100">{error}</div>}
        {notice && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] px-4 py-3 text-sm font-semibold text-emerald-100">{notice}</div>}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Sales today" value={money(dashboard.today.sales)} note={`${dashboard.today.orders} orders placed`} />
          <Metric label="Profit today" value={money(dashboard.today.profit)} note="Delivered profit" emphasis />
          <Metric label="Need confirmation" value={String(dashboard.today.waitingConfirmation)} note="Orders waiting for action" />
          <Metric label="Customer chats" value={String(dashboard.today.unreadChats)} note={`${dashboard.stats.waitingChats} need attention`} />
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
          <article className="rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.07] to-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-300 text-xs font-black text-black">✦</span>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-100/70">ORVIX AI</p>
                </div>
                <h2 className="mt-3 text-xl font-black sm:text-2xl">Ask your business</h2>
                <p className="mt-1 text-xs font-medium text-white/35">Answers from live ORVIX data.</p>
              </div>
              {assistantMode && <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">{assistantMode === "ai" ? "AI + Live Data" : "Live Data Fallback"}</span>}
            </div>

            <div className="mt-4 min-h-[76px] rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm font-semibold leading-6 text-white/75">{answer}</div>

            <form onSubmit={askAssistant} className="mt-3 flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask: How much did we profit? What needs my attention?"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#111214] px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-white/22 focus:border-violet-300/25"
              />
              <button disabled={busy === "assistant"} className="rounded-xl bg-violet-300 px-5 py-3 text-xs font-black text-black disabled:opacity-40">{busy === "assistant" ? "Thinking…" : "Ask"}</button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Profit today", "Stock status", "Delayed orders", "Top customer"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[10px] font-semibold text-white/42 hover:bg-white/[0.05] hover:text-white/65">{prompt}</button>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">Today</p>
                <h2 className="mt-1 text-lg font-black">Business pulse</h2>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${importantAlerts.length ? "bg-amber-300" : "bg-emerald-300"}`} />
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/58">{dashboard.summaryText}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/admin" className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-center text-xs font-bold text-white/60 hover:bg-white/[0.05]">Orders</Link>
              <Link href="/admin/cashflow" className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-center text-xs font-bold text-white/60 hover:bg-white/[0.05]">Cash Flow</Link>
              <Link href="/admin/inventory" className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-center text-xs font-bold text-white/60 hover:bg-white/[0.05]">Inventory</Link>
              <Link href="/admin/analytics" className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-center text-xs font-bold text-white/60 hover:bg-white/[0.05]">Analytics</Link>
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">Orders</p>
                <h2 className="mt-1 text-lg font-black">Needs action</h2>
              </div>
              <Link href="/admin" className="text-[11px] font-bold text-white/35 hover:text-white/65">View all →</Link>
            </div>

            <div className="mt-4 divide-y divide-white/[0.06]">
              {actionOrders.length === 0 ? (
                <div className="rounded-xl bg-emerald-500/[0.045] px-4 py-5 text-sm font-semibold text-emerald-100/75">No orders need action right now.</div>
              ) : actionOrders.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black">#{order.order_number}</p>
                      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase text-white/35">{statusLabel(order.status)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-white/48">{order.customer_name} · {order.product_name || "Product"} · Qty {order.quantity}</p>
                    {order.bosta_last_error && <p className="mt-1 text-[10px] font-semibold text-red-200/70">Bosta needs attention</p>}
                  </div>
                  <p className="text-xs font-black text-white/72">{money(order.total_price)}</p>
                  <button type="button" disabled={busy === `order-${order.id}`} onClick={() => void processOrder(order)} className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-black disabled:opacity-40">{busy === `order-${order.id}` ? "Working" : "Process"}</button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">Inventory</p>
                <h2 className="mt-1 text-lg font-black">Quick stock</h2>
              </div>
              <Link href="/admin/inventory" className="text-[11px] font-bold text-white/35 hover:text-white/65">Manage →</Link>
            </div>

            <div className="mt-4 space-y-3">
              {dashboard.inventory.map((item) => {
                const draft = stockDrafts[item.id] ?? item.stock_quantity;
                const low = item.is_available && draft <= item.low_stock_limit;
                const changed = draft !== item.stock_quantity;
                return (
                  <div key={item.id} className="rounded-xl border border-white/[0.065] bg-black/15 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{item.product_name}</p>
                        <p className={`mt-1 text-[10px] font-bold ${low ? "text-amber-200/75" : "text-emerald-200/60"}`}>{low ? `Low stock · limit ${item.low_stock_limit}` : "Stock healthy"}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft}
                        onChange={(event) => setStockDrafts((current) => ({ ...current, [item.id]: Math.max(0, Math.round(Number(event.target.value || 0))) }))}
                        className="h-10 w-20 rounded-lg border border-white/[0.08] bg-[#111214] px-2 text-center text-lg font-black text-white outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1.5">
                      {[-5, -1, 1, 5].map((amount) => (
                        <button key={amount} type="button" onClick={() => adjustStock(item, amount)} className="rounded-lg border border-white/[0.065] bg-white/[0.02] py-2 text-[10px] font-bold text-white/48 hover:bg-white/[0.05]">{amount > 0 ? `+${amount}` : amount}</button>
                      ))}
                      <button type="button" disabled={!changed || busy === `stock-${item.id}`} onClick={() => void saveStock(item)} className="rounded-lg bg-white py-2 text-[10px] font-black text-black disabled:opacity-25">Save</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.028] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/28">Attention</p>
              <h2 className="mt-1 text-lg font-black">Important alerts</h2>
            </div>
            <Link href="/admin/command-center/advanced#alerts" className="text-[11px] font-bold text-white/35 hover:text-white/65">All alerts →</Link>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {importantAlerts.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-4 rounded-xl bg-emerald-500/[0.045] px-4 py-4 text-sm font-semibold text-emerald-100/75">Everything looks clear.</div>
            ) : importantAlerts.map((alert) => (
              <Link key={alert.id} href={alert.targetUrl} className="rounded-xl border border-white/[0.065] bg-black/15 p-3.5 transition hover:bg-white/[0.035]">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${alert.severity === "critical" ? "bg-red-300" : alert.severity === "warning" ? "bg-amber-300" : "bg-blue-300"}`} />
                  <p className="text-xs font-black text-white/75">{alert.title}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-5 text-white/32">{alert.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-4 text-[11px] font-medium text-white/25">
          <span>Delivered sales: {money(dashboard.allTime.deliveredSales)} · Real profit: {money(dashboard.allTime.realProfit)}</span>
          <span>Detailed reports, customers, returns and audit live in Advanced.</span>
        </footer>
      </div>
    </main>
  );
}
