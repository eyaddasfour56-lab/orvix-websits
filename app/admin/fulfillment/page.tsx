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
  order_type?: string;
  total_price?: number | string;
  payment_status?: string;
  status?: string;
  supplier_name?: string;
  supplier_status?: string;
  supplier_ordered_at?: string;
  supplier_confirmed_at?: string;
  supplier_preparing_at?: string;
  supplier_shipped_at?: string;
  received_at_orvix?: string;
  ready_for_courier_at?: string;
  estimated_delivery_from?: string;
  estimated_delivery_to?: string;
  bosta_tracking_number?: string;
  bosta_state_code?: number;
  bosta_state_name?: string;
  bosta_status_updated_at?: string;
  bosta_pickup_date?: string;
  bosta_last_error?: string;
  created_at?: string;
};

type Detail = {
  success?: boolean;
  order: Order & Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  timeline: Array<Record<string, unknown>>;
};

type JourneyStep = {
  key: string;
  title: string;
  subtitle: string;
  reached: boolean;
  current: boolean;
  time?: string;
};

const supplierRank: Record<string, number> = {
  preordered: 1,
  supplier_confirmed: 2,
  supplier_preparing: 3,
  supplier_shipped: 4,
  received_at_orvix: 5,
  ready_for_courier: 6,
};

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

