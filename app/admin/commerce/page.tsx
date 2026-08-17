"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Settings = {
  checkout_enabled?: boolean;
  queue_enabled?: boolean;
  max_quantity_per_order?: number;
  rate_limit_per_minute?: number;
  duplicate_window_seconds?: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  low_stock_limit: number;
  allow_purchase: boolean;
  status: string;
  available_from?: string | null;
  available_until?: string | null;
};

type Variant = {
  id: string;
  product_id: string;
  variant_key: string;
  label: string;
  stock_quantity: number;
  low_stock_limit: number;
  allow_purchase: boolean;
  active: boolean;
  display_order: number;
};

type Schedule = {
  id: string;
  product_id: string;
  price: number | string;
  compare_at_price?: number | string | null;
  starts_at: string;
  ends_at?: string | null;
  priority: number;
  active: boolean;
};

type Job = {
  id: string;
  kind: string;
  status: "pending" | "processing" | "completed" | "dead";
  attempts: number;
  max_attempts: number;
  run_after: string;
  last_error?: string | null;
  created_at: string;
};

type DashboardData = {
  settings: Settings;
  products: Product[];
  variants: Variant[];
  schedules: Schedule[];
  jobs: Job[];
  health: Record<string, unknown>;
};

const emptyData: DashboardData = {
  settings: {},
  products: [],
  variants: [],
  schedules: [],
  jobs: [],
  health: {},
};

