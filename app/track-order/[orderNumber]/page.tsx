"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { Language, useLanguage } from "@/components/LanguageProvider";

type TimelineEvent = {
  id: number | string;
  eventType: string;
  title: string;
  details?: string | null;
  status?: string | null;
  createdAt: string;
};

type OrderItem = {
  id: string;
  productName: string;
  variantLabel?: string | null;
  colour?: string | null;
  quantity: number;
  lineTotal: number;
};

type TrackedOrder = {
  orderNumber: string;
  governorate: string;
  totalPrice: number;
  journeyStatus: string;
  orderState: "active" | "cancelled" | "delivered";
  paymentStatus: string;
  createdAt: string;
  lastUpdatedAt: string;
  estimatedDeliveryFrom?: string | null;
  estimatedDeliveryTo?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
  courierStatus?: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
};

type TrackingResult = {
  success?: boolean;
  message?: string;
  orders?: TrackedOrder[];
};

const copy = {
  en: {
    back: "← Back to Track Order",
    title: "Order Journey",
    subtitle: "Your complete order journey from international pre-order to final delivery.",
    orderState: "Order State",
    currentJourney: "Current Journey",
    cancelled: "This order is cancelled. The last real journey milestone remains preserved below.",
    international: "International Pre-Order Tracking",
    egypt: "Egypt Import Tracking",
    orvix: "ORVIX Handling",
    courier: "Live Courier Tracking",
    manual: "IMPORT JOURNEY",
    automatic: "LIVE FROM BOSTA",
    tracking: "Tracking Number",
    noCourier: "Courier tracking has not started yet.",
    items: "Order Items",
    total: "Total",
    missingSession: "For privacy, open this page from Track Order after entering your phone number.",
    openTracking: "Open Track Order",
  },
  ar: {
    back: "← الرجوع لتتبع الطلب",
    title: "رحلة الطلب",
    subtitle: "كل تفاصيل رحلة الطلب من الـPre-Order خارج مصر لحد التوصيل.",
    orderState: "حالة الطلب",
    currentJourney: "المرحلة الحالية",
    cancelled: "الطلب ملغي، لكن آخر مرحلة حقيقية وصل لها الطلب ما زالت محفوظة بالأسفل.",
    international: "International Pre-Order Tracking",
    egypt: "Egypt Import Tracking",
    orvix: "ORVIX Handling",
    courier: "Live Courier Tracking",
    manual: "رحلة الاستيراد",
    automatic: "LIVE FROM BOSTA",
    tracking: "رقم التتبع",
    noCourier: "تتبع شركة الشحن لم يبدأ بعد.",
    items: "المنتجات",
    total: "الإجمالي",
    missingSession: "للخصوصية افتح الصفحة دي من Track Order بعد ما تدخل رقم الموبايل.",
    openTracking: "فتح Track Order",
  },
} as const;