function titleCase(value: unknown) {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currentJourneyLabel(order: Order) {
  if (order.status === "cancelled") return "Cancelled";
  const code = Number(order.bosta_state_code);
  if (order.bosta_tracking_number) return order.bosta_state_name || `Courier state ${code}`;
  const supplier = order.supplier_name || "Ahmed Samy";
  switch (order.supplier_status) {
    case "supplier_confirmed": return "Supplier Confirmed";
    case "supplier_preparing": return "Supplier Preparing";
    case "supplier_shipped": return "On the Way to ORVIX";
    case "received_at_orvix": return "Received at ORVIX";
    case "ready_for_courier": return "Ready for Courier";
    default: return `Pre-ordered from ${supplier}`;
  }
}

function bostaRank(codeValue: unknown) {
  const code = Number(codeValue);
  if ([10].includes(code)) return 7;
  if ([11].includes(code)) return 8;
  if ([20].includes(code)) return 9;
  if ([21, 22, 23, 40].includes(code)) return 10;
  if ([24, 25].includes(code)) return 11;
  if (code === 30) return 12;
  if (code === 41) return 13;
  if (code === 45) return 14;
  return 0;
}

function buildJourney(order: Order): JourneyStep[] {
  const supplier = order.supplier_name || "Ahmed Samy";
  const supplierStage = supplierRank[String(order.supplier_status || "preordered")] || 1;
  const courierStage = bostaRank(order.bosta_state_code);
  const stage = Math.max(supplierStage, courierStage);

  const definitions = [
    { key: "placed", title: "Pre-Order Placed", subtitle: "The customer completed the ORVIX order.", rank: 0, time: order.created_at },
    { key: "supplier", title: `Pre-ordered from ${supplier}`, subtitle: "The order was added to the supplier queue.", rank: 1, time: order.supplier_ordered_at },
    { key: "supplier_confirmed", title: "Supplier Confirmed", subtitle: `${supplier} confirmed the pre-order.`, rank: 2, time: order.supplier_confirmed_at },
    { key: "supplier_preparing", title: "Supplier Preparing", subtitle: "The supplier is preparing the product for ORVIX.", rank: 3, time: order.supplier_preparing_at },
    { key: "supplier_shipped", title: "Supplier Shipped to ORVIX", subtitle: "The product is travelling from the supplier to ORVIX.", rank: 4, time: order.supplier_shipped_at },
    { key: "received", title: "Received at ORVIX", subtitle: "ORVIX received the product and can prepare the package.", rank: 5, time: order.received_at_orvix },
    { key: "ready", title: "Ready for Courier", subtitle: "The package is ready to be handed to Bosta.", rank: 6, time: order.ready_for_courier_at },
    { key: "courier_requested", title: "Courier Requested", subtitle: "The Bosta delivery was created from ORVIX Admin.", rank: 7, time: order.bosta_status_updated_at },
    { key: "waiting_route", title: "Waiting for Route", subtitle: "Bosta is scheduling the pickup route.", rank: 8, time: order.bosta_status_updated_at },
    { key: "route_assigned", title: "Courier Route Assigned", subtitle: "A Bosta route has been assigned for pickup.", rank: 9, time: order.bosta_status_updated_at },
    { key: "picked_up", title: "Picked Up from ORVIX", subtitle: "The package has left ORVIX with the courier.", rank: 10, time: order.bosta_status_updated_at },
    { key: "warehouse", title: "Received at Bosta Warehouse", subtitle: "Bosta received the package at its warehouse.", rank: 11, time: order.bosta_status_updated_at },
    { key: "transit", title: "In Transit Between Hubs", subtitle: "The package is moving toward the customer area.", rank: 12, time: order.bosta_status_updated_at },
    { key: "ofd", title: "Out for Delivery", subtitle: "The package is with the delivery courier.", rank: 13, time: order.bosta_status_updated_at },
    { key: "delivered", title: "Delivered", subtitle: "The customer received the ORVIX order.", rank: 14, time: order.bosta_status_updated_at },
  ];

  return definitions.map((item) => ({
    key: item.key,
    title: item.title,
    subtitle: item.subtitle,
    reached: item.rank <= stage,
    current: item.rank === stage,
    time: item.time,
  }));
}

export default function FulfillmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [supplierName, setSupplierName] = useState("Ahmed Samy");

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/orders-v2?${params.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load orders.");
      const rows = Array.isArray(result.orders) ? result.orders : [];
      setOrders(rows);
      if (!selectedId && rows[0]?.id) setSelectedId(rows[0].id);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/orders-v2?orderId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load order details.");
      setDetail(result as Detail);
      setSupplierName(String(result.order?.supplier_name || "Ahmed Samy"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load order details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 180);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadOrders();
      if (selectedId) void loadDetail(selectedId);
    }, 20000);
    return () => window.clearInterval(interval);
  }, [loadDetail, loadOrders, selectedId]);

  async function runAction(action: string, extra?: Record<string, unknown>) {
    if (!selectedId || busy) return;
    setBusy(action);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/order-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderIds: [selectedId], ...extra }),
      });
      const result = await response.json();
      if (!response.ok || (!result.success && !result.partial)) throw new Error(result.message || "Action failed.");
      setMessage(result.message || "Order updated.");
      await Promise.all([loadOrders(), loadDetail(selectedId)]);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusy("");
    }
  }

  async function sendToCourier() {
    if (!selectedId || busy) return;
    setBusy("courier");
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/dispatch-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [selectedId] }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Could not request courier pickup.");
      setMessage(result.message || "Courier requested successfully.");
      await Promise.all([loadOrders(), loadDetail(selectedId)]);
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Could not request courier pickup.");
    } finally {
      setBusy("");
    }
  }

  async function refreshCourier() {
    if (!selectedId || busy) return;
    setBusy("refresh-courier");
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/bosta/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not refresh courier tracking.");
      setMessage("Live courier tracking refreshed.");
      await Promise.all([loadOrders(), loadDetail(selectedId)]);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Could not refresh courier tracking.");
    } finally {
      setBusy("");
    }
  }

  const current = detail?.order;
  const journey = useMemo(() => (current ? buildJourney(current) : []), [current]);
  const supplierStage = supplierRank[String(current?.supplier_status || "preordered")] || 1;
  const canSendCourier = Boolean(current && !current.bosta_tracking_number && supplierStage >= 5 && current.status !== "cancelled");

  const metrics = useMemo(() => ({
    preorder: orders.filter((order) => order.status !== "cancelled").length,
    supplier: orders.filter((order) => ["preordered", "supplier_confirmed", "supplier_preparing", "supplier_shipped"].includes(String(order.supplier_status))).length,
    atOrvix: orders.filter((order) => ["received_at_orvix", "ready_for_courier"].includes(String(order.supplier_status)) && !order.bosta_tracking_number).length,
    courier: orders.filter((order) => Boolean(order.bosta_tracking_number) && order.status !== "delivered" && order.status !== "cancelled").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
  }), [orders]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-3 py-5 text-white sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/45">ORVIX FULFILLMENT</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Orders & Tracking</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-white/35">Every order is a pre-order. Track the full supplier journey, request Bosta directly, and follow the real courier state without leaving ORVIX Admin.</p>
          </div>
          <button type="button" onClick={() => { void loadOrders(); if (selectedId) void loadDetail(selectedId); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/65">Refresh</button>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Pre-Orders", metrics.preorder],
            ["With Supplier", metrics.supplier],
            ["At ORVIX", metrics.atOrvix],
            ["With Courier", metrics.courier],
            ["Delivered", metrics.delivered],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/25">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </article>
          ))}
        </section>

        {message ? <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
          <aside className="rounded-2xl border border-white/8 bg-white/[0.02] xl:sticky xl:top-20">
            <div className="border-b border-white/8 p-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, phone or tracking…" className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-violet-300/25" />
            </div>
            <div className="max-h-[72vh] overflow-y-auto p-2">
              {loading && !orders.length ? <p className="p-6 text-center text-xs text-white/25">Loading orders…</p> : null}
              {!loading && !orders.length ? <p className="p-6 text-center text-xs text-white/25">No orders found.</p> : null}
              {orders.map((order) => (
                <button key={order.id} type="button" onClick={() => setSelectedId(order.id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition ${selectedId === order.id ? "border-violet-300/20 bg-violet-500/[0.08]" : "border-transparent hover:border-white/8 hover:bg-white/[0.03]"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-white/80">{order.order_number}</p>
                      <p className="mt-1 truncate text-[10px] font-semibold text-white/35">{order.customer_name} · {order.phone}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-black text-white/40">PRE-ORDER</span>
                  </div>
                  <p className="mt-2 truncate text-[10px] font-black text-violet-100/65">{currentJourneyLabel(order)}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-white/25"><span>{when(order.created_at)}</span><span>{money(order.total_price)}</span></div>
                </button>
              ))}
            </div>
          </aside>

          <section>
            {!selectedId ? <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/25">Select an order to open its fulfillment journey.</div> : detailLoading && !current ? <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-12 text-center text-sm text-white/30">Loading order journey…</div> : current ? (
              <div className="space-y-4">
                <article className="rounded-[26px] border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.08] to-white/[0.02] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/25">CURRENT JOURNEY</p>
                      <h2 className="mt-2 text-2xl font-black">{current.order_number}</h2>
                      <p className="mt-1 text-xs font-semibold text-white/38">{current.customer_name} · {current.phone} · {current.governorate || "—"}</p>
                    </div>
                    <div className="text-right"><span className="inline-flex rounded-full border border-violet-300/20 bg-violet-500/[0.12] px-3 py-1.5 text-[10px] font-black text-violet-100">{currentJourneyLabel(current)}</span><p className="mt-2 text-[9px] text-white/25">{money(current.total_price)} · {titleCase(current.payment_status || "pending")}</p></div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">Supplier</p><p className="mt-1 text-xs font-black">{current.supplier_name || "Ahmed Samy"}</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">Estimated Arrival</p><p className="mt-1 text-xs font-black">{current.estimated_delivery_from || "—"} → {current.estimated_delivery_to || "—"}</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">Courier Tracking</p><p className="mt-1 truncate text-xs font-black">{current.bosta_tracking_number || "Not requested"}</p></div>
                    <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">Last Courier Update</p><p className="mt-1 text-xs font-black">{current.bosta_status_updated_at ? when(current.bosta_status_updated_at) : "—"}</p></div>
                  </div>
                </article>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                    <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">FULL JOURNEY</p><h3 className="mt-1 text-lg font-black">Supplier → ORVIX → Customer</h3></div>{current.bosta_last_error ? <span className="rounded-full border border-red-300/15 bg-red-400/10 px-3 py-1 text-[9px] font-black text-red-200">Needs attention</span> : null}</div>
                    <div className="mt-5 space-y-0">
                      {journey.map((step, index) => (
                        <div key={step.key} className="grid grid-cols-[26px_1fr] gap-3">
                          <div className="flex flex-col items-center"><span className={`mt-1 grid h-5 w-5 place-items-center rounded-full border text-[8px] font-black ${step.current ? "border-violet-200 bg-violet-300 text-black" : step.reached ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/20"}`}>{step.reached ? "✓" : ""}</span>{index < journey.length - 1 ? <span className={`min-h-10 w-px flex-1 ${step.reached ? "bg-emerald-300/20" : "bg-white/8"}`} /> : null}</div>
                          <div className="pb-5"><p className={`text-xs font-black ${step.current ? "text-violet-100" : step.reached ? "text-white/70" : "text-white/25"}`}>{step.title}</p><p className="mt-1 text-[10px] font-medium leading-5 text-white/28">{step.subtitle}</p>{step.reached && step.time ? <p className="mt-1 text-[9px] text-white/20">{when(step.time)}</p> : null}</div>
                        </div>
                      ))}
                    </div>
                  </article>

                  <div className="space-y-4">
                    <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">SUPPLIER CONTROLS</p>
                      <div className="mt-3 flex gap-2"><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-xs outline-none" /><button type="button" disabled={!!busy || !supplierName.trim()} onClick={() => void runAction("set_supplier", { supplierName })} className="rounded-xl bg-white px-3 text-[10px] font-black text-black disabled:opacity-30">Save</button></div>
                      <div className="mt-3 grid gap-2">
                        <button type="button" disabled={!!busy} onClick={() => void runAction("supplier_confirm")} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[11px] font-black text-white/65">Supplier Confirmed</button>
                        <button type="button" disabled={!!busy} onClick={() => void runAction("supplier_prepare")} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[11px] font-black text-white/65">Supplier Preparing</button>
                        <button type="button" disabled={!!busy} onClick={() => void runAction("supplier_ship_to_orvix")} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-[11px] font-black text-white/65">Supplier Shipped to ORVIX</button>
                        <button type="button" disabled={!!busy} onClick={() => void runAction("receive_at_orvix")} className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-2.5 text-left text-[11px] font-black text-emerald-200">Received at ORVIX</button>
                      </div>
                    </article>

                    <article className="rounded-[26px] border border-blue-300/12 bg-blue-400/[0.04] p-5">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/45">COURIER CONTROL</p>
                      <h3 className="mt-2 text-lg font-black">Bosta</h3>
                      <p className="mt-1 text-[10px] font-semibold leading-5 text-white/30">Request the courier directly from ORVIX Admin. Pickup date and pickup location are selected automatically.</p>
                      {!current.bosta_tracking_number ? <button type="button" disabled={!!busy || !canSendCourier} onClick={() => void sendToCourier()} className="mt-4 w-full rounded-xl bg-blue-300 px-4 py-3 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-30">{busy === "courier" ? "Requesting Courier…" : "Send to Courier"}</button> : <button type="button" disabled={!!busy} onClick={() => void refreshCourier()} className="mt-4 w-full rounded-xl bg-blue-300 px-4 py-3 text-xs font-black text-black disabled:opacity-30">{busy === "refresh-courier" ? "Refreshing…" : "Refresh Live Tracking"}</button>}
                      {!canSendCourier && !current.bosta_tracking_number ? <p className="mt-2 text-[9px] font-semibold text-amber-200/55">Mark the order “Received at ORVIX” first.</p> : null}
                      {current.bosta_tracking_number ? <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">Current Bosta State</p><p className="mt-1 text-xs font-black text-blue-100">{current.bosta_state_name || "Tracking active"}</p><p className="mt-1 text-[9px] text-white/25">State {current.bosta_state_code ?? "—"} · {current.bosta_tracking_number}</p></div> : null}
                      {current.bosta_last_error ? <div className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-[10px] font-semibold text-red-100">{current.bosta_last_error}</div> : null}
                    </article>
                  </div>
                </div>

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">ACTIVITY LOG</p><h3 className="mt-1 text-lg font-black">Order Timeline</h3></div><span className="text-[10px] text-white/25">{detail?.timeline.length || 0} events</span></div>
                  <div className="mt-4 grid gap-2 lg:grid-cols-2">
                    {detail?.timeline.length ? detail.timeline.slice().reverse().map((event, index) => <div key={String(event.id || index)} className="rounded-xl border border-white/7 bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-white/65">{String(event.title || "Order updated")}</p><p className="mt-1 text-[10px] leading-5 text-white/28">{String(event.details || "")}</p></div><span className="shrink-0 text-[8px] font-bold uppercase text-white/20">{String(event.created_by || "system")}</span></div><p className="mt-2 text-[9px] text-white/20">{when(event.created_at)}</p></div>) : <p className="text-xs text-white/25">No events yet.</p>}
                  </div>
                </article>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
