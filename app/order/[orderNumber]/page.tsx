"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import TrustStrip from "@/components/TrustStrip";
import { useLanguage } from "@/components/LanguageProvider";

type OrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  variantLabel?: string | null;
  colour: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPreorder: boolean;
  estimatedDeliveryFrom?: string | null;
  estimatedDeliveryTo?: string | null;
};

type TimelineEvent = {
  id: number;
  eventType: string;
  title: string;
  details?: string | null;
  status?: string | null;
  createdAt: string;
};

type Order = {
  orderNumber: string;
  customerName?: string | null;
  governorate: string;
  address?: string | null;
  productsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  orderType: string;
  itemCount: number;
  estimatedDeliveryFrom?: string | null;
  estimatedDeliveryTo?: string | null;
  createdAt: string;
  shippingStatus?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
  lastUpdatedAt?: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
};

const ACCESS_KEY = "orvixLastOrderAccess";
const statusOrder = ["new", "confirmed", "shipped", "out_for_delivery", "delivered"];

function money(value: number, ar: boolean) {
  return `${Math.round(value).toLocaleString(ar ? "ar-EG" : "en-GB")} ${ar ? "ج.م" : "EGP"}`;
}

function date(value: string | null | undefined, ar: boolean) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(ar ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function dateOnly(value: string | null | undefined, ar: boolean) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(ar ? "ar-EG" : "en-GB", { dateStyle: "medium" });
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function CustomerOrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const { language, isArabic } = useLanguage();
  const orderNumber = decodeURIComponent(Array.isArray(params.orderNumber) ? params.orderNumber[0] : params.orderNumber || "").toUpperCase();
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadOrder(accessPhone: string) {
    if (!accessPhone.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone: accessPhone.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.order) throw new Error(result.message || "Could not load order.");
      setOrder(result.order as Order);
      setPhone(accessPhone.trim());
      window.sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ orderNumber, phone: accessPhone.trim() }));
    } catch (loadError) {
      setOrder(null);
      setError(loadError instanceof Error ? loadError.message : "Could not load order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(ACCESS_KEY) || "null");
      if (saved?.orderNumber === orderNumber && saved?.phone) {
        setPhone(String(saved.phone));
        void loadOrder(String(saved.phone));
      }
    } catch {
      // The form stays available when the session record cannot be read.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const currentStatusIndex = useMemo(() => {
    if (!order || order.status === "cancelled") return -1;
    return statusOrder.indexOf(order.status);
  }, [order]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void loadOrder(phone);
  }

  return (
    <main lang={language} dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#070707] text-white">
      <Navbar />
      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <Link href="/track-order" className="text-xs font-bold text-white/35 hover:text-white">{isArabic ? "→ تتبّع طلب آخر" : "← Track another order"}</Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/25">ORVIX ORDER</p>
              <h1 className="mt-2 break-all text-3xl font-black tracking-[-0.03em] sm:text-4xl">{orderNumber}</h1>
            </div>
            {order ? <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1.5 text-xs font-black ${order.status === "cancelled" ? "border-red-300/20 bg-red-400/10 text-red-200" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"}`}>{label(order.status)}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/60">{label(order.paymentStatus)}</span></div> : null}
          </div>

          {!order ? (
            <form onSubmit={submit} className="mt-8 max-w-xl rounded-[28px] border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-xl font-black">{isArabic ? "افتح تفاصيل طلبك" : "Open your order details"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/38">{isArabic ? "اكتب رقم الهاتف المستخدم في الطلب للتحقق وعرض التفاصيل." : "Enter the phone number used for this order to verify access."}</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input required type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={isArabic ? "رقم الهاتف" : "Phone number"} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30" /><button disabled={loading} className="rounded-2xl bg-white px-6 py-4 font-black text-black disabled:opacity-40">{loading ? "…" : isArabic ? "عرض الطلب" : "View order"}</button></div>
              {error ? <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-semibold text-red-100">{error}</p> : null}
            </form>
          ) : (
            <div className="mt-8 space-y-6">
              {order.status === "cancelled" ? (
                <div className="rounded-[24px] border border-red-300/20 bg-red-400/[0.07] p-5"><p className="font-black text-red-100">{isArabic ? "تم إلغاء الطلب" : "This order was cancelled"}</p><p className="mt-1 text-sm text-red-100/50">{isArabic ? "تواصل مع ORVIX Support لو محتاج مساعدة." : "Contact ORVIX Support if you need help with this order."}</p></div>
              ) : (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <div className="grid grid-cols-5 gap-2">
                    {statusOrder.map((status, index) => {
                      const done = index <= currentStatusIndex;
                      return <div key={status} className="text-center"><div className={`mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs font-black ${done ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white/20"}`}>{done ? "✓" : index + 1}</div><p className={`mt-2 text-[9px] font-bold sm:text-[11px] ${done ? "text-white/70" : "text-white/20"}`}>{label(status)}</p></div>;
                    })}
                  </div>
                </section>
              )}

              {order.orderType !== "standard" && order.estimatedDeliveryFrom && order.estimatedDeliveryTo ? (
                <section className="rounded-[28px] border border-violet-300/20 bg-violet-400/[0.07] p-5 sm:p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-100/45">{isArabic ? "موعد الطلب المسبق" : "PRE-ORDER WINDOW"}</p>
                  <p className="mt-2 text-xl font-black text-violet-100">{dateOnly(order.estimatedDeliveryFrom, isArabic)} → {dateOnly(order.estimatedDeliveryTo, isArabic)}</p>
                  <p className="mt-2 text-sm leading-6 text-violet-100/50">{isArabic ? "ده الموعد المتوقع لوصول كل منتجات الطلب الجاهزة للشحن معًا." : "This is the estimated window for the full order to be ready for delivery."}</p>
                </section>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px] lg:items-start">
                <div className="space-y-6">
                  <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                    <div className="flex items-center justify-between"><h2 className="text-xl font-black">{isArabic ? "المنتجات" : "Items"}</h2><span className="text-xs font-bold text-white/30">{order.itemCount}</span></div>
                    <div className="mt-4 divide-y divide-white/8">{order.items.map((item) => <article key={item.id} className="py-4 first:pt-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.productName}</p>{item.isPreorder ? <span className="rounded-full bg-violet-400/10 px-2 py-1 text-[9px] font-black text-violet-200">PRE-ORDER</span> : null}</div><p className="mt-1 text-xs text-white/35">{item.variantLabel || item.colour} · {isArabic ? "الكمية" : "Qty"} {item.quantity}</p>{item.isPreorder && item.estimatedDeliveryFrom ? <p className="mt-2 text-xs font-semibold text-violet-200/60">{dateOnly(item.estimatedDeliveryFrom, isArabic)} → {dateOnly(item.estimatedDeliveryTo, isArabic)}</p> : null}</div><p className="font-black">{money(item.lineTotal, isArabic)}</p></div></article>)}</div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                    <h2 className="text-xl font-black">{isArabic ? "سجل الطلب" : "Order timeline"}</h2>
                    <div className="mt-5 space-y-0">{order.timeline.map((event, index) => <div key={`${event.id}-${index}`} className="grid grid-cols-[22px_1fr] gap-3"><div className="flex flex-col items-center"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-white" />{index < order.timeline.length - 1 ? <span className="min-h-14 w-px flex-1 bg-white/10" /> : null}</div><div className="pb-5"><p className="text-sm font-black">{event.title}</p>{event.details ? <p className="mt-1 text-xs leading-5 text-white/35">{event.details}</p> : null}<p className="mt-1 text-[10px] font-semibold text-white/20">{date(event.createdAt, isArabic)}</p></div></div>)}</div>
                  </section>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-24">
                  <section className="rounded-[28px] border border-white/10 bg-[#111214] p-5">
                    <h2 className="font-black">{isArabic ? "ملخص الدفع" : "Payment summary"}</h2>
                    <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-white/35">{isArabic ? "المنتجات" : "Products"}</span><b>{money(order.productsTotal + Math.max(order.discountAmount - order.deliveryFee, 0), isArabic)}</b></div><div className="flex justify-between"><span className="text-white/35">{isArabic ? "التوصيل" : "Delivery"}</span><b>{money(order.deliveryFee, isArabic)}</b></div>{order.discountAmount > 0 ? <div className="flex justify-between text-emerald-300"><span>{isArabic ? "الخصم" : "Discount"}</span><b>-{money(order.discountAmount, isArabic)}</b></div> : null}</div>
                    <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5"><span className="font-black">{isArabic ? "الإجمالي" : "Total"}</span><b className="text-2xl">{money(order.totalPrice, isArabic)}</b></div>
                    <div className="mt-4 rounded-2xl bg-white/[0.035] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">{isArabic ? "حالة الدفع" : "Payment"}</p><p className="mt-1 font-black">{label(order.paymentStatus)}</p></div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-[#111214] p-5">
                    <h2 className="font-black">{isArabic ? "التوصيل" : "Delivery"}</h2>
                    <p className="mt-3 text-sm font-semibold">{order.governorate}</p>{order.address ? <p className="mt-1 text-xs leading-5 text-white/35">{order.address}</p> : null}
                    {order.trackingNumber ? <div className="mt-4 rounded-2xl bg-white/[0.035] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">Tracking</p><p className="mt-1 break-all font-black">{order.trackingNumber}</p>{order.carrierStatus ? <p className="mt-1 text-xs text-white/40">{order.carrierStatus}</p> : null}</div> : null}
                  </section>

                  <Link href={`/chat?order=${encodeURIComponent(order.orderNumber)}`} className="block rounded-full bg-white px-5 py-4 text-center text-sm font-black text-black">{isArabic ? "تواصل مع الدعم" : "Contact support"}</Link>
                </aside>
              </div>

              <TrustStrip />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
