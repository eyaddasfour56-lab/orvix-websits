"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  order_number?: string;
  customer_name?: string;
  phone?: string;
  governorate?: string;
  product_name?: string;
  colour?: string;
  quantity?: number;
  total_price?: number | string;
  payment_status?: string;
  status?: string;
  journey_status?: string;
  journey_updated_at?: string;
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  bosta_status_updated_at?: string;
  bosta_last_error?: string;
  created_at?: string;
};

const journeyOptions = [
  { value: "new", label: "Pre-Ordered", group: "International Pre-Order" },
  { value: "international_transit", label: "In Transit to Egypt", group: "International Pre-Order" },
  { value: "arrived_egypt", label: "Arrived in Egypt", group: "Egypt Import" },
  { value: "in_customs", label: "In Customs", group: "Egypt Import" },
  { value: "customs_cleared", label: "Customs Cleared", group: "Egypt Import" },
  { value: "received_at_orvix", label: "Received at ORVIX", group: "ORVIX Handling" },
  { value: "ready_for_courier", label: "Ready for Courier", group: "ORVIX Handling" },
];

const workflowCards = [
  {
    step: "01",
    title: "International Pre-Order Tracking",
    subtitle: "Pre-Ordered → In Transit to Egypt",
    mode: "MANUAL",
  },
  {
    step: "02",
    title: "Egypt Import Tracking",
    subtitle: "Arrived in Egypt → In Customs → Customs Cleared",
    mode: "MANUAL",
  },
  {
    step: "03",
    title: "ORVIX Handling",
    subtitle: "Received at ORVIX → Ready for Courier",
    mode: "MANUAL",
  },
  {
    step: "04",
    title: "Live Courier Tracking",
    subtitle: "Bosta pickup → hubs → out for delivery → delivered",
    mode: "AUTOMATIC",
  },
];

function money(value: unknown) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function journeyLabel(value: unknown) {
  const status = String(value || "new");
  return journeyOptions.find((item) => item.value === status)?.label || status.replaceAll("_", " ");
}

function journeyTone(value: unknown) {
  const status = String(value || "new");
  if (["international_transit"].includes(status)) return "border-sky-300/20 bg-sky-400/10 text-sky-100";
  if (["arrived_egypt", "in_customs", "customs_cleared"].includes(status)) return "border-amber-300/20 bg-amber-400/10 text-amber-100";
  if (["received_at_orvix", "ready_for_courier"].includes(status)) return "border-violet-300/20 bg-violet-400/10 text-violet-100";
  return "border-white/10 bg-white/[0.05] text-white/70";
}

