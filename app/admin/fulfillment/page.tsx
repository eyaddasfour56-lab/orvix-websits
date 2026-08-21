"use client";

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
  item_count?: number;
  total_price?: number | string;
  payment_status?: string;
  status?: string;
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  bosta_status_updated_at?: string;
  bosta_last_error?: string;
  created_at?: string;
};

const statusOptions = [
  { value: "new", label: "Pre-Order" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function money(value: unknown) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: unknown) {
  const value = String(status || "new");
  return statusOptions.find((item) => item.value === value)?.label || value.replaceAll("_", " ");
}

function statusTone(status: unknown) {
  const value = String(status || "new");
  if (value === "delivered") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  if (value === "cancelled") return "border-red-300/20 bg-red-400/10 text-red-100";
  if (value === "shipped" || value === "out_for_delivery") return "border-blue-300/20 bg-blue-400/10 text-blue-100";
  if (value === "confirmed") return "border-violet-300/20 bg-violet-400/10 text-violet-100";
  return "border-white/10 bg-white/[0.05] text-white/65";
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

  async function changeStatus(order: Order, nextStatus: string) {
    if (!order.id || busyId) return;
    const previousStatus = order.status || "new";
    if (previousStatus === nextStatus) return;

    setBusyId(order.id);
    setMessage("");
    setError("");
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));

    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", orderIds: [order.id], status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) throw new Error(result.message || "Could not change order status.");
      setMessage(`${order.order_number || "Order"} → ${statusLabel(nextStatus)}`);
      await loadOrders(true);
    } catch (statusError) {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: previousStatus } : item));
      setError(statusError instanceof Error ? statusError.message : "Could not change order status.");
    } finally {
      setBusyId("");
    }
  }

  async function sendToCourier(order: Order) {
    if (!order.id || busyId || order.status === "cancelled") return;
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
      setMessage(`${order.order_number || "Order"} sent to Bosta.`);
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
    preorder: orders.filter((order) => (order.status || "new") === "new").length,
    active: orders.filter((order) => ["confirmed", "shipped", "out_for_delivery"].includes(String(order.status))).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
  }), [orders]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">ORVIX ORDERS</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Orders</h1>
            <p className="mt-2 text-sm font-medium text-white/35">Click the status on any order and change it instantly. Courier tracking stays in the same row.</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["All Orders", metrics.total],
            ["Pre-Orders", metrics.preorder],
            ["Active", metrics.active],
            ["Delivered", metrics.delivered],
          ].map(([label, value]) => (
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
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="border-b border-white/8 bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.13em] text-white/25">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-white/30">Loading orders…</td></tr> : null}
                {!loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-14 text-center text-white/30">No orders found.</td></tr> : null}
                {orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-4"><p className="font-black text-white/80">{order.order_number || "—"}</p><p className="mt-1 text-[9px] text-white/25">{order.governorate || "—"}</p></td>
                    <td className="px-4 py-4"><p className="font-bold text-white/65">{order.customer_name || "—"}</p><p className="mt-1 text-[10px] text-white/30">{order.phone || "—"}</p></td>
                    <td className="px-4 py-4"><p className="font-bold text-white/60">{order.product_name || "ORVIX Product"}</p><p className="mt-1 text-[10px] text-white/25">{order.colour || "Standard"} · {order.quantity || 1}×</p></td>
                    <td className="px-4 py-4 font-black">{money(order.total_price)}</td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex rounded-xl border ${statusTone(order.status)}`}>
                        <select
                          aria-label={`Status for ${order.order_number || "order"}`}
                          value={order.status || "new"}
                          disabled={busyId === order.id}
                          onChange={(event) => void changeStatus(order, event.target.value)}
                          className="cursor-pointer appearance-none bg-transparent px-3 py-2 pr-7 text-[10px] font-black outline-none disabled:cursor-wait disabled:opacity-50"
                        >
                          {statusOptions.map((item) => <option key={item.value} value={item.value} className="bg-[#151619] text-white">{item.label}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black text-white/45">{String(order.payment_status || "pending").replaceAll("_", " ").toUpperCase()}</span></td>
                    <td className="px-4 py-4">
                      {order.bosta_tracking_number ? (
                        <div className="min-w-[180px]">
                          <p className="max-w-[220px] truncate text-[10px] font-black text-blue-100">{order.bosta_state_name || "Tracking active"}</p>
                          <p className="mt-1 text-[9px] text-white/25">{order.bosta_tracking_number}</p>
                          <button type="button" disabled={busyId === order.id} onClick={() => void refreshTracking(order)} className="mt-2 rounded-lg border border-blue-300/15 bg-blue-400/[0.06] px-2.5 py-1.5 text-[9px] font-black text-blue-200 disabled:opacity-40">Refresh</button>
                        </div>
                      ) : (
                        <button type="button" disabled={busyId === order.id || order.status === "cancelled"} onClick={() => void sendToCourier(order)} className="rounded-xl border border-blue-300/15 bg-blue-400/[0.06] px-3 py-2 text-[10px] font-black text-blue-200 disabled:opacity-30">{busyId === order.id ? "Working…" : "Send to Courier"}</button>
                      )}
                      {order.bosta_last_error ? <p className="mt-2 max-w-[220px] text-[9px] font-semibold text-red-200/70">{order.bosta_last_error}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-[10px] text-white/30">{when(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