const statusLabels: Record<Language, Record<string, string>> = {
  en: {
    new: "Pre-Ordered",
    international_transit: "In Transit to Egypt",
    arrived_egypt: "Arrived in Egypt",
    in_customs: "In Customs",
    customs_cleared: "Customs Cleared",
    received_at_orvix: "Received at ORVIX",
    ready_for_courier: "Ready for Courier",
    courier_requested: "Courier Requested",
    waiting_for_route: "Waiting for Pickup Route",
    route_assigned: "Courier Route Assigned",
    picked_up: "Picked Up from ORVIX",
    bosta_warehouse: "Received at Bosta Warehouse",
    in_transit: "In Transit with Bosta",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  },
  ar: {
    new: "Pre-Ordered",
    international_transit: "في الطريق إلى مصر",
    arrived_egypt: "وصل مصر",
    in_customs: "في الجمارك",
    customs_cleared: "تم التخليص الجمركي",
    received_at_orvix: "وصل ORVIX",
    ready_for_courier: "جاهز لشركة الشحن",
    courier_requested: "تم طلب شركة الشحن",
    waiting_for_route: "في انتظار الاستلام",
    route_assigned: "تم تعيين خط الاستلام",
    picked_up: "تم الاستلام من ORVIX",
    bosta_warehouse: "وصل مخزن بوسطة",
    in_transit: "في الطريق مع بوسطة",
    out_for_delivery: "خرج للتوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  },
};

const manualGroups = [
  { key: "international", statuses: ["new", "international_transit"] },
  { key: "egypt", statuses: ["arrived_egypt", "in_customs", "customs_cleared"] },
  { key: "orvix", statuses: ["received_at_orvix", "ready_for_courier"] },
] as const;

const manualOrder = manualGroups.flatMap((group) => group.statuses);

function clean(value: unknown) {
  return String(value || "new").trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function label(value: unknown, language: Language) {
  const status = clean(value);
  return statusLabels[language][status] || status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function when(value: unknown, language: Language) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function money(value: number, language: Language) {
  return `${Number(value || 0).toLocaleString(language === "ar" ? "ar-EG" : "en-GB")} ${language === "ar" ? "ج.م" : "EGP"}`;
}

export default function FullOrderJourneyPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(String(params?.orderNumber || ""));
  const { language } = useLanguage();
  const t = copy[language];
  const rtl = language === "ar";
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingSession, setMissingSession] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const phone = window.sessionStorage.getItem("orvixTrackingPhone") || "";
      if (!phone) {
        if (!cancelled) { setMissingSession(true); setLoading(false); }
        return;
      }
      try {
        const response = await fetch("/api/track-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const result = (await response.json()) as TrackingResult;
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load order journey.");
        const match = (result.orders || []).find((item) => item.orderNumber === orderNumber);
        if (!match) throw new Error("Order not found for this phone number.");
        if (!cancelled) setOrder(match);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load order journey.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [orderNumber]);

  const reachedStatuses = useMemo(() => new Set((order?.timeline || []).map((event) => clean(event.status))), [order]);
  const currentIndex = Math.max(0, manualOrder.indexOf(clean(order?.journeyStatus)));
  const courierEvents = (order?.timeline || []).filter((event) => event.eventType === "courier_milestone");
  const cancellationEvent = (order?.timeline || []).find((event) => event.eventType === "order_cancelled");

  if (loading) return <main className="min-h-screen bg-[#090a0c] text-white"><Navbar /><div className="px-6 pt-32 text-center text-sm text-white/35">Loading journey…</div></main>;

  if (missingSession) return <main className="min-h-screen bg-[#090a0c] text-white"><Navbar /><div className="mx-auto max-w-xl px-6 pt-32 text-center"><p className="text-sm text-white/45">{t.missingSession}</p><Link href="/track-order" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black">{t.openTracking}</Link></div></main>;

  if (!order) return <main className="min-h-screen bg-[#090a0c] text-white"><Navbar /><div className="mx-auto max-w-xl px-6 pt-32 text-center"><p className="text-sm text-red-200">{error || "Order not found."}</p><Link href="/track-order" className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black">{t.openTracking}</Link></div></main>;

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#090a0c] text-white">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6">
        <Link href="/track-order" className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">{t.back}</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25">{order.orderNumber}</p><h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">{t.title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">{t.subtitle}</p></div>
          <div className="flex flex-wrap gap-2"><span className="rounded-full border border-violet-300/15 bg-violet-400/[0.07] px-3 py-2 text-[10px] font-black text-violet-100">{t.currentJourney} · {label(order.journeyStatus, language)}</span><span className={`rounded-full border px-3 py-2 text-[10px] font-black ${order.orderState === "cancelled" ? "border-red-300/20 bg-red-400/10 text-red-100" : order.orderState === "delivered" ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}>{t.orderState} · {label(order.orderState, language)}</span></div>
        </div>

        {order.orderState === "cancelled" ? <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4"><p className="text-sm font-black text-red-100">{label("cancelled", language)}</p><p className="mt-1 text-xs leading-6 text-red-100/55">{t.cancelled}</p><p className="mt-1 text-[9px] text-red-100/35">{cancellationEvent ? when(cancellationEvent.createdAt, language) : ""}</p></div> : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">{t.total}</p><p className="mt-2 text-lg font-black">{money(order.totalPrice, language)}</p></article><article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">{t.tracking}</p><p className="mt-2 truncate text-sm font-black">{order.trackingNumber || "—"}</p></article><article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Payment</p><p className="mt-2 text-sm font-black">{label(order.paymentStatus, language)}</p></article><article className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><p className="text-[9px] font-black uppercase text-white/25">Last Update</p><p className="mt-2 text-sm font-black">{when(order.lastUpdatedAt, language)}</p></article></section>

        <div className="mt-5 space-y-4">
          {manualGroups.map((group) => {
            const groupTitle = group.key === "international" ? t.international : group.key === "egypt" ? t.egypt : t.orvix;
            return <article key={group.key} className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.manual}</p><h2 className="mt-2 text-xl font-black">{groupTitle}</h2></div></div><div className="mt-5 space-y-2">{group.statuses.map((status) => {
              const index = manualOrder.indexOf(status);
              const reached = reachedStatuses.has(status) || index <= currentIndex;
              const current = status === clean(order.journeyStatus);
              const event = [...order.timeline].reverse().find((item) => clean(item.status) === status && item.eventType === "journey_milestone");
              return <div key={status} className={`flex gap-3 rounded-2xl border p-4 ${current ? "border-violet-300/20 bg-violet-400/[0.07]" : reached ? "border-emerald-300/10 bg-emerald-400/[0.03]" : "border-white/7 bg-black/10"}`}><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-black ${current ? "border-violet-200 bg-violet-200 text-black" : reached ? "border-emerald-300/25 text-emerald-200" : "border-white/10 text-white/20"}`}>{reached ? "✓" : index + 1}</span><div><p className={`text-xs font-black ${reached ? "text-white/70" : "text-white/25"}`}>{label(status, language)}</p>{event?.details ? <p className="mt-1 text-[10px] leading-5 text-white/30">{event.details}</p> : null}<p className="mt-1 text-[9px] text-white/20">{event ? when(event.createdAt, language) : "—"}</p></div></div>;
            })}</div></article>;
          })}

          <article className="rounded-[26px] border border-blue-300/12 bg-blue-400/[0.035] p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/40">{t.automatic}</p><h2 className="mt-2 text-xl font-black">{t.courier}</h2></div>{order.trackingNumber ? <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2.5 py-1 text-[8px] font-black text-blue-100">LIVE</span> : null}</div>{order.trackingNumber ? <div className="mt-4"><div className="rounded-2xl border border-blue-300/15 bg-black/15 p-4"><p className="text-sm font-black text-blue-100">{order.carrierStatus || t.courier}</p><p className="mt-1 text-[10px] text-white/35">{order.trackingNumber}</p></div><div className="mt-3 space-y-2">{courierEvents.map((event) => <div key={String(event.id)} className="rounded-xl border border-white/7 bg-black/15 p-3"><p className="text-xs font-black text-white/65">{event.title}</p><p className="mt-1 text-[10px] leading-5 text-white/30">{event.details || ""}</p><p className="mt-1 text-[9px] text-white/20">{when(event.createdAt, language)}</p></div>)}</div></div> : <p className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-6 text-white/35">{t.noCourier}</p>}</article>

          <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.items}</p><div className="mt-3 divide-y divide-white/[0.07]">{order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-xs font-black text-white/70">{item.productName}</p><p className="mt-1 text-[10px] text-white/30">{item.variantLabel || item.colour || "Standard"} · {item.quantity}×</p></div><p className="text-xs font-black">{money(item.lineTotal, language)}</p></div>)}</div></article>
        </div>
      </section>
    </main>
  );
}
