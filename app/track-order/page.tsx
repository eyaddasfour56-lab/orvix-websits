"use client";

import { FormEvent, useMemo, useState } from "react";
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
  unitPrice: number;
  lineTotal: number;
};

type TrackedOrder = {
  orderNumber: string;
  governorate: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  lastUpdatedAt: string;
  estimatedDeliveryFrom?: string | null;
  estimatedDeliveryTo?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
  items: OrderItem[];
  timeline: TimelineEvent[];
};

type TrackingResult = {
  success?: boolean;
  message?: string;
  code?: string;
  orders?: TrackedOrder[];
};

const copy = {
  en: {
    eyebrow: "ORVIX ORDER TRACKING",
    title: "Track your order",
    subtitle: "Enter only the phone number used at checkout. You’ll see the complete journey from pre-order and import to live courier delivery.",
    phone: "Phone Number",
    placeholder: "01xxxxxxxxx",
    button: "Track Orders",
    checking: "Checking…",
    found: "Orders found",
    choose: "Choose an order",
    chooseHint: "Tap an order to view its complete journey.",
    currentStatus: "Current Status",
    journey: "Order Journey",
    courier: "Live Courier Tracking",
    trackingNumber: "Tracking Number",
    estimated: "Estimated Arrival",
    placed: "Order Placed",
    total: "Total",
    items: "Items",
    noCourier: "Courier tracking starts after ORVIX hands your package to Bosta.",
    privacy: "Only tracking information linked to this phone number is shown.",
    missing: "Please enter your phone number.",
    invalid: "Please enter a valid Egyptian mobile number.",
    notFound: "No orders were found for this phone number.",
    failed: "Could not check your orders right now.",
  },
  ar: {
    eyebrow: "تتبّع طلبات ORVIX",
    title: "تتبّع طلبك",
    subtitle: "اكتب فقط رقم الموبايل المستخدم في الطلب، وهتشوف رحلة الطلب كاملة من الـPre-Order والاستيراد لحد التوصيل مع شركة الشحن.",
    phone: "رقم الموبايل",
    placeholder: "01xxxxxxxxx",
    button: "تتبّع الطلبات",
    checking: "جارٍ البحث…",
    found: "الطلبات الموجودة",
    choose: "اختر طلبًا",
    chooseHint: "اضغط على أي طلب لعرض الرحلة كاملة.",
    currentStatus: "الحالة الحالية",
    journey: "رحلة الطلب",
    courier: "تتبع شركة الشحن",
    trackingNumber: "رقم التتبع",
    estimated: "الوصول المتوقع",
    placed: "تاريخ الطلب",
    total: "الإجمالي",
    items: "المنتجات",
    noCourier: "تتبع شركة الشحن يبدأ بعد ما ORVIX تسلّم الشحنة لبوسطة.",
    privacy: "يتم عرض معلومات التتبع المرتبطة بهذا الرقم فقط.",
    missing: "من فضلك أدخل رقم الموبايل.",
    invalid: "من فضلك أدخل رقم موبايل مصري صحيح.",
    notFound: "لم يتم العثور على طلبات مرتبطة بهذا الرقم.",
    failed: "تعذر التحقق من طلباتك الآن.",
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
    returned: "Returning to ORVIX",
    cancelled: "Cancelled",
    delivery_exception: "Delivery Exception",
    lost: "Shipment Issue",
    damaged: "Shipment Damaged",
    investigation: "Under Investigation",
    action_required: "Action Required",
    on_hold: "Shipment On Hold",
    archived: "Shipment Archived",
    courier_tracking: "Courier Tracking",
  },
  ar: {
    new: "تم تسجيل الطلب المسبق",
    international_transit: "في الطريق إلى مصر",
    arrived_egypt: "وصل مصر",
    in_customs: "في الجمارك",
    customs_cleared: "تم التخليص الجمركي",
    received_at_orvix: "وصل إلى ORVIX",
    ready_for_courier: "جاهز لشركة الشحن",
    courier_requested: "تم طلب شركة الشحن",
    waiting_for_route: "في انتظار خط الاستلام",
    route_assigned: "تم تعيين مندوب الاستلام",
    picked_up: "تم الاستلام من ORVIX",
    bosta_warehouse: "وصل مخزن بوسطة",
    in_transit: "في الطريق مع بوسطة",
    out_for_delivery: "خرج للتوصيل",
    delivered: "تم التوصيل",
    returned: "راجع إلى ORVIX",
    cancelled: "ملغي",
    delivery_exception: "مشكلة في التوصيل",
    lost: "مشكلة في الشحنة",
    damaged: "الشحنة تالفة",
    investigation: "قيد المراجعة",
    action_required: "مطلوب إجراء",
    on_hold: "الشحنة معلقة",
    archived: "تمت أرشفة الشحنة",
    courier_tracking: "تتبع شركة الشحن",
  },
};

