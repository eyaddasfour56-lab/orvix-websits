"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Order = Record<string, unknown> & {
  id: string;
  order_number?: string;
  customer_name?: string;
  phone?: string;
  customer_email?: string;
  governorate?: string;
  address?: string;
  notes?: string;
  product_name?: string;
  colour?: string;
  quantity?: number;
  products_total?: number | string;
  delivery_fee?: number | string;
  discount_amount?: number | string;
  total_price?: number | string;
  payment_status?: string;
  status?: string;
  journey_status?: string;
  estimated_delivery_from?: string;
  estimated_delivery_to?: string;
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  bosta_status_updated_at?: string;
  bosta_last_error?: string;
  internal_notes?: string;
  created_at?: string;
};

type Detail = {
  success: boolean;
  order: Order;
  items: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
  customerHistory: Array<Record<string, unknown>>;
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

function titleCase(value: unknown) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id || "");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders-v2?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load order.");
      setDetail(result as Detail);
      setNote(String(result.order?.internal_notes || ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load order.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const interval = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  const order = detail?.order;
  const cancelled = order?.status === "cancelled";
  const delivered = order?.status === "delivered";
  const courierLive = Boolean(order?.bosta_tracking_number);
  const canSend = Boolean(order && !cancelled && !delivered && !courierLive && ["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status || "")));

  async function runAction(body: Record<string, unknown>, successMessage: string) {
    if (!order || busy) return;
    setBusy(String(body.action || "action"));
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, orderIds: [order.id] }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) throw new Error(result.failures?.[0]?.message || result.message || "Order update failed.");
      setMessage(successMessage);
      await load(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Order update failed.");
    } finally {
      setBusy("");
    }
  }

  async function setStatus(value: string) {
    await runAction({ action: "set_journey_status", journeyStatus: value }, `Status changed to ${statusLabel(value)}.`);
  }

  async function saveNote() {
    await runAction({ action: "set_note", note }, "Internal note saved.");
  }

  async function cancelOrder() {
    if (!order || cancelled || delivered || !window.confirm("Cancel this order?")) return;
    await runAction({ action: "cancel" }, "Order cancelled. The last status was kept in the history.");
  }

  async function sendToCourier() {
    if (!order || !canSend || busy) return;
    setBusy("courier");
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/dispatch-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Could not send to courier.");
      setMessage("Sent to courier. Live tracking is now automatic.");
      await load(true);
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Could not send to courier.");
    } finally {
      setBusy("");
    }
  }

  async function refreshCourier() {
    if (!order || !courierLive || busy) return;
    setBusy("refresh");
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
      setMessage("Courier tracking refreshed.");
      await load(true);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh tracking.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#0b0c0e] p-8 text-white"><p className="text-sm text-white/40">Loading order…</p></main>;
  if (!order) return <main className="min-h-screen bg-[#0b0c0e] p-8 text-white"><p className="text-sm text-red-200">{error || "Order not found."}</p></main>;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1150px]">
        <Link href="/admin/fulfillment" className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">← Back to Orders</Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">ORDER</p><h1 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">{order.order_number || "Order"}</h1><p className="mt-1 text-xs text-white/35">{order.customer_name || "Customer"} · {order.phone || "—"}</p></div>
          {cancelled ? <span className="rounded-full border border-red-300/20 bg-red-400/10 px-3 py-2 text-[10px] font-black text-red-100">CANCELLED</span> : delivered ? <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black text-emerald-100">DELIVERED</span> : <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-white/50">ACTIVE</span>}
        </header>

        {message ? <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Order Status</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {cancelled ? (
              <div><p className="text-lg font-black text-red-100">Cancelled</p><p className="mt-1 text-xs text-white/30">Last status: {statusLabel(order.journey_status)}</p></div>
            ) : delivered ? (
              <p className="text-lg font-black text-emerald-100">Delivered</p>
            ) : courierLive ? (
              <div><p className="text-lg font-black text-blue-100">With Courier</p><p className="mt-1 text-xs text-white/30">Manual status is locked after courier handoff.</p></div>
            ) : (
              <select value={String(order.journey_status || "new")} disabled={!!busy} onChange={(event) => void setStatus(event.target.value)} className="min-w-[240px] rounded-xl border border-white/10 bg-[#151619] px-4 py-3 text-sm font-black outline-none disabled:opacity-50">
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            )}
          </div>
          {!cancelled && !delivered && !courierLive ? <p className="mt-3 text-[11px] leading-5 text-white/28">You change this manually. New orders start as Pre-Ordered.</p> : null}
        </section>

        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Courier</p><h2 className="mt-1 text-lg font-black">{courierLive ? order.bosta_state_name || "Live tracking active" : canSend ? "Ready to send" : "Not with courier yet"}</h2>{order.bosta_tracking_number ? <p className="mt-1 text-[10px] text-white/30">Tracking: {order.bosta_tracking_number}</p> : null}</div>
            {courierLive ? <button type="button" disabled={!!busy} onClick={() => void refreshCourier()} className="rounded-xl border border-blue-300/20 bg-blue-400/10 px-4 py-3 text-[10px] font-black text-blue-100 disabled:opacity-40">Refresh tracking</button> : canSend ? <button type="button" disabled={!!busy} onClick={() => void sendToCourier()} className="rounded-xl bg-white px-4 py-3 text-[10px] font-black text-black disabled:opacity-40">Send to Courier</button> : null}
          </div>
          {!courierLive && !canSend ? <p className="mt-3 text-[11px] text-white/28">Set the status to At ORVIX or Ready for Courier first.</p> : null}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Customer</p><p className="mt-2 text-sm font-black">{order.customer_name || "—"}</p><p className="mt-1 text-[10px] text-white/35">{order.phone || "—"}</p></article>
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Delivery</p><p className="mt-2 text-sm font-black">{order.governorate || "—"}</p><p className="mt-1 text-[10px] leading-5 text-white/35">{order.address || "—"}</p></article>
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Payment</p><p className="mt-2 text-sm font-black">{titleCase(order.payment_status || "pending")}</p><p className="mt-1 text-[10px] text-white/35">{money(order.total_price)}</p></article>
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Created</p><p className="mt-2 text-sm font-black">{when(order.created_at)}</p><p className="mt-1 text-[10px] text-white/35">ETA: {order.estimated_delivery_from || "—"}</p></article>
        </section>

        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Items</p><h2 className="mt-1 text-lg font-black">What the customer ordered</h2></div><p className="text-sm font-black">{money(order.total_price)}</p></div>
          <div className="mt-4 space-y-2">
            {(detail?.items || []).length ? (detail?.items || []).map((item, index) => (
              <div key={String(item.id || index)} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3"><div><p className="text-sm font-black text-white/75">{String(item.product_name || item.productName || order.product_name || "Product")}</p><p className="mt-1 text-[10px] text-white/30">{String(item.colour || item.variant_label || order.colour || "")} · Qty {String(item.quantity || 1)}</p></div><p className="text-xs font-black">{money(item.line_total || item.total_price || order.products_total)}</p></div>
            )) : <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><p className="text-sm font-black text-white/75">{order.product_name || "Product"}</p><p className="mt-1 text-[10px] text-white/30">{order.colour || ""} · Qty {order.quantity || 1}</p></div>}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Internal Note</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Only admins can see this…" className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/20" />
          <button type="button" disabled={!!busy} onClick={() => void saveNote()} className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[10px] font-black text-white/60 disabled:opacity-40">Save note</button>
        </section>

        {!cancelled && !delivered ? <button type="button" disabled={!!busy} onClick={() => void cancelOrder()} className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.05] px-4 py-3 text-[10px] font-black text-red-200 disabled:opacity-40">Cancel order</button> : null}

        <details className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
          <summary className="cursor-pointer text-sm font-black text-white/55">Advanced details</summary>
          <p className="mt-2 text-[11px] text-white/25">Technical timeline and courier events. You normally do not need this.</p>
          <div className="mt-4 space-y-2">
            {(detail?.timeline || []).length ? (detail?.timeline || []).map((event, index) => (
              <div key={String(event.id || index)} className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-white/65">{String(event.title || event.event_type || "Update")}</p><p className="text-[9px] text-white/25">{when(event.created_at)}</p></div><p className="mt-1 text-[10px] leading-5 text-white/28">{String(event.details || event.status || "")}</p></div>
            )) : <p className="text-xs text-white/25">No advanced events yet.</p>}
          </div>
        </details>
      </div>
    </main>
  );
}
