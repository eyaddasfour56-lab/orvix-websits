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
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  bosta_status_updated_at?: string;
  bosta_last_error?: string;
  created_at?: string;
};

const statusOptions = [
  { value: "new", label: "Pre-Ordered" },
  { value: "international_transit", label: "In Transit to Egypt" },
  { value: "arrived_egypt", label: "Arrived in Egypt" },
  { value: "in_customs", label: "In Customs" },
  { value: "customs_cleared", label: "Customs Cleared" },
  { value: "received_at_orvix", label: "At ORVIX" },
  { value: "ready_for_courier", label: "Ready for Courier" },
];

function statusLabel(value: unknown) {
  const status = String(value || "new");
  return statusOptions.find((item) => item.value === status)?.label || status.replaceAll("_", " ");
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function canSendToCourier(order: Order) {
  return (
    order.status !== "cancelled" &&
    order.status !== "delivered" &&
    !order.bosta_tracking_number &&
    ["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status || "new"))
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
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

  async function changeStatus(order: Order, nextStatus: string) {
    if (!order.id || busyId || order.bosta_tracking_number || order.status === "cancelled" || order.status === "delivered") return;
    const previous = order.journey_status || "new";
    if (previous === nextStatus) return;

    setBusyId(order.id);
    setMessage("");
    setError("");
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, journey_status: nextStatus } : item));

    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_journey_status", orderIds: [order.id], journeyStatus: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) {
        throw new Error(result.failures?.[0]?.message || result.message || "Could not change order status.");
      }
      setMessage(`${order.order_number || "Order"} → ${statusLabel(nextStatus)}`);
      await loadOrders(true);
    } catch (statusError) {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, journey_status: previous } : item));
      setError(statusError instanceof Error ? statusError.message : "Could not change order status.");
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
      setMessage(`${order.order_number || "Order"} sent to courier.`);
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
    preorders: orders.filter((order) => String(order.journey_status || "new") === "new" && order.status !== "cancelled").length,
    ready: orders.filter((order) => canSendToCourier(order)).length,
    courier: orders.filter((order) => Boolean(order.bosta_tracking_number) && order.status !== "delivered" && order.status !== "cancelled").length,
  }), [orders]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1450px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">ORDERS</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Manage orders</h1>
            <p className="mt-2 text-sm font-medium text-white/38">Change one status. When the order reaches ORVIX, send it to the courier. That’s it.</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button>
        </header>

        <section className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-100/45">What you do</p>
          <div className="mt-2 grid gap-2 text-xs font-semibold text-white/58 md:grid-cols-3">
            <p><span className="font-black text-white">1.</span> Change the Status dropdown manually.</p>
            <p><span className="font-black text-white">2.</span> At ORVIX / Ready → press Send to Courier.</p>
            <p><span className="font-black text-white">3.</span> Courier tracking updates automatically.</p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["All orders", metrics.total],
            ["Pre-Ordered", metrics.preorders],
            ["Ready for courier", metrics.ready],
            ["With courier", metrics.courier],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/25">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, phone or tracking…" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/20 focus:border-white/25" />
        </section>

        {message ? <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="border-b border-white/8 bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.13em] text-white/25">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading && !orders.length ? <tr><td colSpan={6} className="px-4 py-14 text-center text-white/30">Loading orders…</td></tr> : null}
                {!loading && !orders.length ? <tr><td colSpan={6} className="px-4 py-14 text-center text-white/30">No orders found.</td></tr> : null}
                {orders.map((order) => {
                  const locked = Boolean(order.bosta_tracking_number) || order.status === "cancelled" || order.status === "delivered";
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-4">
                        <p className="font-black text-white/82">{order.order_number || "—"}</p>
                        <p className="mt-1 text-[9px] text-white/25">{when(order.created_at)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-white/68">{order.customer_name || "—"}</p>
                        <p className="mt-1 text-[10px] text-white/30">{order.phone || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        {order.status === "cancelled" ? (
                          <div><span className="rounded-full border border-red-300/20 bg-red-400/10 px-2.5 py-1.5 text-[10px] font-black text-red-100">Cancelled</span><p className="mt-2 text-[9px] text-white/25">Last status: {statusLabel(order.journey_status)}</p></div>
                        ) : order.status === "delivered" ? (
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-black text-emerald-100">Delivered</span>
                        ) : order.bosta_tracking_number ? (
                          <div><span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1.5 text-[10px] font-black text-blue-100">With Courier</span><p className="mt-2 text-[9px] text-white/25">Manual status locked</p></div>
                        ) : (
                          <select
                            value={String(order.journey_status || "new")}
                            disabled={locked || busyId === order.id}
                            onChange={(event) => void changeStatus(order, event.target.value)}
                            className="min-w-[190px] rounded-xl border border-white/10 bg-[#151619] px-3 py-2.5 text-xs font-black text-white outline-none disabled:opacity-45"
                          >
                            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {order.bosta_tracking_number ? (
                          <div>
                            <p className="font-black text-blue-100">{order.bosta_state_name || "Tracking active"}</p>
                            <p className="mt-1 text-[9px] text-white/25">{order.bosta_tracking_number}</p>
                            <button type="button" disabled={busyId === order.id} onClick={() => void refreshTracking(order)} className="mt-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] font-black text-white/45">Refresh</button>
                          </div>
                        ) : canSendToCourier(order) ? (
                          <button type="button" disabled={busyId === order.id} onClick={() => void sendToCourier(order)} className="rounded-xl border border-blue-300/20 bg-blue-400/10 px-3 py-2.5 text-[10px] font-black text-blue-100 disabled:opacity-40">Send to Courier</button>
                        ) : (
                          <p className="text-[10px] font-semibold text-white/25">Not ready yet</p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-black text-white/75">{money(order.total_price)}</td>
                      <td className="px-4 py-4">
                        <Link href={`/admin/orders/${order.id}`} className="inline-flex rounded-xl bg-white px-3 py-2.5 text-[10px] font-black text-black">Open order</Link>
                      </td>
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