const statusDescriptions: Record<Language, Record<string, string>> = {
  en: {
    new: "Your pre-order has been received and the import journey has started.",
    international_transit: "Your item is travelling to Egypt from abroad.",
    arrived_egypt: "Your item has arrived in Egypt and is moving through the import process.",
    in_customs: "Your item is currently being processed by Egyptian customs.",
    customs_cleared: "Customs clearance is complete and your item is moving to ORVIX.",
    received_at_orvix: "ORVIX has received your item and is preparing it for local delivery.",
    ready_for_courier: "Your package is packed and ready to be handed to the courier.",
    courier_requested: "ORVIX created the Bosta shipment and requested pickup.",
    waiting_for_route: "Bosta is scheduling a pickup route for your package.",
    route_assigned: "A pickup route has been assigned by Bosta.",
    picked_up: "Bosta has picked up your package from ORVIX.",
    bosta_warehouse: "Your package has reached a Bosta warehouse.",
    in_transit: "Your package is moving through Bosta’s delivery network.",
    out_for_delivery: "Your package is with the delivery courier and is on the way to you.",
    delivered: "Your order has been delivered successfully.",
  },
  ar: {
    new: "تم استلام طلبك المسبق وبدأت رحلة الاستيراد.",
    international_transit: "المنتج في الطريق إلى مصر من الخارج.",
    arrived_egypt: "المنتج وصل مصر وبيكمل إجراءات الدخول.",
    in_customs: "المنتج حاليًا تحت إجراءات الجمارك المصرية.",
    customs_cleared: "تم التخليص الجمركي والمنتج في طريقه إلى ORVIX.",
    received_at_orvix: "ORVIX استلمت المنتج وبتجهزه للتوصيل المحلي.",
    ready_for_courier: "الشحنة اتجهزت وبقت جاهزة لشركة الشحن.",
    courier_requested: "ORVIX أنشأت شحنة بوسطة وطلبت الاستلام.",
    waiting_for_route: "بوسطة بتحدد خط استلام الشحنة.",
    route_assigned: "تم تعيين خط ومندوب لاستلام الشحنة.",
    picked_up: "بوسطة استلمت الشحنة من ORVIX.",
    bosta_warehouse: "الشحنة وصلت مخزن بوسطة.",
    in_transit: "الشحنة بتتحرك داخل شبكة بوسطة.",
    out_for_delivery: "الشحنة مع مندوب التوصيل وفي الطريق ليك.",
    delivered: "تم توصيل طلبك بنجاح.",
  },
};

const phaseLabels: Record<Language, string[]> = {
  en: ["Pre-Order", "To Egypt", "Egypt", "Customs", "ORVIX", "Courier", "Delivered"],
  ar: ["Pre-Order", "إلى مصر", "مصر", "الجمارك", "ORVIX", "الشحن", "تم"],
};

