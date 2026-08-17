"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

type TrackedOrder = {
  orderNumber?: string;
  status?: string;
  trackingNumber?: string | null;
};

type TrackingSnapshot = {
  orderNumber: string;
  phone: string;
  order: TrackedOrder;
};

type ReasonId =
  | "mistake"
  | "changed_mind"
  | "wrong_details"
  | "duplicate"
  | "no_longer_needed"
  | "other";

const cancellationReasons: Array<{
  id: ReasonId;
  canonical: string;
  en: string;
  ar: string;
}> = [
  {
    id: "mistake",
    canonical: "Ordered by mistake",
    en: "Ordered by mistake",
    ar: "طلبت المنتج بالخطأ",
  },
  {
    id: "changed_mind",
    canonical: "Changed my mind",
    en: "Changed my mind",
    ar: "غيرت رأيي",
  },
  {
    id: "wrong_details",
    canonical: "Wrong order details",
    en: "Wrong order details",
    ar: "بيانات الطلب غير صحيحة",
  },
  {
    id: "duplicate",
    canonical: "Duplicate order",
    en: "Duplicate order",
    ar: "الطلب مكرر",
  },
  {
    id: "no_longer_needed",
    canonical: "No longer need the product",
    en: "No longer need the product",
    ar: "لم أعد بحاجة للمنتج",
  },
  {
    id: "other",
    canonical: "Other",
    en: "Other",
    ar: "سبب آخر",
  },
];

const copy = {
  en: {
    chooseReasonError: "Please choose a cancellation reason.",
    genericCancelError: "Could not cancel this order.",
    orderCancelled: "Order cancelled",
    cancelledSuccessfully: (orderNumber: string) =>
      `${orderNumber} has been cancelled successfully.`,
    changeMindEyebrow: "Need to change your mind?",
    cancelBeforeShipping: "Cancel before shipping starts",
    cancelOrder: "Cancel Order",
    needHelp: "Need help with this order?",
    cancellationUnavailable: "Online cancellation is no longer available.",
    customerService: "Customer Service",
    areYouSure: "Are you sure?",
    cancelDescription: (orderNumber: string) =>
      `Choose why you want to cancel ${orderNumber}. This action cannot be undone from the website.`,
    close: "Close",
    otherPlaceholder: "Tell us the reason…",
    keepOrder: "Keep Order",
    cancelling: "Cancelling…",
    confirmCancel: "Confirm Cancel",
    errors: {
      MISSING_DETAILS: "Please complete the cancellation details.",
      ORDER_NOT_FOUND: "No order was found with these details.",
      TOO_LATE_TO_CANCEL:
        "This order can no longer be cancelled online. Please contact Customer Service.",
      COURIER_CREATED:
        "This order has already entered the shipping process. Please contact Customer Service.",
      ORDER_CHANGED:
        "The order status changed before cancellation. Please refresh and try again or contact Customer Service.",
      CANCEL_FAILED: "Could not cancel this order right now.",
      LOOKUP_FAILED: "Could not check this order right now.",
      CONFIGURATION_ERROR: "Cancellation is temporarily unavailable.",
      UNKNOWN_ERROR: "Could not cancel this order right now.",
    } as Record<string, string>,
  },
  ar: {
    chooseReasonError: "من فضلك اختر سبب إلغاء الطلب.",
    genericCancelError: "تعذر إلغاء الطلب.",
    orderCancelled: "تم إلغاء الطلب",
    cancelledSuccessfully: (orderNumber: string) =>
      `تم إلغاء الطلب ${orderNumber} بنجاح.`,
    changeMindEyebrow: "غيرت رأيك؟",
    cancelBeforeShipping: "يمكنك إلغاء الطلب قبل بدء الشحن",
    cancelOrder: "إلغاء الطلب",
    needHelp: "تحتاج مساعدة بخصوص الطلب؟",
    cancellationUnavailable: "الإلغاء من الموقع لم يعد متاحًا لهذا الطلب.",
    customerService: "خدمة العملاء",
    areYouSure: "هل أنت متأكد؟",
    cancelDescription: (orderNumber: string) =>
      `اختر سبب إلغاء الطلب ${orderNumber}. بعد تأكيد الإلغاء لا يمكن التراجع عنه من الموقع.`,
    close: "إغلاق",
    otherPlaceholder: "اكتب سبب الإلغاء…",
    keepOrder: "الاحتفاظ بالطلب",
    cancelling: "جارٍ الإلغاء…",
    confirmCancel: "تأكيد الإلغاء",
    errors: {
      MISSING_DETAILS: "من فضلك أكمل بيانات إلغاء الطلب.",
      ORDER_NOT_FOUND: "لم يتم العثور على طلب بهذه البيانات.",
      TOO_LATE_TO_CANCEL:
        "لم يعد من الممكن إلغاء هذا الطلب من الموقع. تواصل مع خدمة العملاء.",
      COURIER_CREATED:
        "الطلب دخل بالفعل مرحلة الشحن. تواصل مع خدمة العملاء للمساعدة.",
      ORDER_CHANGED:
        "تغيرت حالة الطلب قبل تنفيذ الإلغاء. حدّث الصفحة وحاول مرة أخرى أو تواصل مع خدمة العملاء.",
      CANCEL_FAILED: "تعذر إلغاء الطلب الآن. حاول مرة أخرى.",
      LOOKUP_FAILED: "تعذر التحقق من الطلب الآن.",
      CONFIGURATION_ERROR: "خدمة إلغاء الطلب غير متاحة مؤقتًا.",
      UNKNOWN_ERROR: "تعذر إلغاء الطلب الآن. حاول مرة أخرى.",
    } as Record<string, string>,
  },
} as const;

