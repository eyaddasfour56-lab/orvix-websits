"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Detail = {
  order: {
    id: string;
    order_number?: string;
    customer_name?: string;
    phone?: string;
    governorate?: string;
    address?: string;
    total_price?: number | string;
    products_total?: number | string;
    delivery_fee?: number | string;
    payment_method?: string;
    payment_status?: string;
    bosta_tracking_number?: string;
    notes?: string;
  };
  items: Array<{
    id?: string;
    product_name?: string;
    variant_label?: string;
    colour?: string;
    quantity?: number;
  }>;
};

function money(value: unknown) {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? Math.round(amount).toLocaleString("en-GB") : "0"} EGP`;
}

function label(value: unknown) {
  return String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PrintOrderPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/admin/orders-v2?orderId=${encodeURIComponent(id)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load order.");
        if (!cancelled) setDetail(result as Detail);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-[#ececec] px-4 py-6 text-black print:bg-white print:p-0">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <button type="button" onClick={() => window.close()} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-black">Close</button>
          <button type="button" disabled={!detail} onClick={() => window.print()} className="rounded-xl bg-black px-5 py-2.5 text-xs font-black text-white disabled:opacity-30">Print label</button>
        </div>

        {loading ? <div className="rounded-2xl bg-white p-12 text-center text-sm text-black/40">Loading label…</div> : null}
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">{error}</div> : null}

        {detail ? (
          <section className="rounded-[24px] bg-white p-7 shadow-sm print:rounded-none print:p-5 print:shadow-none">
            <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-5">
              <div><p className="text-[11px] font-black tracking-[0.24em]">ORVIX</p><h1 className="mt-1 text-2xl font-black">DELIVERY LABEL</h1></div>
              <div className="text-right"><p className="text-[10px] font-bold uppercase text-black/45">Order</p><p className="mt-1 text-lg font-black">{detail.order.order_number || "—"}</p>{detail.order.bosta_tracking_number ? <p className="mt-1 text-[10px] font-bold">Tracking: {detail.order.bosta_tracking_number}</p> : null}</div>
            </div>

            <div className="grid gap-6 border-b border-black/15 py-5 sm:grid-cols-2">
              <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">Customer</p><p className="mt-2 text-xl font-black">{detail.order.customer_name || "—"}</p><p className="mt-1 text-base font-bold">{detail.order.phone || "—"}</p></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">Delivery address</p><p className="mt-2 font-black">{detail.order.governorate || "—"}</p><p className="mt-1 text-sm leading-5">{detail.order.address || "—"}</p></div>
            </div>

            <div className="border-b border-black/15 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/40">Items</p>
              <div className="mt-3 space-y-2">{detail.items.length ? detail.items.map((item, index) => <div key={item.id || index} className="flex justify-between gap-4 text-sm"><div><span className="font-black">{item.product_name || "Product"}</span><span className="ml-2 text-black/55">{item.variant_label || item.colour || "Standard"}</span></div><b>×{Number(item.quantity || 1)}</b></div>) : <p className="text-sm font-bold">Order item details are stored on the legacy order record.</p>}</div>
            </div>

            <div className="grid gap-5 py-5 sm:grid-cols-3">
              <div><p className="text-[10px] font-black uppercase text-black/40">Products</p><p className="mt-1 font-black">{money(detail.order.products_total)}</p></div>
              <div><p className="text-[10px] font-black uppercase text-black/40">Delivery</p><p className="mt-1 font-black">{money(detail.order.delivery_fee)}</p></div>
              <div><p className="text-[10px] font-black uppercase text-black/40">Collect / Total</p><p className="mt-1 text-lg font-black">{money(detail.order.total_price)}</p></div>
            </div>

            <div className="grid gap-3 border-t-2 border-black pt-4 sm:grid-cols-2">
              <div><p className="text-[10px] font-black uppercase text-black/40">Payment method</p><p className="mt-1 text-sm font-black">{label(detail.order.payment_method)}</p></div>
              <div className="sm:text-right"><p className="text-[10px] font-black uppercase text-black/40">Payment status</p><p className="mt-1 text-sm font-black">{label(detail.order.payment_status)}</p></div>
            </div>

            {detail.order.notes && detail.order.notes !== "No notes" ? <div className="mt-5 rounded-xl border border-black/10 p-3"><p className="text-[9px] font-black uppercase text-black/40">Notes</p><p className="mt-1 text-xs font-semibold">{detail.order.notes}</p></div> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
