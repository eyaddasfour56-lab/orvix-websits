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
    subtitle: "Enter only the phone number used at checkout. We’ll find every order linked to it.",
    phone: "Phone Number",
    placeholder: "01xxxxxxxxx",
    button: "Track Orders",
    checking: "Checking…",
    found: "Orders found",
    currentStatus: "Current Status",
    courier: "Courier Update",
    trackingNumber: "Tracking Number",
    estimated: "Estimated Arrival",
    placed: "Order Placed",
    total: "Total",
    items: "Items",
    timeline: "Order Timeline",
    choose: "Choose an order",
    chooseHint: "Tap any order below to view its tracking details.",
    noCourier: "Courier tracking has not started yet.",
    privacy: "Only order tracking details linked to this phone number are shown.",
    missing: "Please enter your phone number.",
    invalid: "Please enter a valid Egyptian mobile number.",
    notFound: "No orders were found for this phone number.",
    failed: "Could not check your orders right now.",
  },
  ar: {
    eyebrow: "تتبّع طلبات ORVIX",
    title: "تتبّع طلبك",
    subtitle: "اكتب فقط رقم الموبايل المستخدم في الطلب، وسنعرض كل الطلبات المرتبطة به.",
    phone: "رقم الموبايل",
    placeholder: "01xxxxxxxxx",
    button: "تتبّع الطلبات",
    checking: "جارٍ البحث…",
    found: "الطلبات الموجودة",
    currentStatus: "حالة الطلب",
    courier: "تحديث الشحن",
    trackingNumber: "رقم التتبع",
    estimated: "الوصول المتوقع",
    placed: "تاريخ الطلب",
    total: "الإجمالي",
    items: "المنتجات",
    timeline: "مراحل الطلب",
    choose: "اختر طلبًا",
    chooseHint: "اضغط على أي طلب لعرض تفاصيل التتبع الخاصة به.",
    noCourier: "تتبع شركة الشحن لم يبدأ بعد.",
    privacy: "يتم عرض تفاصيل التتبع المرتبطة بهذا الرقم فقط.",
    missing: "من فضلك أدخل رقم الموبايل.",
    invalid: "من فضلك أدخل رقم موبايل مصري صحيح.",
    notFound: "لم يتم العثور على طلبات مرتبطة بهذا الرقم.",
    failed: "تعذر التحقق من طلباتك الآن.",
  },
} as const;

const statusLabels: Record<Language, Record<string, string>> = {
  en: {
    new: "Pre-Order",
    confirmed: "Confirmed",
    shipped: "Shipped",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  },
  ar: {
    new: "طلب مسبق",
    confirmed: "تم التأكيد",
    shipped: "تم الشحن",
    out_for_delivery: "خرج للتوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  },
};

const progressStatuses = ["new", "confirmed", "shipped", "out_for_delivery", "delivered"];

function cleanStatus(value: string) {
  const status = String(value || "new").trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
  if (status === "pending") return "new";
  return status;
}

function formatStatus(value: string, language: Language) {
  const status = cleanStatus(value);
  return statusLabels[language][status] || status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function statusTone(statusValue: string) {
  const status = cleanStatus(statusValue);
  if (status === "delivered") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (status === "cancelled") return "border-red-400/20 bg-red-400/10 text-red-200";
  if (status === "out_for_delivery" || status === "shipped") return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  return "border-violet-400/20 bg-violet-400/10 text-violet-100";
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
  const currentProgressIndex = useMemo(() => {
    if (!selected || cleanStatus(selected.status) === "cancelled") return -1;
    return Math.max(0, progressStatuses.indexOf(cleanStatus(selected.status)));
  }, [selected]);

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
                    <div className="mt-6 grid grid-cols-5 gap-2">
                      {progressStatuses.map((status, index) => (
                        <div key={status} className="min-w-0">
                          <div className={`h-1.5 rounded-full ${index <= currentProgressIndex ? "bg-white" : "bg-white/10"}`} />
                          <p className={`mt-2 truncate text-[8px] font-black ${index <= currentProgressIndex ? "text-white/65" : "text-white/20"}`}>{formatStatus(status, language)}</p>
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

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.courier}</p>
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

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.timeline}</p>
                  <div className="mt-4 space-y-3">
                    {selected.timeline.slice().reverse().map((event) => (
                      <div key={String(event.id)} className="grid grid-cols-[10px_1fr] gap-3">
                        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-white/55" />
                        <div><p className="text-xs font-black text-white/70">{event.title}</p>{event.details ? <p className="mt-1 text-[10px] leading-5 text-white/30">{event.details}</p> : null}<p className="mt-1 text-[9px] text-white/20">{formatDate(event.createdAt, language)}</p></div>
                      </div>
                    ))}
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
