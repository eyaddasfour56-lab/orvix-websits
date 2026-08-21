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

type StatusOption = {
  value: string;
  label: string;
  note: string;
};

const statusOptions: StatusOption[] = [
  { value: "new", label: "Pre-Ordered", note: "Outside Egypt / waiting to move" },
  { value: "international_transit", label: "In Transit to Egypt", note: "On the way from abroad" },
  { value: "arrived_egypt", label: "Arrived in Egypt", note: "The item is now in Egypt" },
  { value: "in_customs", label: "In Customs", note: "Being processed by customs" },
  { value: "customs_cleared", label: "Customs Cleared", note: "Released from customs" },
  { value: "received_at_orvix", label: "At ORVIX", note: "ORVIX physically has the item" },
  { value: "ready_for_courier", label: "Ready for Courier", note: "Packed and ready to send" },
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
  const [statusMenuOrder, setStatusMenuOrder] = useState<Order | null>(null);

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
      if (statusMenuOrder) {
        const fresh = (Array.isArray(result.orders) ? result.orders : []).find((item: Order) => item.id === statusMenuOrder.id);
        if (fresh) setStatusMenuOrder(fresh);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [search, statusMenuOrder]);

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
      setStatusMenuOrder(null);
      await loadOrders(true);
    } catch (statusError) {
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, journey_status: previous } : item));
      setError(statusError instanceof Error ? statusError.message : "Could not change order status.");
    } finally {
      setBusyId("");
    }
  }

  async function changeOrderState(order: Order, nextState: "new" | "delivered" | "cancelled") {
    if (!order.id || busyId) return;
    if (nextState === "cancelled" && !window.confirm("Cancel this order? Its last real status will stay saved.")) return;
    if (nextState === "delivered" && !window.confirm("Mark this order as delivered to the customer?")) return;
    if (nextState === "new" && !window.confirm("Reopen this order as active? Its last journey status will stay saved.")) return;

    setBusyId(order.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", orderIds: [order.id], status: nextState }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) {
        throw new Error(result.failures?.[0]?.message || result.message || "Could not update order state.");
      }
      setMessage(nextState === "delivered" ? `${order.order_number || "Order"} → Delivered` : nextState === "cancelled" ? `${order.order_number || "Order"} → Cancelled` : `${order.order_number || "Order"} reopened`);
      setStatusMenuOrder(null);
      await loadOrders(true);
    } catch (stateError) {
      setError(stateError instanceof Error ? stateError.message : "Could not update order state.");
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
      setStatusMenuOrder(null);
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

  const modalOrder = statusMenuOrder;
  const modalBusy = modalOrder ? busyId === modalOrder.id : false;
  const manualLocked = Boolean(modalOrder?.bosta_tracking_number) || modalOrder?.status === "cancelled" || modalOrder?.status === "delivered";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1450px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">ORDERS</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Manage orders</h1>
            <p className="mt-2 text-sm font-medium text-white/38">Every order has one Change Status button. Pick the real status and you are done.</p>
          </div>
          <button type="button" onClick={() => void loadOrders()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button>
        </header>

        <section className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-100/45">Simple flow</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-white/58">Press <span className="font-black text-white">Change Status</span> beside any order → choose where it is now → when it reaches ORVIX, send it to the courier from the same menu.</p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["All orders", metrics.total], ["Pre-Ordered", metrics.preorders], ["Ready for courier", metrics.ready], ["With courier", metrics.courier]].map(([label, value]) => (
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
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="border-b border-white/8 bg-white/[0.025] text-[9px] font-black uppercase tracking-[0.13em] text-white/25">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3">Quick Change</th>
                  <th className="px-4 py-3">Courier</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {loading && !orders.length ? <tr><td colSpan={7} className="px-4 py-14 text-center text-white/30">Loading orders…</td></tr> : null}
                {!loading && !orders.length ? <tr><td colSpan={7} className="px-4 py-14 text-center text-white/30">No orders found.</td></tr> : null}
                {orders.map((order) => {
                  const currentStatus = order.status === "cancelled" ? "Cancelled" : order.status === "delivered" ? "Delivered" : order.bosta_tracking_number ? (order.bosta_state_name || "With Courier") : statusLabel(order.journey_status);
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
                        <span className={`rounded-full border px-2.5 py-1.5 text-[10px] font-black ${order.status === "cancelled" ? "border-red-300/20 bg-red-400/10 text-red-100" : order.status === "delivered" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : order.bosta_tracking_number ? "border-blue-300/20 bg-blue-400/10 text-blue-100" : "border-white/10 bg-white/[0.04] text-white/70"}`}>{currentStatus}</span>
                        {order.status === "cancelled" ? <p className="mt-2 text-[9px] text-white/25">Last: {statusLabel(order.journey_status)}</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        <button type="button" disabled={busyId === order.id} onClick={() => setStatusMenuOrder(order)} className="rounded-xl bg-white px-3.5 py-2.5 text-[10px] font-black text-black transition hover:bg-white/90 disabled:opacity-40">Change Status</button>
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
                          <p className="text-[10px] font-semibold text-white/25">Not with courier</p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-black text-white/75">{money(order.total_price)}</td>
                      <td className="px-4 py-4"><Link href={`/admin/orders/${order.id}`} className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[10px] font-black text-white/65">Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalOrder ? (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => !modalBusy && setStatusMenuOrder(null)}>
          <section className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#121316] p-4 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/28">CHANGE STATUS</p>
                <h2 className="mt-2 text-xl font-black text-white">{modalOrder.order_number || "Order"}</h2>
                <p className="mt-1 text-xs font-semibold text-white/35">{modalOrder.customer_name || "Customer"} · Current: {modalOrder.status === "cancelled" ? "Cancelled" : modalOrder.status === "delivered" ? "Delivered" : modalOrder.bosta_tracking_number ? (modalOrder.bosta_state_name || "With Courier") : statusLabel(modalOrder.journey_status)}</p>
              </div>
              <button type="button" disabled={modalBusy} onClick={() => setStatusMenuOrder(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 text-lg text-white/45">×</button>
            </div>

            {!manualLocked ? (
              <div className="mt-5 grid gap-2">
                {statusOptions.map((option) => {
                  const active = String(modalOrder.journey_status || "new") === option.value;
                  return (
                    <button key={option.value} type="button" disabled={modalBusy || active} onClick={() => void changeStatus(modalOrder, option.value)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition disabled:cursor-default ${active ? "border-white/20 bg-white text-black" : "border-white/8 bg-white/[0.025] text-white hover:bg-white/[0.06]"}`}>
                      <span><span className="block text-sm font-black">{option.label}</span><span className={`mt-1 block text-[10px] font-semibold ${active ? "text-black/45" : "text-white/28"}`}>{option.note}</span></span>
                      <span className={`text-sm ${active ? "text-black" : "text-white/25"}`}>{active ? "✓" : "→"}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs font-semibold leading-6 text-white/42">
                {modalOrder.bosta_tracking_number ? "Courier tracking is live, so import status is automatic now." : `This order is ${modalOrder.status}. Reopen it if you need to change its journey again.`}
              </div>
            )}

            <div className="mt-4 border-t border-white/8 pt-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">QUICK ACTIONS</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {canSendToCourier(modalOrder) ? <button type="button" disabled={modalBusy} onClick={() => void sendToCourier(modalOrder)} className="rounded-2xl border border-blue-300/20 bg-blue-400/10 px-3 py-3 text-[10px] font-black text-blue-100">Send to Courier</button> : null}
                {modalOrder.bosta_tracking_number ? <button type="button" disabled={modalBusy} onClick={() => void refreshTracking(modalOrder)} className="rounded-2xl border border-blue-300/20 bg-blue-400/10 px-3 py-3 text-[10px] font-black text-blue-100">Refresh Courier</button> : null}
                {modalOrder.status !== "delivered" ? <button type="button" disabled={modalBusy} onClick={() => void changeOrderState(modalOrder, "delivered")} className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-3 text-[10px] font-black text-emerald-100">Delivered to Customer</button> : null}
                {modalOrder.status !== "cancelled" ? <button type="button" disabled={modalBusy} onClick={() => void changeOrderState(modalOrder, "cancelled")} className="rounded-2xl border border-red-300/20 bg-red-400/10 px-3 py-3 text-[10px] font-black text-red-100">Cancel Order</button> : null}
                {(modalOrder.status === "cancelled" || modalOrder.status === "delivered") ? <button type="button" disabled={modalBusy} onClick={() => void changeOrderState(modalOrder, "new")} className="col-span-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-3 text-[10px] font-black text-amber-100">Reopen Order</button> : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