function orderState(order: Order) {
  if (order.status === "cancelled") return { label: "Cancelled", cls: "border-red-300/20 bg-red-400/10 text-red-100" };
  if (order.status === "delivered") return { label: "Delivered", cls: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" };
  return { label: "Active", cls: "border-white/10 bg-white/[0.04] text-white/55" };
}

function canSendToCourier(order: Order) {
  return (
    order.status !== "cancelled" &&
    !order.bosta_tracking_number &&
    ["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status || "new"))
  );
}

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/orders-v2?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load orders.");
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 180);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadOrders(true), 30000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  async function changeJourney(order: Order, nextJourney: string) {
    if (!order.id || busyId || order.bosta_tracking_number || order.status === "cancelled") return;
    const previousJourney = order.journey_status || "new";
    if (previousJourney === nextJourney) return;

    setBusyId(order.id);
    setMessage("");
    setError("");
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, journey_status: nextJourney } : item));

    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_journey_status", orderIds: [order.id], journeyStatus: nextJourney }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) {
        throw new Error(result.failures?.[0]?.message || result.message || "Could not change journey stage.");
      }
      setMessage(`${order.order_number || "Order"} journey → ${journeyLabel(nextJourney)}`);
      await loadOrders(true);
    } catch (journeyError) {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, journey_status: previousJourney } : item));
      setError(journeyError instanceof Error ? journeyError.message : "Could not change journey stage.");
    } finally {
      setBusyId("");
    }
  }

  async function sendToCourier(order: Order) {
    if (!order.id || busyId || !canSendToCourier(order)) return;
    setBusyId(order.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/dispatch-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Could not send order to courier.");
      setMessage(`${order.order_number || "Order"} → Courier Requested`);
      await loadOrders(true);
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Could not send order to courier.");
    } finally {
      setBusyId("");
    }
  }

  async function refreshTracking(order: Order) {
    if (!order.id || busyId || !order.bosta_tracking_number) return;
    setBusyId(order.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not refresh tracking.");
      setMessage(`${order.order_number || "Order"} tracking refreshed.`);
      await loadOrders(true);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh tracking.");
    } finally {
      setBusyId("");
    }
  }

  const metrics = useMemo(() => ({
    total: orders.length,
    importing: orders.filter((order) => ["new", "international_transit", "arrived_egypt", "in_customs", "customs_cleared"].includes(String(order.journey_status || "new")) && order.status !== "cancelled").length,
    atOrvix: orders.filter((order) => ["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status)) && order.status !== "cancelled").length,
    courier: orders.filter((order) => Boolean(order.bosta_tracking_number) && order.status !== "delivered" && order.status !== "cancelled").length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
  }), [orders]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1650px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">ORVIX ORDER CONTROL</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Orders & Journey Tracking</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-white/40">Journey Stage and Order State are now separate. Cancelling an order never erases the last real journey milestone.</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {workflowCards.map((card) => (
            <article key={card.step} className="rounded-[22px] border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black text-white/20">{card.step}</span>
                <span className={`rounded-full border px-2 py-1 text-[8px] font-black ${card.mode === "AUTOMATIC" ? "border-blue-300/20 bg-blue-400/10 text-blue-100" : "border-white/10 bg-white/[0.04] text-white/40"}`}>{card.mode}</span>
              </div>
              <h2 className="mt-3 text-sm font-black text-white/80">{card.title}</h2>
              <p className="mt-2 text-[10px] font-medium leading-5 text-white/30">{card.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["All Orders", metrics.total], ["Importing", metrics.importing], ["At ORVIX", metrics.atOrvix], ["Cancelled", metrics.cancelled]].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number, customer, phone, product or tracking…" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/20 focus:border-white/25" />
        </section>

        {message ? <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1380px] text-left text-xs">
              <thead className="border-b border-white/8 bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.13em] text-white/25">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Journey Stage</th>
                  <th className="px-4 py-3">Order State</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-white/30">Loading orders…</td></tr> : null}
                {!loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-white/30">No orders found.</td></tr> : null}
                {orders.map((order) => {
                  const state = orderState(order);
                  const locked = Boolean(order.bosta_tracking_number) || order.status === "cancelled" || order.status === "delivered";
                  return (
                    <tr key={order.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-4 py-4"><p className="font-black text-white/80">{order.order_number || "—"}</p><p className="mt-1 text-[9px] text-white/25">{order.governorate || "—"} · {when(order.created_at)}</p></td>
                      <td className="px-4 py-4"><p className="font-bold text-white/65">{order.customer_name || "—"}</p><p className="mt-1 text-[10px] text-white/30">{order.phone || "—"}</p></td>
                      <td className="px-4 py-4"><p className="font-bold text-white/60">{order.product_name || "ORVIX Product"}</p><p className="mt-1 text-[10px] text-white/25">{order.colour || "Standard"} · {order.quantity || 1}×</p></td>
                      <td className="px-4 py-4">
                        <div className={`inline-flex rounded-xl border ${journeyTone(order.journey_status)}`}>
                          <select
                            aria-label={`Journey stage for ${order.order_number || "order"}`}
                            value={order.journey_status || "new"}
                            disabled={busyId === order.id || locked}
                            onChange={(event) => void changeJourney(order, event.target.value)}
                            className="cursor-pointer appearance-none bg-transparent px-3 py-2 pr-7 text-[10px] font-black outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {journeyOptions.map((item) => <option key={item.value} value={item.value} className="bg-[#151619] text-white">{item.label}</option>)}
                          </select>
                        </div>
                        <p className="mt-1 text-[9px] text-white/20">{locked && order.bosta_tracking_number ? "Locked: live courier tracking" : locked && order.status === "cancelled" ? "Preserved after cancellation" : "Manual before courier"}</p>
                      </td>
                      <td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1.5 text-[9px] font-black ${state.cls}`}>{state.label}</span><p className="mt-2 text-[9px] text-white/20">Payment: {String(order.payment_status || "pending").toUpperCase()}</p></td>
                      <td className="px-4 py-4">
                        {order.bosta_tracking_number ? (
                          <div className="min-w-[190px]">
                            <div className="inline-flex items-center gap-2 text-[10px] font-black text-blue-100"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-200" /> LIVE</div>
                            <p className="mt-1 max-w-[220px] truncate text-[10px] font-black text-white/60">{order.bosta_state_name || "Courier Tracking"}</p>
                            <p className="mt-1 text-[9px] text-white/25">{order.bosta_tracking_number}</p>
                            <button type="button" disabled={busyId === order.id} onClick={() => void refreshTracking(order)} className="mt-2 rounded-lg border border-blue-300/15 bg-blue-400/[0.06] px-2.5 py-1.5 text-[9px] font-black text-blue-200 disabled:opacity-40">Refresh</button>
                          </div>
                        ) : canSendToCourier(order) ? (
                          <button type="button" disabled={busyId === order.id} onClick={() => void sendToCourier(order)} className="rounded-xl border border-blue-300/20 bg-blue-400/[0.08] px-3 py-2 text-[10px] font-black text-blue-100 disabled:opacity-30">{busyId === order.id ? "Sending…" : "Send to Courier"}</button>
                        ) : (
                          <p className="max-w-[190px] text-[9px] font-semibold leading-4 text-white/25">Courier becomes available after <span className="text-violet-200/70">Received at ORVIX</span>.</p>
                        )}
                        {order.bosta_last_error ? <p className="mt-2 max-w-[220px] text-[9px] font-semibold text-red-200/70">{order.bosta_last_error}</p> : null}
                      </td>
                      <td className="px-4 py-4 font-black">{money(order.total_price)}</td>
                      <td className="px-4 py-4"><Link href={`/admin/orders/${order.id}`} className="inline-flex rounded-xl bg-white px-3 py-2 text-[10px] font-black text-black transition hover:bg-white/85">Open Journey →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
