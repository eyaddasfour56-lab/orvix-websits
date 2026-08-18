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
  item_count?: number;
  order_type?: string;
  products_total?: number | string;
  delivery_fee?: number | string;
  discount_amount?: number | string;
  total_price?: number | string;
  status?: string;
  payment_status?: string;
  shipping_status?: string;
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  internal_notes?: string;
  risk_score?: number;
  created_at?: string;
};

type Detail = {
  order: Order & Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
  customerHistory: Order[];
};

const statusOptions = ["all", "new", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];
const paymentOptions = ["all", "pending", "paid", "partially_refunded", "refunded"];

function money(value: unknown) {
  const number = Number(value || 0);
  return `${Number.isFinite(number) ? Math.round(number).toLocaleString("en-GB") : "0"} EGP`;
}

function label(value: unknown) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function phoneForWhatsApp(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `20${digits.slice(1)}`;
  if (!digits.startsWith("20")) digits = `20${digits}`;
  return digits;
}

function statusClass(status: unknown) {
  const value = String(status || "");
  if (value === "delivered") return "bg-emerald-400/10 text-emerald-200 border-emerald-300/15";
  if (value === "cancelled") return "bg-red-400/10 text-red-200 border-red-300/15";
  if (value === "confirmed") return "bg-blue-400/10 text-blue-200 border-blue-300/15";
  if (value === "shipped" || value === "out_for_delivery") return "bg-amber-400/10 text-amber-200 border-amber-300/15";
  return "bg-white/[0.05] text-white/55 border-white/10";
}

