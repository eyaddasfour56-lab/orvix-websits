"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  journey_updated_at?: string;
  estimated_delivery_from?: string;
  estimated_delivery_to?: string;
  bosta_tracking_number?: string;
  bosta_state_name?: string;
  bosta_state_code?: number;
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

type JourneyStep = {
  value: string;
  label: string;
  description: string;
};

const groups: Array<{ title: string; eyebrow: string; mode: string; steps: JourneyStep[] }> = [
  {
    eyebrow: "PHASE 01 · MANUAL",
    title: "International Pre-Order Tracking",
    mode: "manual",
    steps: [
      { value: "new", label: "Pre-Ordered", description: "Customer order received and the international pre-order is active." },
      { value: "international_transit", label: "In Transit to Egypt", description: "Item is travelling to Egypt from abroad." },
    ],
  },
  {
    eyebrow: "PHASE 02 · MANUAL",
    title: "Egypt Import Tracking",
    mode: "manual",
    steps: [
      { value: "arrived_egypt", label: "Arrived in Egypt", description: "Item has physically arrived in Egypt." },
      { value: "in_customs", label: "In Customs", description: "Item is being processed by Egyptian customs." },
      { value: "customs_cleared", label: "Customs Cleared", description: "Customs processing is complete and the item can move to ORVIX." },
    ],
  },
  {
    eyebrow: "PHASE 03 · MANUAL",
    title: "ORVIX Handling",
    mode: "manual",
    steps: [
      { value: "received_at_orvix", label: "Received at ORVIX", description: "ORVIX has physically received the item." },
      { value: "ready_for_courier", label: "Ready for Courier", description: "Package is packed and ready for Bosta pickup." },
    ],
  },
];

const allJourneySteps = groups.flatMap((group) => group.steps);

