"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  journeyStatus?: string;
  orderState?: "active" | "cancelled" | "delivered";
  courierStatus?: string | null;
  paymentStatus: string;
  createdAt: string;
  journeyUpdatedAt?: string;
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

type OtpRequestResult = {
  success?: boolean;
  message?: string;
  code?: string;
  challengeId?: string;
  verificationMethod?: "sms_otp" | "checkout_email";
  maskedPhone?: string | null;
};

const copy = {
  en: {
    eyebrow: "ORVIX ORDER TRACKING",
    title: "Track your order",
    subtitle: "Enter the checkout phone number, then confirm the saved checkout email to view the order securely.",
    phone: "Phone Number",
    placeholder: "01xxxxxxxxx",
    button: "Continue Securely",
    checking: "Checking…",
    codeLabel: "6-digit code",
    codePlaceholder: "000000",
    verify: "Verify & Track",
    verifying: "Verifying…",
    codeSent: "Enter the SMS code sent to",
    codeSentGeneric: "If the phone is linked to an order, a secure code was sent by SMS.",
    emailLabel: "Checkout email",
    emailPlaceholder: "name@gmail.com",
    emailHint: "Enter the exact email address used when the order was placed.",
    invalidEmail: "Enter a valid checkout email.",
    identityMismatch: "The phone and checkout email could not be verified.",
    useCheckoutEmail: "Use checkout email instead",
    resend: "Send a new SMS code",
    changePhone: "Use a different phone",
    verified: "Customer details verified. Secure tracking is active for 30 minutes.",
    found: "Orders found",
    choose: "Choose an order",
    chooseHint: "Tap an order to view its tracking summary.",
    journey: "Current Journey",
    orderState: "Order State",
    courier: "Live Courier Tracking",
    trackingNumber: "Tracking Number",
    estimated: "Estimated Arrival",
    placed: "Order Placed",
    total: "Total",
    items: "Items",
    fullJourney: "Order Journey",
    fullJourneyHint: "Open the complete order journey from pre-order and import to ORVIX handling and courier delivery.",
    openJourney: "View Full Journey",
    noCourier: "Courier tracking starts after ORVIX hands your package to Bosta.",
    privacy: "Orders appear only after the phone and checkout email or SMS code are verified.",
    cancelled: "This order is cancelled. Its last real journey stage is still shown and preserved.",
    missing: "Please enter your phone number.",
    invalid: "Please enter a valid Egyptian mobile number.",
    notFound: "No orders were found for this phone number.",
    failed: "Could not check your orders right now.",
  },
  ar: {
    eyebrow: "تتبّع طلبات ORVIX",
    title: "تتبّع طلبك",
    subtitle: "اكتب رقم الموبايل المستخدم في الطلب، ثم أكّد الإيميل المسجل وقت الشراء لعرض الطلب بأمان.",
    phone: "رقم الموبايل",
    placeholder: "01xxxxxxxxx",
    button: "متابعة آمنة",
    checking: "جارٍ التحقق…",
    codeLabel: "الكود المكوّن من 6 أرقام",
    codePlaceholder: "000000",
    verify: "تأكيد وعرض الطلبات",
    verifying: "جارٍ التأكيد…",
    codeSent: "اكتب كود الـSMS المرسل إلى",
    codeSentGeneric: "لو الرقم مرتبط بطلب، اتبعت له رسالة SMS بالكود الآمن.",
    emailLabel: "الإيميل المسجل في الطلب",
    emailPlaceholder: "name@gmail.com",
    emailHint: "اكتب نفس الإيميل المستخدم وقت عمل الأوردر بالضبط.",
    invalidEmail: "من فضلك أدخل إيميل الطلب بشكل صحيح.",
    identityMismatch: "لم نتمكن من مطابقة رقم الموبايل مع إيميل الطلب.",
    useCheckoutEmail: "استخدام إيميل الطلب بدلًا من SMS",
    resend: "إرسال كود SMS جديد",
    changePhone: "استخدام رقم مختلف",
    verified: "تم تأكيد بيانات العميل. التتبع الآمن متاح لمدة 30 دقيقة.",
    found: "الطلبات الموجودة",
    choose: "اختر طلبًا",
    chooseHint: "اضغط على أي طلب لعرض ملخص التتبع.",
    journey: "مرحلة الطلب الحالية",
    orderState: "حالة الطلب",
    courier: "تتبع شركة الشحن",
    trackingNumber: "رقم التتبع",
    estimated: "الوصول المتوقع",
    placed: "تاريخ الطلب",
    total: "الإجمالي",
    items: "المنتجات",
    fullJourney: "رحلة الطلب",
    fullJourneyHint: "افتح رحلة الطلب كاملة من الـPre-Order والاستيراد لحد ORVIX وشركة الشحن.",
    openJourney: "عرض الرحلة كاملة",
    noCourier: "تتبع شركة الشحن يبدأ بعد ما ORVIX تسلّم الشحنة لبوسطة.",
    privacy: "لن تظهر الطلبات إلا بعد مطابقة رقم الموبايل مع إيميل الطلب أو تأكيد كود SMS.",
    cancelled: "الطلب ملغي، لكن آخر مرحلة حقيقية وصل لها الطلب ما زالت محفوظة ومعروضة.",
    missing: "من فضلك أدخل رقم الموبايل.",
    invalid: "من فضلك أدخل رقم موبايل مصري صحيح.",
    notFound: "لم يتم العثور على طلبات مرتبطة بهذا الرقم.",
    failed: "تعذر التحقق من طلباتك الآن.",
  },
} as const;