function cleanStatus(value: string | null | undefined) {
  return String(value || "new").trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function formatStatus(value: string | null | undefined, language: Language) {
  const status = cleanStatus(value);
  return statusLabels[language][status] || status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function phaseIndex(statusValue: string | null | undefined) {
  const status = cleanStatus(statusValue);
  if (status === "cancelled") return -1;
  if (status === "new") return 0;
  if (status === "international_transit") return 1;
  if (status === "arrived_egypt") return 2;
  if (["in_customs", "customs_cleared"].includes(status)) return 3;
  if (["received_at_orvix", "ready_for_courier"].includes(status)) return 4;
  if (["courier_requested", "waiting_for_route", "route_assigned", "picked_up", "bosta_warehouse", "in_transit", "out_for_delivery", "returned", "delivery_exception", "investigation", "action_required", "on_hold", "archived", "lost", "damaged", "courier_tracking"].includes(status)) return 5;
  if (status === "delivered") return 6;
  return 0;
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function money(value: number, language: Language) {
  const locale = language === "ar" ? "ar-EG" : "en-GB";
  return `${Number(value || 0).toLocaleString(locale)} ${language === "ar" ? "ج.م" : "EGP"}`;
}

function statusTone(statusValue: string | null | undefined) {
  const status = cleanStatus(statusValue);
  if (status === "delivered") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (["cancelled", "delivery_exception", "lost", "damaged"].includes(status)) return "border-red-400/20 bg-red-400/10 text-red-200";
  if (["international_transit", "arrived_egypt", "in_customs", "customs_cleared"].includes(status)) return "border-amber-400/20 bg-amber-400/10 text-amber-100";
  if (["received_at_orvix", "ready_for_courier"].includes(status)) return "border-violet-400/20 bg-violet-400/10 text-violet-100";
  if (phaseIndex(status) === 5) return "border-blue-400/20 bg-blue-400/10 text-blue-100";
  return "border-white/10 bg-white/[0.05] text-white/70";
}

export default function TrackOrderPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const rtl = language === "ar";
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = orders[selectedIndex] || null;
  const activePhase = useMemo(() => phaseIndex(selected?.status), [selected]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setOrders([]);
    setSelectedIndex(0);

    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = (await response.json()) as TrackingResult;
      if (!response.ok || !result.success) {
        if (result.code === "MISSING_PHONE") throw new Error(t.missing);
        if (result.code === "INVALID_PHONE") throw new Error(t.invalid);
        if (result.code === "ORDER_NOT_FOUND") throw new Error(t.notFound);
        throw new Error(result.message || t.failed);
      }
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#090a0c] text-white">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">{t.eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{t.title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-7 text-white/40">{t.subtitle}</p>
        </div>

        <form onSubmit={submit} className="mx-auto mt-8 max-w-xl rounded-[26px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl sm:p-5">
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{t.phone}</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t.placeholder}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-base font-bold outline-none placeholder:text-white/20 focus:border-white/25"
            />
            <button disabled={loading || !phone.trim()} className="h-12 rounded-2xl bg-white px-6 text-sm font-black text-black disabled:opacity-40">
              {loading ? t.checking : t.button}
            </button>
          </div>
          <p className="mt-3 text-[10px] font-medium text-white/25">{t.privacy}</p>
          {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-xs font-bold text-red-100">{error}</p> : null}
        </form>

        {orders.length ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-[24px] border border-white/8 bg-white/[0.025] p-3 lg:sticky lg:top-24">
              <div className="px-2 pb-3 pt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/25">{t.found}</p>
                <p className="mt-1 text-sm font-black">{t.choose}</p>
                <p className="mt-1 text-[10px] text-white/30">{t.chooseHint}</p>
              </div>
              <div className="space-y-2">
                {orders.map((order, index) => (
                  <button
                    key={order.orderNumber}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${index === selectedIndex ? "border-white/20 bg-white/[0.08]" : "border-white/[0.06] bg-black/10 hover:bg-white/[0.04]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-black">{order.orderNumber}</p>
                      <span className={`rounded-full border px-2 py-1 text-[8px] font-black ${statusTone(order.status)}`}>{formatStatus(order.status, language)}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-white/30">{formatDate(order.createdAt, language)}</p>
                    <p className="mt-1 text-[10px] font-black text-white/55">{money(order.totalPrice, language)}</p>
                  </button>
                ))}
              </div>
            </aside>

            {selected ? (
              <section className="space-y-4">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/25">{selected.orderNumber}</p>
                      <h2 className="mt-2 text-2xl font-black">{t.currentStatus}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-2 text-[10px] font-black ${statusTone(selected.status)}`}>{formatStatus(selected.status, language)}</span>
                  </div>

                  {cleanStatus(selected.status) !== "cancelled" ? (
                    <div className="mt-7 grid grid-cols-7 gap-1.5 sm:gap-2">
                      {phaseLabels[language].map((label, index) => (
                        <div key={label} className="min-w-0">
                          <div className={`h-1.5 rounded-full ${index <= activePhase ? "bg-white" : "bg-white/10"}`} />
                          <p className={`mt-2 truncate text-center text-[7px] font-black sm:text-[8px] ${index <= activePhase ? "text-white/65" : "text-white/20"}`}>{label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.placed}</p><p className="mt-1 text-xs font-black">{formatDate(selected.createdAt, language)}</p></div>
                    <div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.total}</p><p className="mt-1 text-xs font-black">{money(selected.totalPrice, language)}</p></div>
                    <div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.estimated}</p><p className="mt-1 text-xs font-black">{selected.estimatedDeliveryFrom || "—"}{selected.estimatedDeliveryTo ? ` → ${selected.estimatedDeliveryTo}` : ""}</p></div>
                    <div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.trackingNumber}</p><p className="mt-1 truncate text-xs font-black">{selected.trackingNumber || "—"}</p></div>
                  </div>
                </article>

                <article className={`rounded-[26px] border p-5 ${selected.trackingNumber ? "border-blue-300/15 bg-blue-400/[0.045]" : "border-white/8 bg-white/[0.025]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.courier}</p>
                    {selected.trackingNumber ? <span className="rounded-full border border-blue-300/15 bg-blue-400/10 px-2 py-1 text-[8px] font-black text-blue-100">LIVE</span> : null}
                  </div>
                  <p className="mt-2 text-base font-black">{selected.carrierStatus || t.noCourier}</p>
                  <p className="mt-1 text-[10px] text-white/30">{formatDate(selected.lastUpdatedAt, language)}</p>
                </article>

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.items}</p>
                  <div className="mt-3 divide-y divide-white/[0.07]">
                    {selected.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div><p className="text-xs font-black text-white/75">{item.productName}</p><p className="mt-1 text-[10px] text-white/30">{item.variantLabel || item.colour || "Standard"} · {item.quantity}×</p></div>
                        <p className="text-xs font-black">{money(item.lineTotal, language)}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.journey}</p>
                  <div className="mt-5 space-y-0">
                    {selected.timeline.map((event, index) => {
                      const eventStatus = cleanStatus(event.status);
                      const translatedDescription = statusDescriptions[language][eventStatus];
                      return (
                        <div key={String(event.id)} className="grid grid-cols-[26px_1fr] gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`mt-1 h-5 w-5 rounded-full border ${index === selected.timeline.length - 1 ? "border-white bg-white" : "border-white/20 bg-white/[0.06]"}`} />
                            {index < selected.timeline.length - 1 ? <span className="min-h-12 w-px flex-1 bg-white/10" /> : null}
                          </div>
                          <div className="pb-5">
                            <p className="text-xs font-black text-white/75">{formatStatus(event.status || event.title, language)}</p>
                            <p className="mt-1 text-[10px] font-medium leading-5 text-white/30">{translatedDescription || event.details || ""}</p>
                            <p className="mt-1.5 text-[9px] text-white/20">{formatDate(event.createdAt, language)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