function money(value: unknown) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function when(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function titleCase(value: unknown) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function journeyIndex(value: unknown) {
  return Math.max(0, allJourneySteps.findIndex((step) => step.value === String(value || "new")));
}

export default function AdminOrderJourneyPage() {
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id || "");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders-v2?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load order.");
      setDetail(result as Detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load order.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const order = detail?.order;
  const activeJourneyIndex = journeyIndex(order?.journey_status);
  const cancelled = order?.status === "cancelled";
  const delivered = order?.status === "delivered";
  const courierLive = Boolean(order?.bosta_tracking_number);

  const journeyEvents = useMemo(() => (detail?.timeline || []).filter((event) =>
    ["journey_stage_changed", "status_changed", "order_placed"].includes(String(event.event_type || ""))
  ), [detail]);

  const courierEvents = useMemo(() => (detail?.timeline || []).filter((event) =>
    String(event.event_type || "") === "courier_status_changed"
  ), [detail]);

  function timeForJourney(status: string) {
    const matching = [...journeyEvents].reverse().find((event) => String(event.status || "") === status);
    if (matching?.created_at) return when(matching.created_at);
    if (status === "new") return when(order?.created_at);
    return "—";
  }

  async function updateAction(body: Record<string, unknown>, successMessage: string) {
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
      if (!response.ok || (!result.success && !result.partial)) {
        throw new Error(result.failures?.[0]?.message || result.message || "Order update failed.");
      }
      setMessage(successMessage);
      await load(true);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Order update failed.");
    } finally {
      setBusy("");
    }
  }

  async function setJourney(value: string) {
    await updateAction({ action: "set_journey_status", journeyStatus: value }, `Journey updated to ${allJourneySteps.find((step) => step.value === value)?.label || value}.`);
  }

  async function cancelOrder() {
    if (!order || cancelled || delivered) return;
    if (!window.confirm("Cancel this order? The current journey stage will be preserved.")) return;
    await updateAction({ action: "cancel" }, "Order cancelled. Journey history was preserved.");
  }

  async function sendToCourier() {
    if (!order || busy || cancelled || courierLive || !["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status || ""))) return;
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
      setMessage("Courier requested successfully. Live Bosta tracking is now active.");
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
      if (!response.ok || !result.success) throw new Error(result.message || "Could not refresh courier tracking.");
      setMessage("Live courier tracking refreshed.");
      await load(true);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh courier tracking.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <main className="min-h-screen bg-[#0b0c0e] p-8 text-white"><p className="text-sm text-white/40">Loading order journey…</p></main>;
  if (!order) return <main className="min-h-screen bg-[#0b0c0e] p-8 text-white"><p className="text-sm text-red-200">{error || "Order not found."}</p></main>;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin/fulfillment" className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">← Orders & Tracking</Link>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{order.order_number || "Order"}</h1>
            <p className="mt-1 text-xs font-semibold text-white/35">Full order journey · customer · import · ORVIX handling · live courier</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-2 text-[10px] font-black ${cancelled ? "border-red-300/20 bg-red-400/10 text-red-100" : delivered ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}>ORDER STATE · {cancelled ? "CANCELLED" : delivered ? "DELIVERED" : "ACTIVE"}</span>
            <span className="rounded-full border border-violet-300/15 bg-violet-400/[0.06] px-3 py-2 text-[10px] font-black text-violet-100">JOURNEY · {allJourneySteps.find((step) => step.value === String(order.journey_status || "new"))?.label || titleCase(order.journey_status)}</span>
          </div>
        </div>

        {cancelled ? <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4"><p className="text-sm font-black text-red-100">Order Cancelled</p><p className="mt-1 text-xs text-red-100/55">Cancellation is a separate order state. The last real journey stage above is intentionally preserved.</p></div> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Customer</p><p className="mt-2 text-sm font-black">{order.customer_name || "—"}</p><p className="mt-1 text-[10px] text-white/35">{order.phone || "—"}</p><p className="mt-1 text-[10px] text-white/25">{order.customer_email || ""}</p></article>
          <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Delivery</p><p className="mt-2 text-sm font-black">{order.governorate || "—"}</p><p className="mt-1 text-[10px] leading-5 text-white/35">{order.address || "—"}</p></article>
          <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Payment</p><p className="mt-2 text-sm font-black">{titleCase(order.payment_status || "pending")}</p><p className="mt-1 text-[10px] text-white/35">Total · {money(order.total_price)}</p></article>
          <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Estimated Arrival</p><p className="mt-2 text-sm font-black">{order.estimated_delivery_from || "—"}{order.estimated_delivery_to ? ` → ${order.estimated_delivery_to}` : ""}</p><p className="mt-1 text-[10px] text-white/35">Created · {when(order.created_at)}</p></article>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px] xl:items-start">
          <div className="space-y-4">
            {groups.map((group) => (
              <article key={group.title} className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{group.eyebrow}</p><h2 className="mt-2 text-xl font-black">{group.title}</h2></div><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[8px] font-black text-white/35">MANUAL</span></div>
                <div className="mt-5 grid gap-2">
                  {group.steps.map((step) => {
                    const index = allJourneySteps.findIndex((item) => item.value === step.value);
                    const reached = index <= activeJourneyIndex;
                    const current = step.value === String(order.journey_status || "new");
                    return (
                      <button key={step.value} type="button" disabled={busy !== "" || courierLive || cancelled || delivered} onClick={() => void setJourney(step.value)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed ${current ? "border-violet-300/25 bg-violet-400/[0.08]" : reached ? "border-emerald-300/12 bg-emerald-400/[0.035]" : "border-white/8 bg-black/10 hover:bg-white/[0.03]"} disabled:opacity-60`}>
                        <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black ${current ? "border-violet-200 bg-violet-200 text-black" : reached ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-white/25"}`}>{reached ? "✓" : index + 1}</span>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black text-white/75">{step.label}</p>{current ? <span className="rounded-full bg-white px-2 py-0.5 text-[7px] font-black text-black">CURRENT</span> : null}</div><p className="mt-1 text-[10px] leading-5 text-white/30">{step.description}</p><p className="mt-1 text-[9px] text-white/20">{timeForJourney(step.value)}</p></div>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}

            <article className="rounded-[26px] border border-blue-300/12 bg-blue-400/[0.035] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/40">PHASE 04 · AUTOMATIC</p><h2 className="mt-2 text-xl font-black">Live Courier Tracking</h2></div><span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[8px] font-black text-blue-100">BOSTA LIVE</span></div>
              {courierLive ? <div className="mt-4 rounded-2xl border border-blue-300/15 bg-black/15 p-4"><p className="text-xs font-black text-blue-100">{order.bosta_state_name || "Tracking active"}</p><p className="mt-1 text-[10px] text-white/35">{order.bosta_tracking_number} · {when(order.bosta_status_updated_at)}</p><button type="button" disabled={busy !== ""} onClick={() => void refreshCourier()} className="mt-3 rounded-xl bg-blue-200 px-3 py-2 text-[10px] font-black text-black disabled:opacity-40">Refresh Live Tracking</button></div> : <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4"><p className="text-xs font-black text-white/60">Courier tracking has not started.</p><p className="mt-1 text-[10px] leading-5 text-white/30">Set the journey to Received at ORVIX or Ready for Courier, then send the order to Bosta.</p><button type="button" disabled={busy !== "" || cancelled || !["received_at_orvix", "ready_for_courier"].includes(String(order.journey_status || ""))} onClick={() => void sendToCourier()} className="mt-3 rounded-xl bg-blue-200 px-3 py-2 text-[10px] font-black text-black disabled:opacity-30">{busy === "courier" ? "Sending…" : "Send to Courier"}</button></div>}
              <div className="mt-4 space-y-2">{courierEvents.length ? courierEvents.slice().reverse().map((event, index) => <div key={String(event.id || index)} className="rounded-xl border border-white/7 bg-black/15 p-3"><p className="text-xs font-black text-white/65">{String(event.title || "Courier update")}</p><p className="mt-1 text-[10px] text-white/30">{String(event.details || "Live update from Bosta.")}</p><p className="mt-1 text-[9px] text-white/20">{when(event.created_at)}</p></div>) : <p className="text-[10px] text-white/25">No live courier events yet.</p>}</div>
            </article>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20">
            <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">ORDER ITEMS</p><div className="mt-3 divide-y divide-white/[0.07]">{detail?.items?.length ? detail.items.map((item, index) => <div key={String(item.id || index)} className="py-3 first:pt-0 last:pb-0"><div className="flex justify-between gap-3"><div><p className="text-xs font-black text-white/70">{String(item.product_name || order.product_name || "Product")}</p><p className="mt-1 text-[10px] text-white/30">{String(item.colour || order.colour || "Standard")} · {Number(item.quantity || 1)}×</p></div><p className="text-xs font-black">{money(item.line_total || order.products_total)}</p></div></div>) : <p className="text-xs text-white/30">{order.product_name || "Product"} · {order.quantity || 1}×</p>}</div></article>
            <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">ORDER TOTALS</p><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between text-white/45"><span>Products</span><span>{money(order.products_total)}</span></div><div className="flex justify-between text-white/45"><span>Delivery</span><span>{money(order.delivery_fee)}</span></div><div className="flex justify-between text-white/45"><span>Discount</span><span>-{money(order.discount_amount)}</span></div><div className="flex justify-between border-t border-white/8 pt-3 font-black"><span>Total</span><span>{money(order.total_price)}</span></div></div></article>
            <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">INTERNAL</p><p className="mt-2 text-xs leading-6 text-white/40">{order.internal_notes || order.notes || "No internal notes."}</p>{!cancelled && !delivered ? <button type="button" disabled={busy !== ""} onClick={() => void cancelOrder()} className="mt-4 w-full rounded-xl border border-red-300/20 bg-red-400/[0.07] px-3 py-2.5 text-[10px] font-black text-red-100 disabled:opacity-30">Cancel Order</button> : null}</article>
            <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">FULL ACTIVITY</p><span className="text-[9px] text-white/20">{detail?.timeline?.length || 0}</span></div><div className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">{detail?.timeline?.length ? detail.timeline.slice().reverse().map((event, index) => <div key={String(event.id || index)} className="rounded-xl border border-white/7 bg-black/15 p-3"><p className="text-[10px] font-black text-white/60">{String(event.title || "Order updated")}</p><p className="mt-1 text-[9px] leading-4 text-white/25">{String(event.details || "")}</p><p className="mt-1 text-[8px] text-white/18">{when(event.created_at)}</p></div>) : <p className="text-xs text-white/25">No activity yet.</p>}</div></article>
          </aside>
        </section>
      </div>
    </main>
  );
}
