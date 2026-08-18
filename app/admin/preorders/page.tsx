"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: "available" | "preorder" | "coming_soon" | "out_of_stock" | "hidden";
  allow_purchase: boolean;
  stock_quantity: number;
  preorder_min_days: number;
  preorder_max_days: number;
  updated_at: string;
};

const statuses: Array<{ value: Product["status"]; label: string }> = [
  { value: "available", label: "In stock" },
  { value: "preorder", label: "Pre-order" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "out_of_stock", label: "Sold out" },
  { value: "hidden", label: "Hidden" },
];

export default function AdminPreordersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/preorders", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load products.");
      setProducts(Array.isArray(result.products) ? result.products : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const preorderCount = useMemo(() => products.filter((product) => product.status === "preorder").length, [products]);

  function patchLocal(id: string, values: Partial<Product>) {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, ...values } : product));
  }

  async function save(product: Product) {
    setSaving(product.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/preorders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          status: product.status,
          allowPurchase: product.allow_purchase,
          preorderMinDays: product.preorder_min_days,
          preorderMaxDays: product.preorder_max_days,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save settings.");
      patchLocal(product.id, result.product);
      setMessage(`${product.name} updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">COMMERCE CONTROL</p><h1 className="mt-2 text-3xl font-black tracking-[-0.03em]">Pre-order system</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/38">Set each product to in-stock, pre-order, coming soon, sold out or hidden. Pre-orders can stay purchasable with zero physical stock.</p></div>
          <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.06] px-5 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-100/40">Active pre-orders</p><p className="mt-1 text-2xl font-black text-violet-100">{preorderCount}</p></div>
        </div>

        {message ? <p className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4 text-sm font-semibold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4 text-sm font-semibold text-red-100">{error}</p> : null}

        {loading ? <div className="mt-8 rounded-[28px] border border-white/8 bg-white/[0.025] p-10 text-center text-sm text-white/30">Loading products…</div> : (
          <div className="mt-7 space-y-4">
            {products.map((product) => (
              <section key={product.id} className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-end">
                  <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{product.name}</h2><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${product.status === "preorder" ? "bg-violet-400/10 text-violet-200" : product.status === "available" ? "bg-emerald-400/10 text-emerald-200" : "bg-white/[0.06] text-white/40"}`}>{product.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-white/30">/{product.slug} · physical stock {product.stock_quantity}</p></div>
                  <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/28">Store status</span><select value={product.status} onChange={(event) => patchLocal(product.id, { status: event.target.value as Product["status"] })} className="w-full rounded-xl border border-white/10 bg-[#141518] px-3 py-3 text-sm font-bold outline-none">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
                  <div><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.14em] text-white/28">Pre-order ETA</span><div className="flex items-center gap-2"><input type="number" min={1} max={180} value={product.preorder_min_days} onChange={(event) => patchLocal(product.id, { preorder_min_days: Math.max(1, Number(event.target.value || 1)) })} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm font-bold outline-none" /><span className="text-white/20">→</span><input type="number" min={1} max={180} value={product.preorder_max_days} onChange={(event) => patchLocal(product.id, { preorder_max_days: Math.max(1, Number(event.target.value || 1)) })} className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-sm font-bold outline-none" /></div><p className="mt-1.5 text-[10px] text-white/25">days after order</p></div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end"><button type="button" onClick={() => patchLocal(product.id, { allow_purchase: !product.allow_purchase })} className={`rounded-xl border px-3 py-3 text-xs font-black ${product.allow_purchase ? "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200" : "border-red-300/15 bg-red-400/[0.06] text-red-200"}`}>{product.allow_purchase ? "Purchasing ON" : "Purchasing OFF"}</button><button type="button" disabled={saving === product.id} onClick={() => void save(product)} className="rounded-xl bg-white px-5 py-3 text-xs font-black text-black disabled:opacity-40">{saving === product.id ? "Saving…" : "Save"}</button></div>
                </div>
                {product.status === "preorder" ? <div className="mt-4 rounded-xl border border-violet-300/10 bg-violet-400/[0.045] px-4 py-3 text-xs font-semibold text-violet-100/55">Customer message: PRE-ORDER · estimated delivery {product.preorder_min_days}–{product.preorder_max_days} days.</div> : null}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