function normalizeStatus(value: string | undefined) {
  const status = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  return status === "pending" ? "new" : status;
}

export default function CustomerOrderCancellation() {
  const pathname = usePathname();
  const { language, isArabic } = useLanguage();
  const t = copy[language];

  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [reasonId, setReasonId] = useState<ReasonId | "">("");
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (pathname !== "/track-order") {
      setSnapshot(null);
      setOpen(false);
      return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const isTracking =
        url.pathname === "/api/track-order" &&
        String(init?.method || "GET").toUpperCase() === "POST";

      let submitted: { orderNumber?: string; phone?: string } | null = null;
      if (isTracking && typeof init?.body === "string") {
        try {
          submitted = JSON.parse(init.body);
        } catch {}
      }

      const response = await originalFetch(input, init);

      if (isTracking && submitted) {
        try {
          const result = await response.clone().json();
          if (response.ok && result?.success && result?.order) {
            setSnapshot({
              orderNumber: String(
                submitted.orderNumber || result.order.orderNumber || ""
              ).trim(),
              phone: String(submitted.phone || "").trim(),
              order: result.order as TrackedOrder,
            });
            setCancelled(normalizeStatus(result.order.status) === "cancelled");
            setError("");
          } else {
            setSnapshot(null);
            setCancelled(false);
          }
        } catch {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pathname]);

  useEffect(() => {
    setError("");
  }, [language]);

  const canAttemptCancel = useMemo(() => {
    if (!snapshot || cancelled) return false;
    const status = normalizeStatus(snapshot.order.status);
    return (
      (status === "new" || status === "confirmed") &&
      !snapshot.order.trackingNumber
    );
  }, [snapshot, cancelled]);

  if (pathname !== "/track-order" || !snapshot) return null;

  async function cancelOrder() {
    if (!snapshot || submitting) return;

    const selectedReason = cancellationReasons.find(
      (item) => item.id === reasonId
    );
    const finalReason =
      reasonId === "other"
        ? otherReason.trim()
        : selectedReason?.canonical || "";

    if (!finalReason) {
      setError(t.chooseReasonError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: snapshot.orderNumber,
          phone: snapshot.phone,
          reason: finalReason,
        }),
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        const localized = result?.code ? t.errors[String(result.code)] : "";
        throw new Error(localized || result?.message || t.genericCancelError);
      }

      setCancelled(true);
      setOpen(false);
      setSnapshot((current) =>
        current
          ? { ...current, order: { ...current.order, status: "cancelled" } }
          : current
      );
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : t.genericCancelError
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="fixed bottom-4 left-1/2 z-[180] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl print:hidden"
      >
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">{t.orderCancelled}</p>
              <p className="mt-0.5 text-xs text-white/45">
                {t.cancelledSuccessfully(snapshot.orderNumber)}
              </p>
            </div>
          </div>
        ) : canAttemptCancel ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 px-1">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-white/45">
                {t.changeMindEyebrow}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-white">
                {t.cancelBeforeShipping}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setError("");
              }}
              className="shrink-0 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/15"
            >
              {t.cancelOrder}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 px-1">
              <p className="text-sm font-black text-white">{t.needHelp}</p>
              <p className="mt-1 text-xs text-white/40">
                {t.cancellationUnavailable}
              </p>
            </div>
            <Link
              href="/chat"
              className="shrink-0 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-200"
            >
              {t.customerService}
            </Link>
          </div>
        )}
      </div>

      {open && (
        <div
          dir={isArabic ? "rtl" : "ltr"}
          className="fixed inset-0 z-[260] grid place-items-end bg-black/75 p-3 backdrop-blur-sm sm:place-items-center sm:p-5 print:hidden"
        >
          <div className="w-full max-w-lg rounded-[26px] border border-white/10 bg-[#0b0b0b] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300/70">
                  {t.cancelOrder}
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {t.areYouSure}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  {t.cancelDescription(snapshot.orderNumber)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55"
                aria-label={t.close}
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {cancellationReasons.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setReasonId(item.id);
                    setError("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    isArabic ? "text-right" : "text-left"
                  } ${
                    reasonId === item.id
                      ? "border-red-400/35 bg-red-500/10 text-white"
                      : "border-white/10 bg-[#121212] text-white/60 hover:bg-[#171717]"
                  }`}
                >
                  {item[language]}
                </button>
              ))}
            </div>

            {reasonId === "other" && (
              <textarea
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder={t.otherPlaceholder}
                className={`mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#121212] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-400/35 ${
                  isArabic ? "text-right" : "text-left"
                }`}
              />
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-100">
                {error}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3.5 text-sm font-black text-white/70"
              >
                {t.keepOrder}
              </button>
              <button
                type="button"
                onClick={() => void cancelOrder()}
                disabled={
                  submitting ||
                  !reasonId ||
                  (reasonId === "other" && !otherReason.trim())
                }
                className="rounded-xl bg-red-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? t.cancelling : t.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