export default function OrdersV2Page() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      if (payment !== "all") params.set("payment", payment);
      const response = await fetch(`/api/admin/orders-v2?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load orders.");
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [payment, search, status]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders-v2?orderId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load order details.");
      setDetail(result as Detail);
      setNote(String(result.order?.internal_notes || ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load order details.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 220);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => void loadOrders(), 30000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const metrics = useMemo(() => ({
    total: orders.length,
    newOrders: orders.filter((order) => order.status === "new").length,
    unpaid: orders.filter((order) => (order.payment_status || "pending") === "pending" && order.status !== "cancelled").length,
    preorder: orders.filter((order) => ["preorder", "mixed"].includes(String(order.order_type))).length,
    sales: orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total_price || 0), 0),
  }), [orders]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) => current.size === orders.length ? new Set() : new Set(orders.map((order) => order.id)));
  }

  async function runAction(action: string, ids: string[] = detailId ? [detailId] : []) {
    if (!ids.length || busy) return;
    setBusy(action);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderIds: ids, note: action === "set_note" ? note : undefined }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) throw new Error(result.message || "Action failed.");
      setMessage(result.message || "Order updated.");
      await loadOrders();
      if (detailId && ids.includes(detailId)) await loadDetail(detailId);
      if (ids.length > 1) setSelected(new Set());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusy("");
    }
  }

  async function sendToBosta(ids: string[]) {
    if (!ids.length || busy) return;
    setBusy("bosta");
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/dispatch-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: ids }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Could not send order to Bosta.");
      setMessage(ids.length === 1 ? "Order sent to Bosta." : `${ids.length} orders sent to Bosta.`);
      await loadOrders();
      if (detailId && ids.includes(detailId)) await loadDetail(detailId);
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Could not send to Bosta.");
    } finally {
      setBusy("");
    }
  }

  const selectedIds = Array.from(selected);
  const current = detail?.order;
  const whatsappHref = current?.phone
    ? `https://wa.me/${phoneForWhatsApp(current.phone)}?text=${encodeURIComponent(`Hello ${current.customer_name || ""}, this is ORVIX regarding order ${current.order_number || ""}.`)}`
    : "#";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">ORVIX OPERATIONS</p><h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">Orders V2</h1><p className="mt-2 text-sm text-white/35">Search, bulk actions, payments, notes, customer history and order timelines in one place.</p></div><button type="button" onClick={() => void loadOrders()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button></div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[{ label: "Visible orders", value: metrics.total }, { label: "New", value: metrics.newOrders }, { label: "Payment pending", value: metrics.unpaid }, { label: "Pre-order / mixed", value: metrics.preorder }, { label: "Sales in view", value: money(metrics.sales) }].map((metric) => <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/25">{metric.label}</p><p className="mt-2 text-xl font-black">{metric.value}</p></div>)}
        </section>

        <section className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order #, name, phone, city, product, tracking…" className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-white/25" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-white/10 bg-[#151619] px-3 py-3 text-xs font-bold">{statusOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={payment} onChange={(event) => setPayment(event.target.value)} className="rounded-xl border border-white/10 bg-[#151619] px-3 py-3 text-xs font-bold">{paymentOptions.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <button type="button" onClick={() => { setSearch(""); setStatus("all"); setPayment("all"); }} className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black text-white/45">Reset</button>
          </div>
        </section>

        {selectedIds.length ? <section className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-300/15 bg-blue-400/[0.05] p-3"><span className="mr-2 text-xs font-black text-blue-100">{selectedIds.length} selected</span><button type="button" disabled={!!busy} onClick={() => void runAction("confirm", selectedIds)} className="rounded-xl bg-white px-3 py-2 text-[11px] font-black text-black">Confirm</button><button type="button" disabled={!!busy} onClick={() => void runAction("mark_paid", selectedIds)} className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-2 text-[11px] font-black text-emerald-200">Mark paid</button><button type="button" disabled={!!busy} onClick={() => void sendToBosta(selectedIds)} className="rounded-xl border border-blue-300/15 bg-blue-400/[0.06] px-3 py-2 text-[11px] font-black text-blue-200">Send to Bosta</button><button type="button" disabled={!!busy} onClick={() => void runAction("cancel", selectedIds)} className="rounded-xl border border-red-300/15 bg-red-400/[0.06] px-3 py-2 text-[11px] font-black text-red-200">Cancel</button></section> : null}

        {message ? <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[0.05] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start">
          <section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="border-b border-white/8 bg-white/[0.025] text-[9px] font-black uppercase tracking-[.12em] text-white/28"><tr><th className="px-3 py-3"><input type="checkbox" aria-label="Select all visible orders" checked={orders.length > 0 && selected.size === orders.length} onChange={toggleAll} /></th><th className="px-3 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Items</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Created</th></tr></thead>
                <tbody className="divide-y divide-white/[0.055]">
                  {loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30">Loading orders…</td></tr> : null}
                  {!loading && !orders.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30">No orders match these filters.</td></tr> : null}
                  {orders.map((order) => <tr key={order.id} className={`cursor-pointer transition hover:bg-white/[0.035] ${detailId === order.id ? "bg-white/[0.045]" : ""}`} onClick={() => void loadDetail(order.id)}><td className="px-3 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected.has(order.id)} onChange={() => toggle(order.id)} aria-label={`Select ${order.order_number}`} /></td><td className="px-3 py-3"><p className="font-black text-white/80">{order.order_number}</p><p className="mt-1 text-[10px] text-white/25">{label(order.order_type)}</p></td><td className="px-3 py-3"><p className="font-bold text-white/65">{order.customer_name || "—"}</p><p className="mt-1 text-[10px] text-white/30">{order.phone || "—"}</p></td><td className="px-3 py-3"><p className="font-bold text-white/60">{order.item_count || 1} line{Number(order.item_count || 1) === 1 ? "" : "s"}</p><p className="mt-1 text-[10px] text-white/25">{order.quantity || 1} units</p></td><td className="px-3 py-3 font-black">{money(order.total_price)}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${statusClass(order.status)}`}>{label(order.status)}</span></td><td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-black ${(order.payment_status || "pending") === "paid" ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/[0.04] text-white/45"}`}>{label(order.payment_status || "pending")}</span></td><td className="px-3 py-3 text-[10px] text-white/30">{when(order.created_at)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="xl:sticky xl:top-20">
            {!detailId ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/25">Select an order to open the command panel.</div> : detailLoading ? <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-8 text-center text-sm text-white/30">Loading order…</div> : current ? (
              <div className="space-y-3">
                <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/25">COMMAND PANEL</p><h2 className="mt-1 text-lg font-black">{current.order_number}</h2><p className="mt-1 text-xs text-white/35">{current.customer_name} · {current.phone}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-black ${statusClass(current.status)}`}>{label(current.status)}</span></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-bold uppercase text-white/25">Total</p><p className="mt-1 font-black">{money(current.total_price)}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-bold uppercase text-white/25">Payment</p><p className="mt-1 font-black">{label(current.payment_status || "pending")}</p></div></div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!busy} onClick={() => void runAction("confirm")} className="rounded-xl bg-white px-3 py-2.5 text-[11px] font-black text-black">Confirm</button>
                    <a href={whatsappHref} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-2.5 text-center text-[11px] font-black text-emerald-200">WhatsApp</a>
                    <button type="button" disabled={!!busy} onClick={() => void sendToBosta([current.id])} className="rounded-xl border border-blue-300/15 bg-blue-400/[0.06] px-3 py-2.5 text-[11px] font-black text-blue-200">Send to courier</button>
                    <Link href={`/admin/print-order/${encodeURIComponent(current.id)}`} target="_blank" className="rounded-xl border border-white/10 px-3 py-2.5 text-center text-[11px] font-black text-white/60">Print label</Link>
                    <button type="button" disabled={!!busy} onClick={() => void runAction("mark_paid")} className="rounded-xl border border-emerald-300/15 px-3 py-2.5 text-[11px] font-black text-emerald-200">Mark paid</button>
                    <button type="button" disabled={!!busy} onClick={() => void runAction("ship")} className="rounded-xl border border-amber-300/15 px-3 py-2.5 text-[11px] font-black text-amber-200">Mark shipped</button>
                    <button type="button" disabled={!!busy} onClick={() => void runAction("out_for_delivery")} className="rounded-xl border border-amber-300/15 px-3 py-2.5 text-[11px] font-black text-amber-200">Out for delivery</button>
                    <button type="button" disabled={!!busy} onClick={() => void runAction("deliver")} className="rounded-xl border border-emerald-300/15 px-3 py-2.5 text-[11px] font-black text-emerald-200">Delivered</button>
                    <button type="button" disabled={!!busy} onClick={() => void runAction("cancel")} className="rounded-xl border border-red-300/15 bg-red-400/[0.04] px-3 py-2.5 text-[11px] font-black text-red-200">Cancel order</button>
                    <button type="button" disabled={!!busy || current.payment_status === "refunded"} onClick={() => window.confirm("Mark the full order amount as refunded? This records the refund; it does not send money through InstaPay.") && void runAction("mark_refunded")} className="rounded-xl border border-red-300/15 px-3 py-2.5 text-[11px] font-black text-red-200 disabled:opacity-30">Mark refunded</button>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><h3 className="text-xs font-black">Internal note</h3><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Only admins can see this…" className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-xs outline-none focus:border-white/25" /><button type="button" disabled={!!busy || !note.trim()} onClick={() => void runAction("set_note")} className="mt-2 rounded-xl bg-white px-4 py-2 text-[10px] font-black text-black disabled:opacity-30">Save note</button></section>

                <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black">Items</h3><span className="text-[10px] text-white/25">{detail.items.length}</span></div><div className="mt-3 divide-y divide-white/[0.06]">{detail.items.length ? detail.items.map((item, index) => <div key={String(item.id || index)} className="py-3 first:pt-0"><div className="flex justify-between gap-3"><div><p className="text-xs font-black text-white/70">{String(item.product_name || "Product")}</p><p className="mt-1 text-[10px] text-white/30">{String(item.variant_label || item.colour || "Standard")} · {Number(item.quantity || 0)}× {money(item.unit_price)}</p>{item.is_preorder ? <p className="mt-1 text-[9px] font-bold text-violet-200/60">PRE-ORDER · {String(item.estimated_delivery_from || "")} → {String(item.estimated_delivery_to || "")}</p> : null}</div><p className="text-xs font-black">{money(item.line_total)}</p></div></div>) : <p className="text-[10px] text-white/25">Legacy order · item details are stored on the order record.</p>}</div></section>

                <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><h3 className="text-xs font-black">Timeline</h3><div className="mt-3 space-y-3">{detail.timeline.length ? detail.timeline.map((event, index) => <div key={String(event.id || index)} className="grid grid-cols-[8px_1fr] gap-3"><span className="mt-1.5 h-2 w-2 rounded-full bg-white/60" /><div><p className="text-[11px] font-black text-white/65">{String(event.title || "Order updated")}</p><p className="mt-0.5 text-[9px] text-white/25">{when(event.created_at)}</p></div></div>) : <p className="text-[10px] text-white/25">No timeline events yet.</p>}</div></section>

                <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="flex items-center justify-between"><h3 className="text-xs font-black">Customer history</h3><span className="text-[10px] text-white/25">{detail.customerHistory.length} orders</span></div><div className="mt-3 space-y-2">{detail.customerHistory.map((history) => <button key={history.id} type="button" onClick={() => void loadDetail(history.id)} className="flex w-full items-center justify-between rounded-xl bg-black/20 p-3 text-left"><div><p className="text-[10px] font-black text-white/60">{history.order_number}</p><p className="mt-1 text-[9px] text-white/25">{when(history.created_at)} · {label(history.status)}</p></div><p className="text-[10px] font-black">{money(history.total_price)}</p></button>)}</div></section>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
