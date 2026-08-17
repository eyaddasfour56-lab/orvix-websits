"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
  product_slug?: string | null;
  colour?: string | null;
  quantity: number;
  total_price: number | string;
  status: string;
  created_at: string;
  bosta_delivery_id?: string | null;
  bosta_tracking_number?: string | null;
  bosta_batch_id?: string | null;
  bosta_last_error?: string | null;
  return_status?: string | null;
};

type Customer = {
  phoneKey: string;
  name: string;
  phone: string;
  email?: string | null;
  governorate?: string | null;
  area?: string | null;
  address?: string | null;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
  totalSpent: number;
  lastOrderAt: string;
  lastOrderNumber: string;
  segment: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    product?: string | null;
    createdAt: string;
  }>;
};

type AuditItem = {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
};

type ReturnItem = {
  id: string;
  order_number: string;
  return_type: string;
  reason: string;
  refund_amount: number | string;
  restock: boolean;
  status: string;
  created_by: string;
  created_at: string;
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
  funnel: {
    visitors: number;
    productViews: number;
    checkoutStarts: number;
    ordersPlaced: number;
    visitorToProduct: number;
    productToCheckout: number;
    checkoutToOrder: number;
    visitorToOrder: number;
  };
  customers: Customer[];
  segmentCounts: Record<string, number>;
  orders: OrderItem[];
  actionOrders: OrderItem[];
  delayedOrders: OrderItem[];
  recentReturns: ReturnItem[];
  recentAudit: AuditItem[];
  topCustomer?: Customer | null;
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
  role?: string;
  roleLabel?: string;
  dashboard?: Dashboard;
  partial?: boolean;
};

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function phoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
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
    <article className={`rounded-[26px] border p-5 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-white/35">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/35">{helper}</p>
    </article>
  );
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export default function AdvancedCommandCenterPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [roleLabel, setRoleLabel] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [returnOrderId, setReturnOrderId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [restock, setRestock] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask me about profit, delayed orders, stock, customers, cancellations, conversion, or today's orders.");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/os", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.dashboard) throw new Error(result.message || "Could not load Command Center.");
      setDashboard(result.dashboard);
      setRoleLabel(result.roleLabel || "Admin");
      setSelectedCustomer((current) => current ? result.dashboard?.customers.find((item) => item.phoneKey === current.phoneKey) || null : null);
      setReturnOrderId((current) => current || result.dashboard?.orders.find((order) => order.status === "delivered")?.id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Command Center.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const customers = useMemo(() => {
    if (!dashboard) return [];
    const needle = customerSearch.trim().toLowerCase();
    if (!needle) return dashboard.customers.slice(0, 12);
    return dashboard.customers.filter((customer) => [customer.name, customer.phone, customer.email || "", customer.segment].join(" ").toLowerCase().includes(needle)).slice(0, 20);
  }, [dashboard, customerSearch]);

  async function postAction(body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
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
    } catch (assistantError) {
      setError(assistantError instanceof Error ? assistantError.message : "Assistant could not answer.");
    } finally {
      setBusy("");
    }
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnOrderId || !returnReason.trim()) {
      setError("Choose an order and enter a return reason.");
      return;
    }
    const result = await postAction({
      action: "return_refund",
      orderId: returnOrderId,
      reason: returnReason,
      refundAmount: Number(refundAmount || 0),
      restock,
    }, "return");
    if (result) {
      setReturnReason("");
      setRefundAmount("");
      setRestock(true);
    }
  }

  if (loading && !dashboard) {
    return <main className="min-h-screen bg-[#050505] p-8 text-white"><div className="mx-auto max-w-7xl rounded-[30px] border border-white/10 bg-white/[0.035] p-10 text-center text-white/45">Loading ORVIX Advanced…</div></main>;
  }

  if (!dashboard) {
    return <main className="min-h-screen bg-[#050505] p-8 text-white"><div className="mx-auto max-w-4xl rounded-[30px] border border-red-400/20 bg-red-500/[0.08] p-8">{error || "Advanced view unavailable."}</div></main>;
  }

  const deliveredOrders = dashboard.orders.filter((order) => order.status === "delivered");
  const alertStyles = {
    info: "border-blue-400/15 bg-blue-500/[0.06]",
    warning: "border-amber-400/20 bg-amber-500/[0.07]",
    critical: "border-red-400/20 bg-red-500/[0.08]",
    success: "border-emerald-400/20 bg-emerald-500/[0.07]",
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-200/65">ORVIX OS · ADVANCED</p>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{roleLabel}</span>
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">Advanced</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void load()} className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black">Refresh</button>
            <Link href="/admin/command-center" className="rounded-full bg-white px-5 py-3 text-xs font-black text-black">Simple View</Link>
          </div>
        </header>

        {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-5 py-4 text-sm font-bold text-red-100">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-5 py-4 text-sm font-bold text-emerald-100">{notice}</div>}

        <section className="mt-6 rounded-[30px] border border-violet-400/20 bg-violet-500/[0.07] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/55">TODAY IN ONE LINE</p>
          <p className="mt-2 text-lg font-black leading-7 text-violet-50 sm:text-2xl">{dashboard.summaryText}</p>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Sales Today" value={money(dashboard.today.sales)} helper={`${dashboard.today.orders} orders placed today`} tone="blue" />
          <Metric label="Profit Today" value={money(dashboard.today.profit)} helper="Delivered revenue − COGS − operating expenses" tone={dashboard.today.profit >= 0 ? "green" : "red"} />
          <Metric label="Need Confirm" value={String(dashboard.today.waitingConfirmation)} helper="One click can confirm + reserve stock + send to Bosta" tone={dashboard.today.waitingConfirmation ? "violet" : "white"} />
          <Metric label="Chats" value={String(dashboard.today.unreadChats)} helper={`${dashboard.stats.waitingChats} need attention now`} tone={dashboard.stats.waitingChats ? "red" : "white"} />
        </section>

        <section className="mt-8" id="alerts">
          <SectionTitle eyebrow="SMART ALERTS" title="What needs you now" right={<span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white/40">{dashboard.alerts.length} alerts</span>} />
          {dashboard.alerts.length === 0 ? <div className="rounded-[28px] border border-emerald-400/15 bg-emerald-500/[0.06] p-6 text-sm font-black text-emerald-100">Everything looks clear ✓</div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard.alerts.map((alert) => <article key={alert.id} className={`rounded-[26px] border p-5 ${alertStyles[alert.severity]}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{alert.title}</p><p className="mt-2 text-xs leading-5 text-white/45">{alert.body}</p></div>{alert.persisted && <button onClick={() => void postAction({ action: "mark_notification_read", id: alert.id }, `alert-${alert.id}`)} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black text-white/45">Done</button>}</div><Link href={alert.targetUrl} className="mt-4 inline-flex text-xs font-black text-white/70">Open →</Link></article>)}</div>}
        </section>

        <section className="mt-9" id="orders"><SectionTitle eyebrow="ONE-CLICK WORKFLOW" title="Orders ready for action" right={<Link href="/admin" className="text-xs font-black text-white/40">All orders →</Link>} /><div className="grid gap-3 lg:grid-cols-2">{dashboard.actionOrders.length === 0 ? <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 text-sm text-white/40">No new or confirmed orders waiting.</div> : dashboard.actionOrders.slice(0, 8).map((order) => <article key={order.id} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black text-white/35">#{order.order_number} · {statusLabel(order.status)}</p><h3 className="mt-1 text-xl font-black">{order.customer_name}</h3><p className="mt-1 text-xs text-white/40">{order.product_name} · {order.colour} · Qty {order.quantity}</p></div><p className="text-lg font-black">{money(order.total_price)}</p></div>{order.bosta_last_error && <div className="mt-3 rounded-xl bg-red-500/[0.08] px-3 py-2 text-xs font-bold text-red-100">Bosta: {order.bosta_last_error}</div>}<div className="mt-4 grid grid-cols-3 gap-2"><button disabled={busy === `process-${order.id}`} onClick={() => void postAction({ action: "process_order", orderId: order.id }, `process-${order.id}`)} className="rounded-2xl bg-white px-3 py-3 text-xs font-black text-black disabled:opacity-40">{busy === `process-${order.id}` ? "Working…" : "Process"}</button><a href={`https://wa.me/${phoneForWhatsApp(order.phone)}?text=${encodeURIComponent(`Hi ${order.customer_name}, your ORVIX order #${order.order_number} is being processed.`)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] px-3 py-3 text-xs font-black text-emerald-100">WhatsApp</a>{order.bosta_batch_id ? <a href={`/api/admin/bosta/awb?batchId=${encodeURIComponent(order.bosta_batch_id)}&size=A6&lang=en`} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/[0.07] px-3 py-3 text-xs font-black text-blue-100">Print AWB</a> : <span className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3 text-center text-[10px] font-black text-white/25">AWB after Bosta</span>}</div></article>)}</div></section>

        <section className="mt-9" id="inventory"><SectionTitle eyebrow="INVENTORY AUTOPILOT" title="Stock + reorder" right={<Link href="/admin/inventory" className="text-xs font-black text-white/40">Inventory page →</Link>} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{dashboard.inventory.map((item) => { const low = item.is_available && item.stock_quantity <= item.low_stock_limit; return <article key={item.id} className={`rounded-[28px] border p-5 ${low ? "border-amber-400/20 bg-amber-500/[0.07]" : "border-white/10 bg-white/[0.035]"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.13em] text-white/35">{low ? "LOW STOCK" : "STOCK OK"}</p><h3 className="mt-1 text-lg font-black">{item.product_name}</h3></div><p className="text-3xl font-black">{item.stock_quantity}</p></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-black/25 p-3"><p className="text-white/30">Low limit</p><p className="mt-1 font-black">{item.low_stock_limit}</p></div><div className="rounded-xl bg-black/25 p-3"><p className="text-white/30">Reorder</p><p className="mt-1 font-black">{item.reorderSuggested ? `Buy ${item.reorderSuggested}` : "Not needed"}</p></div></div><p className="mt-3 text-[11px] leading-5 text-white/35">Confirmed orders reserve stock automatically. Cancelling a reserved order returns it automatically.</p></article>; })}</div></section>

        <section className="mt-9" id="funnel"><SectionTitle eyebrow="CONVERSION FUNNEL" title="Where customers drop" right={<Link href="/admin/analytics" className="text-xs font-black text-white/40">Full analytics →</Link>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Visitors" value={dashboard.funnel.visitors.toLocaleString()} helper="Unique tracked visitors" /><Metric label="Product Views" value={dashboard.funnel.productViews.toLocaleString()} helper={`${dashboard.funnel.visitorToProduct}% from visitor`} tone="blue" /><Metric label="Checkout" value={dashboard.funnel.checkoutStarts.toLocaleString()} helper={`${dashboard.funnel.productToCheckout}% from product views`} tone="violet" /><Metric label="Orders" value={dashboard.funnel.ordersPlaced.toLocaleString()} helper={`${dashboard.funnel.checkoutToOrder}% checkout → order`} tone="green" /></div></section>

        <section className="mt-9" id="customers"><SectionTitle eyebrow="CUSTOMER 360 + SEGMENTS" title="Know every customer" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{["New", "Returning", "VIP", "High Cancellation", "Inactive"].map((segment) => <div key={segment} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">{segment}</p><p className="mt-1 text-2xl font-black">{dashboard.segmentCounts[segment] || 0}</p></div>)}</div><div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"><div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer, phone or segment…" className="w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25" /><div className="mt-3 max-h-[460px] space-y-2 overflow-auto pr-1">{customers.map((customer) => <button key={customer.phoneKey} onClick={() => setSelectedCustomer(customer)} className={`w-full rounded-2xl border p-4 text-left ${selectedCustomer?.phoneKey === customer.phoneKey ? "border-violet-400/30 bg-violet-500/[0.08]" : "border-white/8 bg-white/[0.025]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{customer.name}</p><p className="mt-1 text-xs text-white/35">{customer.phone} · {customer.segment}</p></div><p className="text-sm font-black">{money(customer.totalSpent)}</p></div></button>)}</div></div><div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">{selectedCustomer ? <><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-violet-200/55">{selectedCustomer.segment}</p><h3 className="mt-1 text-2xl font-black">{selectedCustomer.name}</h3><p className="mt-1 text-sm text-white/40">{selectedCustomer.phone}{selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}</p></div><p className="text-2xl font-black">{money(selectedCustomer.totalSpent)}</p></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[10px] text-white/30">ORDERS</p><p className="mt-1 font-black">{selectedCustomer.totalOrders}</p></div><div className="rounded-2xl bg-emerald-500/[0.05] p-3"><p className="text-[10px] text-white/30">DELIVERED</p><p className="mt-1 font-black">{selectedCustomer.deliveredOrders}</p></div><div className="rounded-2xl bg-red-500/[0.05] p-3"><p className="text-[10px] text-white/30">CANCELLED</p><p className="mt-1 font-black">{selectedCustomer.cancelledOrders}</p></div></div><div className="mt-4 rounded-2xl bg-black/25 p-4 text-xs leading-6 text-white/45"><p>{selectedCustomer.governorate || "—"}{selectedCustomer.area ? ` · ${selectedCustomer.area}` : ""}</p><p>{selectedCustomer.address || "No saved address"}</p><p>Cancellation rate: <strong className="text-white/70">{selectedCustomer.cancellationRate}%</strong></p></div><div className="mt-4 space-y-2">{selectedCustomer.orders.slice(0, 6).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 px-3 py-2 text-xs"><span>#{order.orderNumber} · {statusLabel(order.status)}</span><strong>{money(order.total)}</strong></div>)}</div></> : <div className="flex min-h-[300px] items-center justify-center text-sm text-white/30">Select a customer to open the 360° profile.</div>}</div></div></section>

        <section className="mt-9" id="returns"><SectionTitle eyebrow="RETURNS + REFUNDS" title="Process and reconcile" /><div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]"><form onSubmit={submitReturn} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5"><label className="text-xs font-black uppercase tracking-[0.12em] text-white/35">Delivered order<select value={returnOrderId} onChange={(event) => setReturnOrderId(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-black text-white outline-none"><option value="">Choose order</option>{deliveredOrders.map((order) => <option key={order.id} value={order.id}>#{order.order_number} — {order.customer_name} — {money(order.total_price)}</option>)}</select></label><label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-white/35">Reason<input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Why is it being returned/refunded?" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20" /></label><label className="mt-4 block text-xs font-black uppercase tracking-[0.12em] text-white/35">Refund amount<input type="number" min="0" step="0.01" value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder="0 EGP" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-lg font-black text-white outline-none placeholder:text-white/20" /></label><label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-black"><input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} className="h-5 w-5" /> Return item to inventory</label><button disabled={busy === "return"} className="mt-4 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black disabled:opacity-40">{busy === "return" ? "Processing…" : "Complete Return / Refund"}</button><p className="mt-3 text-[11px] leading-5 text-white/30">Refunds are added to Cash Flow automatically. If the payer is unknown, Cash Flow will ask you to assign who paid it.</p></form><div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><p className="text-sm font-black">Recent returns</p><div className="mt-3 space-y-2">{dashboard.recentReturns.length === 0 ? <p className="py-8 text-center text-sm text-white/30">No returns yet.</p> : dashboard.recentReturns.slice(0, 10).map((item) => <div key={item.id} className="rounded-2xl border border-white/8 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">#{item.order_number} · {statusLabel(item.return_type)}</p><p className="mt-1 text-xs text-white/35">{item.reason}</p></div><p className="text-sm font-black">{money(item.refund_amount)}</p></div><p className="mt-2 text-[10px] font-black uppercase text-white/25">{item.restock ? "Restocked" : "No restock"} · {item.created_by}</p></div>)}</div></div></div></section>

        <section className="mt-9 grid gap-4 xl:grid-cols-2" id="security"><article className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"><SectionTitle eyebrow="ROLES + AUDIT" title="Who changed what" /><div className="mb-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-violet-500/[0.06] p-3"><p className="text-[10px] text-white/30">OWNER</p><p className="mt-1 text-xs font-black">Full access</p></div><div className="rounded-2xl bg-blue-500/[0.06] p-3"><p className="text-[10px] text-white/30">MANAGER</p><p className="mt-1 text-xs font-black">No roles admin</p></div><div className="rounded-2xl bg-amber-500/[0.06] p-3"><p className="text-[10px] text-white/30">ORDERS</p><p className="mt-1 text-xs font-black">Orders only</p></div></div><p className="mb-3 text-[11px] leading-5 text-white/30">Current password remains Owner. Optional ADMIN_MANAGER_PASSWORD and ADMIN_ORDERS_PASSWORD enable the other roles without changing the login screen.</p><div className="space-y-2">{dashboard.recentAudit.slice(0, 10).map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 px-3 py-2.5 text-xs"><div><p className="font-black">{item.actor} · {item.action.replaceAll("_", " ")}</p><p className="mt-1 text-white/30">{item.entity_type}{item.entity_id ? ` · ${item.entity_id.slice(0, 8)}` : ""}</p></div><span className="shrink-0 text-[10px] text-white/25">{new Date(item.created_at).toLocaleString()}</span></div>)}</div></article><article className="rounded-[28px] border border-violet-400/20 bg-violet-500/[0.06] p-5" id="assistant"><SectionTitle eyebrow="ORVIX ASSISTANT" title="Ask your business" /><div className="min-h-[110px] rounded-2xl border border-violet-300/10 bg-black/25 p-4 text-sm font-bold leading-6 text-violet-50">{answer}</div><form onSubmit={askAssistant} className="mt-3 flex gap-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. كام ربحنا؟ إيه الأوردرات المتأخرة؟" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25" /><button disabled={busy === "assistant"} className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">Ask</button></form><div className="mt-3 flex flex-wrap gap-2">{["Profit today", "Delayed orders", "Stock status", "Top customer", "Conversion funnel"].map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/45">{prompt}</button>)}</div></article></section>

        <section className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.025] p-5 text-sm text-white/40"><div className="flex flex-wrap items-center justify-between gap-3"><span>All-time delivered sales: <strong className="text-white/70">{money(dashboard.allTime.deliveredSales)}</strong> · Real profit: <strong className="text-white/70">{money(dashboard.allTime.realProfit)}</strong></span><Link href="/admin/cashflow" className="font-black text-emerald-200/70">Open Cash Flow →</Link></div></section>
      </div>
    </main>
  );
}