function productName(products: Product[], id: string) {
  return products.find((product) => product.id === id)?.name || "Unknown product";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metric(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString("en-GB") : String(value ?? "0");
}

export default function CommerceControlPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [settingsDraft, setSettingsDraft] = useState({
    maxQuantity: "10",
    rateLimit: "20",
    duplicateWindow: "600",
  });

  const [variantForm, setVariantForm] = useState({
    productId: "",
    variantKey: "",
    label: "",
    stockQuantity: "0",
    lowStockLimit: "2",
  });

  const [scheduleForm, setScheduleForm] = useState({
    productId: "",
    price: "",
    compareAtPrice: "",
    startsAt: "",
    endsAt: "",
    priority: "0",
  });

  const [windowForm, setWindowForm] = useState({
    productId: "",
    availableFrom: "",
    availableUntil: "",
  });

  const syncDrafts = useCallback((next: DashboardData) => {
    setSettingsDraft({
      maxQuantity: String(next.settings.max_quantity_per_order ?? 10),
      rateLimit: String(next.settings.rate_limit_per_minute ?? 20),
      duplicateWindow: String(next.settings.duplicate_window_seconds ?? 600),
    });

    const firstProduct = next.products[0]?.id || "";
    setVariantForm((current) => ({ ...current, productId: current.productId || firstProduct }));
    setScheduleForm((current) => ({ ...current, productId: current.productId || firstProduct }));
    setWindowForm((current) => ({ ...current, productId: current.productId || firstProduct }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/commerce", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load Commerce Control.");
      const next: DashboardData = {
        settings: result.settings || {},
        products: Array.isArray(result.products) ? result.products : [],
        variants: Array.isArray(result.variants) ? result.variants : [],
        schedules: Array.isArray(result.schedules) ? result.schedules : [],
        jobs: Array.isArray(result.jobs) ? result.jobs : [],
        health: result.health || {},
      };
      setData(next);
      syncDrafts(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load Commerce Control.");
    } finally {
      setLoading(false);
    }
  }, [syncDrafts]);

  useEffect(() => {
    void load();
  }, [load]);

  async function request(method: "POST" | "PATCH", body: Record<string, unknown>, busyKey: string) {
    setBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/commerce", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Action failed.");
      const next: DashboardData = {
        settings: result.settings || data.settings,
        products: Array.isArray(result.products) ? result.products : data.products,
        variants: Array.isArray(result.variants) ? result.variants : data.variants,
        schedules: Array.isArray(result.schedules) ? result.schedules : data.schedules,
        jobs: Array.isArray(result.jobs) ? result.jobs : data.jobs,
        health: result.health || data.health,
      };
      setData(next);
      syncDrafts(next);
      setMessage(result.message || "Saved.");
      return true;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function toggleCheckout() {
    await request(
      "PATCH",
      { checkoutEnabled: !(data.settings.checkout_enabled !== false) },
      "checkout"
    );
  }

  async function toggleQueue() {
    await request(
      "PATCH",
      { queueEnabled: !(data.settings.queue_enabled !== false) },
      "queue"
    );
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    await request(
      "PATCH",
      {
        maxQuantityPerOrder: Number(settingsDraft.maxQuantity),
        rateLimitPerMinute: Number(settingsDraft.rateLimit),
        duplicateWindowSeconds: Number(settingsDraft.duplicateWindow),
      },
      "settings"
    );
  }

  async function createVariant(event: FormEvent) {
    event.preventDefault();
    const ok = await request(
      "POST",
      {
        action: "create_variant",
        productId: variantForm.productId,
        variantKey: variantForm.variantKey,
        label: variantForm.label,
        stockQuantity: Number(variantForm.stockQuantity),
        lowStockLimit: Number(variantForm.lowStockLimit),
        allowPurchase: true,
        active: true,
      },
      "new-variant"
    );
    if (ok) {
      setVariantForm((current) => ({
        ...current,
        variantKey: "",
        label: "",
        stockQuantity: "0",
        lowStockLimit: "2",
      }));
    }
  }

  async function saveVariant(variant: Variant) {
    await request(
      "POST",
      {
        action: "update_variant",
        id: variant.id,
        label: variant.label,
        stockQuantity: variant.stock_quantity,
        lowStockLimit: variant.low_stock_limit,
        allowPurchase: variant.allow_purchase,
        active: variant.active,
        displayOrder: variant.display_order,
      },
      `variant-${variant.id}`
    );
  }

  function patchVariant(id: string, patch: Partial<Variant>) {
    setData((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.id === id ? { ...variant, ...patch } : variant
      ),
    }));
  }

  async function createSchedule(event: FormEvent) {
    event.preventDefault();
    const ok = await request(
      "POST",
      {
        action: "create_schedule",
        productId: scheduleForm.productId,
        price: Number(scheduleForm.price),
        compareAtPrice: scheduleForm.compareAtPrice || null,
        startsAt: scheduleForm.startsAt,
        endsAt: scheduleForm.endsAt || null,
        priority: Number(scheduleForm.priority),
        active: true,
      },
      "new-schedule"
    );
    if (ok) {
      setScheduleForm((current) => ({
        ...current,
        price: "",
        compareAtPrice: "",
        startsAt: "",
        endsAt: "",
        priority: "0",
      }));
    }
  }

  async function toggleSchedule(schedule: Schedule) {
    await request(
      "POST",
      { action: "toggle_schedule", id: schedule.id, active: !schedule.active },
      `schedule-${schedule.id}`
    );
  }

  async function saveAvailabilityWindow(event: FormEvent) {
    event.preventDefault();
    await request(
      "POST",
      {
        action: "update_product_window",
        productId: windowForm.productId,
        availableFrom: windowForm.availableFrom || null,
        availableUntil: windowForm.availableUntil || null,
      },
      "availability"
    );
  }

  async function retryJob(id: string) {
    await request("POST", { action: "retry_job", id }, `job-${id}`);
  }

  const activeSchedules = useMemo(() => {
    const now = Date.now();
    return data.schedules.filter((schedule) => {
      if (!schedule.active) return false;
      const starts = new Date(schedule.starts_at).getTime();
      const ends = schedule.ends_at ? new Date(schedule.ends_at).getTime() : Number.POSITIVE_INFINITY;
      return starts <= now && ends > now;
    });
  }, [data.schedules]);

  if (loading) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-[#0b0c0e] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" />
          <p className="mt-4 text-sm text-white/45">Loading Commerce Control...</p>
        </div>
      </main>
    );
  }

  const checkoutOnline = data.settings.checkout_enabled !== false;
  const queueOnline = data.settings.queue_enabled !== false;

  return (
    <main className="min-h-screen bg-[#0b0c0e] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/30">ORVIX ADMIN</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Commerce Control</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45 sm:text-base">
              Reliability, checkout safety, stock variants, scheduled prices, queue health and emergency controls in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black hover:bg-white/[0.08]"
          >
            Refresh everything
          </button>
        </header>

        {(message || error) && (
          <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>
            {error || message}
          </div>
        )}

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {[
            ["Orders · 15 min", data.health.ordersLast15m],
            ["Orders today", data.health.ordersToday],
            ["Low stock", data.health.lowStockProducts],
            ["Pending jobs", data.health.pendingJobs],
            ["Dead jobs", data.health.deadJobs],
            ["Bosta errors · 24h", data.health.bostaErrors24h],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <p className="text-xs font-bold text-white/35">{String(label)}</p>
              <p className="mt-3 text-3xl font-black">{metric(value)}</p>
            </div>
          ))}
        </section>

        <section className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className={`rounded-[30px] border p-6 ${checkoutOnline ? "border-emerald-400/20 bg-emerald-500/[0.07]" : "border-red-400/25 bg-red-500/[0.09]"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Emergency control</p>
                <h2 className="mt-2 text-2xl font-black">Checkout {checkoutOnline ? "OPEN" : "PAUSED"}</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Kill switch for new orders. Existing admin data and the storefront stay online.
                </p>
              </div>
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${checkoutOnline ? "bg-emerald-300" : "bg-red-300"}`} />
            </div>
            <button
              type="button"
              disabled={busy === "checkout"}
              onClick={() => void toggleCheckout()}
              className={`mt-6 w-full rounded-2xl px-5 py-4 font-black transition disabled:opacity-40 ${checkoutOnline ? "bg-red-500 text-white hover:bg-red-400" : "bg-white text-black hover:bg-gray-200"}`}
            >
              {busy === "checkout" ? "Updating..." : checkoutOnline ? "Pause New Orders" : "Open Checkout"}
            </button>
          </div>

          <div className={`rounded-[30px] border p-6 ${queueOnline ? "border-violet-400/20 bg-violet-500/[0.07]" : "border-amber-400/20 bg-amber-500/[0.07]"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Background operations</p>
                <h2 className="mt-2 text-2xl font-black">Queue {queueOnline ? "RUNNING" : "PAUSED"}</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Email jobs are separated from checkout so slow third-party services do not block an order.
                </p>
              </div>
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${queueOnline ? "bg-violet-300" : "bg-amber-300"}`} />
            </div>
            <button
              type="button"
              disabled={busy === "queue"}
              onClick={() => void toggleQueue()}
              className="mt-6 w-full rounded-2xl border border-white/10 bg-white px-5 py-4 font-black text-black disabled:opacity-40"
            >
              {busy === "queue" ? "Updating..." : queueOnline ? "Pause Queue" : "Resume Queue"}
            </button>
          </div>
        </section>

        <form onSubmit={saveSettings} className="mt-7 rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Traffic protection</p>
              <h2 className="mt-2 text-2xl font-black">Checkout Guardrails</h2>
            </div>
            <p className="text-xs text-white/30">Atomic stock + idempotency are always enforced.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-bold text-white/55">
              Max quantity / order
              <input type="number" min="1" max="100" value={settingsDraft.maxQuantity} onChange={(event) => setSettingsDraft((current) => ({ ...current, maxQuantity: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25" />
            </label>
            <label className="text-sm font-bold text-white/55">
              Order attempts / minute / source
              <input type="number" min="1" max="1000" value={settingsDraft.rateLimit} onChange={(event) => setSettingsDraft((current) => ({ ...current, rateLimit: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25" />
            </label>
            <label className="text-sm font-bold text-white/55">
              Duplicate protection window · seconds
              <input type="number" min="60" max="86400" value={settingsDraft.duplicateWindow} onChange={(event) => setSettingsDraft((current) => ({ ...current, duplicateWindow: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25" />
            </label>
          </div>
          <button disabled={busy === "settings"} className="mt-5 rounded-2xl bg-white px-6 py-3 font-black text-black disabled:opacity-40">
            {busy === "settings" ? "Saving..." : "Save Guardrails"}
          </button>
        </form>

        <section className="mt-7 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Per option inventory</p>
            <h2 className="mt-2 text-2xl font-black">Variant Stock</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Once variants are added to a product, its total stock is automatically derived from their stock.
            </p>

            <form onSubmit={createVariant} className="mt-5 grid gap-3 sm:grid-cols-2">
              <select required value={variantForm.productId} onChange={(event) => setVariantForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-2xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold">
                {data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <input required placeholder="Label · Black" value={variantForm.label} onChange={(event) => setVariantForm((current) => ({ ...current, label: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              <input required placeholder="Key · black" value={variantForm.variantKey} onChange={(event) => setVariantForm((current) => ({ ...current, variantKey: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" placeholder="Stock" value={variantForm.stockQuantity} onChange={(event) => setVariantForm((current) => ({ ...current, stockQuantity: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
                <input type="number" min="0" placeholder="Low alert" value={variantForm.lowStockLimit} onChange={(event) => setVariantForm((current) => ({ ...current, lowStockLimit: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              </div>
              <button disabled={busy === "new-variant"} className="rounded-2xl bg-white px-5 py-3 font-black text-black disabled:opacity-40 sm:col-span-2">
                {busy === "new-variant" ? "Creating..." : "Add Variant"}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {data.variants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">No variant stock configured yet. Product-level stock remains active.</div>
              ) : data.variants.map((variant) => (
                <div key={variant.id} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{variant.label}</p>
                      <p className="mt-1 text-xs text-white/30">{productName(data.products, variant.product_id)} · {variant.variant_key}</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-white/45">
                      Sale
                      <input type="checkbox" checked={variant.allow_purchase} onChange={(event) => patchVariant(variant.id, { allow_purchase: event.target.checked })} className="h-4 w-4" />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/25">Stock<input type="number" min="0" value={variant.stock_quantity} onChange={(event) => patchVariant(variant.id, { stock_quantity: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/25">Low<input type="number" min="0" value={variant.low_stock_limit} onChange={(event) => patchVariant(variant.id, { low_stock_limit: Math.max(0, Number(event.target.value)) })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/25">Order<input type="number" value={variant.display_order} onChange={(event) => patchVariant(variant.id, { display_order: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" /></label>
                    <label className="flex items-end pb-2 text-xs font-bold text-white/45"><input type="checkbox" checked={variant.active} onChange={(event) => patchVariant(variant.id, { active: event.target.checked })} className="mr-2 h-4 w-4" />Active</label>
                  </div>
                  <button type="button" disabled={busy === `variant-${variant.id}`} onClick={() => void saveVariant(variant)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black disabled:opacity-40">{busy === `variant-${variant.id}` ? "Saving..." : "Save Variant"}</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Automatic campaigns</p>
                <h2 className="mt-2 text-2xl font-black">Scheduled Pricing</h2>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/45">{activeSchedules.length} active</span>
            </div>

            <form onSubmit={createSchedule} className="mt-5 grid gap-3 sm:grid-cols-2">
              <select required value={scheduleForm.productId} onChange={(event) => setScheduleForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-2xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold sm:col-span-2">
                {data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <input required type="number" min="0" step="1" placeholder="Sale price EGP" value={scheduleForm.price} onChange={(event) => setScheduleForm((current) => ({ ...current, price: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              <input type="number" min="0" step="1" placeholder="Original / crossed price" value={scheduleForm.compareAtPrice} onChange={(event) => setScheduleForm((current) => ({ ...current, compareAtPrice: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              <label className="text-xs font-bold text-white/35">Starts<input required type="datetime-local" value={scheduleForm.startsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, startsAt: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /></label>
              <label className="text-xs font-bold text-white/35">Ends · optional<input type="datetime-local" value={scheduleForm.endsAt} onChange={(event) => setScheduleForm((current) => ({ ...current, endsAt: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /></label>
              <input type="number" placeholder="Priority" value={scheduleForm.priority} onChange={(event) => setScheduleForm((current) => ({ ...current, priority: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none" />
              <button disabled={busy === "new-schedule"} className="rounded-2xl bg-white px-5 py-3 font-black text-black disabled:opacity-40">{busy === "new-schedule" ? "Scheduling..." : "Schedule Price"}</button>
            </form>

            <div className="mt-6 space-y-3">
              {data.schedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">No scheduled prices.</div>
              ) : data.schedules.slice(0, 20).map((schedule) => (
                <div key={schedule.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">{productName(data.products, schedule.product_id)} · {Number(schedule.price).toLocaleString("en-GB")} EGP</p>
                    <p className="mt-1 text-xs text-white/35">{formatDate(schedule.starts_at)} → {formatDate(schedule.ends_at)}</p>
                    {schedule.compare_at_price !== null && schedule.compare_at_price !== undefined && <p className="mt-1 text-xs text-white/25">Compare at {Number(schedule.compare_at_price).toLocaleString("en-GB")} EGP</p>}
                  </div>
                  <button type="button" disabled={busy === `schedule-${schedule.id}`} onClick={() => void toggleSchedule(schedule)} className={`rounded-xl px-4 py-2 text-xs font-black disabled:opacity-40 ${schedule.active ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/40"}`}>{schedule.active ? "Active · Disable" : "Disabled · Enable"}</button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={saveAvailabilityWindow} className="rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Launch control</p>
            <h2 className="mt-2 text-2xl font-black">Product Sale Window</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">Schedule when a product may be purchased without changing its page manually.</p>
            <select required value={windowForm.productId} onChange={(event) => setWindowForm((current) => ({ ...current, productId: event.target.value }))} className="mt-5 w-full rounded-2xl border border-white/10 bg-[#111214] px-4 py-3 text-sm font-bold">
              {data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <label className="mt-4 block text-xs font-bold text-white/35">Available from · optional<input type="datetime-local" value={windowForm.availableFrom} onChange={(event) => setWindowForm((current) => ({ ...current, availableFrom: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>
            <label className="mt-4 block text-xs font-bold text-white/35">Available until · optional<input type="datetime-local" value={windowForm.availableUntil} onChange={(event) => setWindowForm((current) => ({ ...current, availableUntil: event.target.value }))} className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white" /></label>
            <button disabled={busy === "availability"} className="mt-5 w-full rounded-2xl bg-white px-5 py-3 font-black text-black disabled:opacity-40">{busy === "availability" ? "Saving..." : "Save Sale Window"}</button>
          </form>

          <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Retries & failures</p>
                <h2 className="mt-2 text-2xl font-black">Background Queue</h2>
              </div>
              <button type="button" disabled={busy === "housekeeping"} onClick={() => void request("POST", { action: "run_housekeeping" }, "housekeeping")} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-white/55 disabled:opacity-40">Run housekeeping</button>
            </div>

            <div className="mt-5 space-y-3">
              {data.jobs.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-6 text-center text-sm font-bold text-emerald-200">Queue is clear.</div>
              ) : data.jobs.map((job) => (
                <div key={job.id} className={`rounded-2xl border p-4 ${job.status === "dead" ? "border-red-400/20 bg-red-500/[0.07]" : "border-white/[0.08] bg-black/20"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-black">{job.kind}</p>
                      <p className="mt-1 text-xs text-white/35">{job.status.toUpperCase()} · attempt {job.attempts}/{job.max_attempts} · next {formatDate(job.run_after)}</p>
                      {job.last_error && <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-200/65">{job.last_error}</p>}
                    </div>
                    {(job.status === "dead" || job.status === "pending") && (
                      <button type="button" disabled={busy === `job-${job.id}`} onClick={() => void retryJob(job.id)} className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-40">{busy === `job-${job.id}` ? "Retrying..." : "Retry now"}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-7 rounded-[30px] border border-white/[0.08] bg-white/[0.03] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">Live catalog status</p>
          <h2 className="mt-2 text-2xl font-black">Products at a glance</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.products.map((product) => (
              <div key={product.id} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">{product.name}</p>
                    <p className="mt-1 text-xs text-white/30">{product.slug}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${product.allow_purchase && product.status === "available" && product.stock_quantity > 0 ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"}`}>{product.allow_purchase && product.status === "available" && product.stock_quantity > 0 ? "SELLING" : "OFF"}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[10px] text-white/25">PRICE</p><p className="mt-1 text-sm font-black">{Number(product.price || 0).toLocaleString("en-GB")}</p></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[10px] text-white/25">STOCK</p><p className="mt-1 text-sm font-black">{product.stock_quantity}</p></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><p className="text-[10px] text-white/25">LOW</p><p className="mt-1 text-sm font-black">{product.low_stock_limit}</p></div>
                </div>
                {(product.available_from || product.available_until) && <p className="mt-3 text-xs leading-5 text-white/30">Window: {formatDate(product.available_from)} → {formatDate(product.available_until)}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