const labels: Record<Language, Record<string, string>> = {
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
    cancelled: "ملغي",
  },
};

const journeySteps = [
  "new",
  "international_transit",
  "arrived_egypt",
  "in_customs",
  "customs_cleared",
  "received_at_orvix",
  "ready_for_courier",
];

function clean(value: string | null | undefined) {
  return String(value || "new").trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function formatStatus(value: string | null | undefined, language: Language) {
  const status = clean(value);
  return labels[language][status] || status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function journeyIndex(value: string | null | undefined) {
  return Math.max(0, journeySteps.indexOf(clean(value)));
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
  return `${Number(value || 0).toLocaleString(language === "ar" ? "ar-EG" : "en-GB")} ${language === "ar" ? "ج.م" : "EGP"}`;
}

function journeyTone(value: string | null | undefined) {
  const status = clean(value);
  if (["arrived_egypt", "in_customs", "customs_cleared"].includes(status)) return "border-amber-400/20 bg-amber-400/10 text-amber-100";
  if (["received_at_orvix", "ready_for_courier"].includes(status)) return "border-violet-400/20 bg-violet-400/10 text-violet-100";
  if (status === "international_transit") return "border-sky-400/20 bg-sky-400/10 text-sky-100";
  return "border-white/10 bg-white/[0.05] text-white/75";
}

export default function TrackOrderPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const rtl = language === "ar";
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [step, setStep] = useState<"phone" | "email" | "otp" | "results">("phone");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = orders[selectedIndex] || null;
  const activeJourney = useMemo(() => journeyIndex(selected?.journeyStatus || selected?.status), [selected]);

  async function loadVerifiedOrders() {
    const response = await fetch("/api/track-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    const result = (await response.json()) as TrackingResult;
    if (!response.ok || !result.success) {
      throw new Error(result.message || t.failed);
    }
    const nextOrders = Array.isArray(result.orders) ? result.orders : [];
    setOrders(nextOrders);
    setSelectedIndex(0);
    setStep("results");
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/track-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    })
      .then(async (response) => ({ response, result: (await response.json()) as TrackingResult }))
      .then(({ response, result }) => {
        if (!active || !response.ok || !result.success || !Array.isArray(result.orders)) return;
        setOrders(result.orders);
        setStep("results");
      })
      .catch(() => {
        // A missing or expired secure session simply starts the normal OTP flow.
      });
    return () => { active = false; };
  }, []);

  async function requestCode(method?: "checkout_email") {
    setLoading(true);
    setError("");
    setOrders([]);
    setSelectedIndex(0);
    try {
      const response = await fetch("/api/track-order/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, method }),
      });
      const result = (await response.json()) as OtpRequestResult;
      if (!response.ok || !result.success) {
        if (result.code === "MISSING_PHONE") throw new Error(t.missing);
        if (result.code === "INVALID_PHONE") throw new Error(t.invalid);
        throw new Error(result.message || t.failed);
      }
      setChallengeId(String(result.challengeId || ""));
      setMaskedPhone(String(result.maskedPhone || ""));
      setEmail("");
      setOtp("");
      setStep(result.verificationMethod === "sms_otp" ? "otp" : "email");
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function verifyIdentity() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track-order/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, email }),
      });
      const result = (await response.json()) as OtpRequestResult;
      if (!response.ok || !result.success) {
        if (result.code === "INVALID_EMAIL") throw new Error(t.invalidEmail);
        if (result.code === "IDENTITY_MISMATCH") throw new Error(t.identityMismatch);
        throw new Error(result.message || t.failed);
      }
      await loadVerifiedOrders();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/track-order/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp }),
      });
      const result = (await response.json()) as OtpRequestResult;
      if (!response.ok || !result.success) throw new Error(result.message || t.failed);
      await loadVerifiedOrders();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : t.failed);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (step === "otp") await verifyCode();
    else if (step === "email") await verifyIdentity();
    else await requestCode();
  }

  function resetTracking() {
    setStep("phone");
    setPhone("");
    setEmail("");
    setOtp("");
    setChallengeId("");
    setMaskedPhone("");
    setOrders([]);
    setError("");
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

        {step === "results" ? (
          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-[26px] border border-emerald-300/15 bg-emerald-400/[0.045] p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-xs font-bold leading-6 text-emerald-100/75">✓ {t.verified}</p>
            <button type="button" onClick={resetTracking} className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-[10px] font-black text-white/55">{t.changePhone}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-8 max-w-xl rounded-[26px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl sm:p-5">
            {step === "phone" ? (
              <>
                <label className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{t.phone}</label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t.placeholder} className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-base font-bold outline-none placeholder:text-white/20 focus:border-white/25" />
                  <button disabled={loading || !phone.trim()} className="h-12 rounded-2xl bg-white px-6 text-sm font-black text-black disabled:opacity-40">{loading ? t.checking : t.button}</button>
                </div>
              </>
            ) : step === "email" ? (
              <>
                <p className="text-xs font-semibold leading-6 text-white/48">{t.emailHint}</p>
                <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{t.emailLabel}</label>
                <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.emailPlaceholder} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base font-bold outline-none placeholder:text-white/20 focus:border-white/25" />
                <button disabled={loading || !email.trim()} className="mt-3 h-12 w-full rounded-2xl bg-white px-6 text-sm font-black text-black disabled:opacity-40">{loading ? t.verifying : t.verify}</button>
                <div className="mt-3 flex justify-end">
                  <button type="button" disabled={loading} onClick={resetTracking} className="text-[10px] font-black text-white/35 hover:text-white/65 disabled:opacity-40">{t.changePhone}</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold leading-6 text-white/48">{maskedPhone ? `${t.codeSent} ${maskedPhone}` : t.codeSentGeneric}</p>
                <label className="mt-4 block text-[10px] font-black uppercase tracking-[0.14em] text-white/35">{t.codeLabel}</label>
                <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t.codePlaceholder} className="mt-2 h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-center text-2xl font-black tracking-[0.45em] outline-none placeholder:text-white/12 focus:border-white/25" />
                <button disabled={loading || otp.length !== 6} className="mt-3 h-12 w-full rounded-2xl bg-white px-6 text-sm font-black text-black disabled:opacity-40">{loading ? t.verifying : t.verify}</button>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" disabled={loading} onClick={() => void requestCode()} className="text-[10px] font-black text-white/35 hover:text-white/65 disabled:opacity-40">{t.resend}</button>
                  <button type="button" disabled={loading} onClick={() => void requestCode("checkout_email")} className="text-[10px] font-black text-white/35 hover:text-white/65 disabled:opacity-40">{t.useCheckoutEmail}</button>
                  <button type="button" disabled={loading} onClick={resetTracking} className="text-[10px] font-black text-white/35 hover:text-white/65 disabled:opacity-40">{t.changePhone}</button>
                </div>
              </>
            )}
            <p className="mt-3 text-[10px] font-medium text-white/25">{t.privacy}</p>
            {error ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3 text-xs font-bold text-red-100">{error}</p> : null}
          </form>
        )}

        {orders.length ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-[24px] border border-white/8 bg-white/[0.025] p-3 lg:sticky lg:top-24">
              <div className="px-2 pb-3 pt-1"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/25">{t.found}</p><p className="mt-1 text-sm font-black">{t.choose}</p><p className="mt-1 text-[10px] text-white/30">{t.chooseHint}</p></div>
              <div className="space-y-2">{orders.map((order, index) => (
                <button key={order.orderNumber} type="button" onClick={() => setSelectedIndex(index)} className={`w-full rounded-2xl border p-3 text-left transition ${index === selectedIndex ? "border-white/20 bg-white/[0.08]" : "border-white/[0.06] bg-black/10 hover:bg-white/[0.04]"}`}>
                  <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-black">{order.orderNumber}</p><span className={`rounded-full border px-2 py-1 text-[8px] font-black ${journeyTone(order.journeyStatus || order.status)}`}>{formatStatus(order.journeyStatus || order.status, language)}</span></div>
                  {order.orderState === "cancelled" ? <p className="mt-2 text-[9px] font-black text-red-200">ORDER CANCELLED</p> : null}
                  <p className="mt-2 text-[10px] text-white/30">{formatDate(order.createdAt, language)}</p><p className="mt-1 text-[10px] font-black text-white/55">{money(order.totalPrice, language)}</p>
                </button>
              ))}</div>
            </aside>

            {selected ? (
              <section className="space-y-4">
                <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/25">{selected.orderNumber}</p><h2 className="mt-2 text-2xl font-black">{t.journey}</h2></div><span className={`rounded-full border px-3 py-2 text-[10px] font-black ${journeyTone(selected.journeyStatus || selected.status)}`}>{formatStatus(selected.journeyStatus || selected.status, language)}</span></div>
                  {selected.orderState === "cancelled" ? <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-400/[0.06] p-4"><p className="text-[9px] font-black uppercase tracking-[0.13em] text-red-100/55">{t.orderState}</p><p className="mt-1 text-base font-black text-red-100">{formatStatus("cancelled", language)}</p><p className="mt-1 text-[10px] leading-5 text-red-100/55">{t.cancelled}</p></div> : null}
                  <div className="mt-6 grid grid-cols-7 gap-1.5">{journeySteps.map((status, index) => <div key={status} className="min-w-0"><div className={`h-1.5 rounded-full ${index <= activeJourney ? "bg-white" : "bg-white/10"}`} /><p className={`mt-2 truncate text-[7px] font-black ${index <= activeJourney ? "text-white/50" : "text-white/15"}`}>{index + 1}</p></div>)}</div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.placed}</p><p className="mt-1 text-xs font-black">{formatDate(selected.createdAt, language)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.total}</p><p className="mt-1 text-xs font-black">{money(selected.totalPrice, language)}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.estimated}</p><p className="mt-1 text-xs font-black">{selected.estimatedDeliveryFrom || "—"}{selected.estimatedDeliveryTo ? ` → ${selected.estimatedDeliveryTo}` : ""}</p></div><div className="rounded-2xl bg-black/20 p-3"><p className="text-[9px] font-black uppercase text-white/25">{t.trackingNumber}</p><p className="mt-1 truncate text-xs font-black">{selected.trackingNumber || "—"}</p></div></div>
                </article>

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.courier}</p><p className="mt-2 text-base font-black">{selected.carrierStatus || t.noCourier}</p><p className="mt-1 text-[10px] text-white/30">{formatDate(selected.lastUpdatedAt, language)}</p></article>

                <article className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">{t.items}</p><div className="mt-3 divide-y divide-white/[0.07]">{selected.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-xs font-black text-white/75">{item.productName}</p><p className="mt-1 text-[10px] text-white/30">{item.variantLabel || item.colour || "Standard"} · {item.quantity}×</p></div><p className="text-xs font-black">{money(item.lineTotal, language)}</p></div>)}</div></article>

                <Link href={`/track-order/${encodeURIComponent(selected.orderNumber)}`} className="block rounded-[26px] border border-violet-300/15 bg-violet-400/[0.05] p-5 transition hover:bg-violet-400/[0.08]"><div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-100/40">{t.fullJourney}</p><p className="mt-2 text-base font-black">{t.fullJourneyHint}</p></div><span className="shrink-0 rounded-xl bg-white px-3 py-2 text-[10px] font-black text-black">{t.openJourney} →</span></div></Link>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
