"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Navbar from "@/components/Navbar";
import {
  Language,
  useLanguage,
} from "@/components/LanguageProvider";

type TrackedOrder = {
  orderNumber: string;
  governorate: string;
  productName?: string;
  colour: string;
  quantity: number;
  productsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  shippingStatus?: string | null;
  trackingNumber?: string | null;
  carrierStatus?: string | null;
  lastUpdatedAt: string;
};

type TrackingResult = {
  success: boolean;
  code?: string;
  message?: string;
  order?: TrackedOrder;
};

const ORVIX_SUPPORT_URL =
  "https://www.instagram.com/orvix_tech/";

const copyByLanguage = {
  en: {
    languageLabel: "Choose language",
    loadingTracking: "Loading tracking details...",
    eyebrow: "ORVIX Order Tracking",
    title: "Track Your Order",
    subtitle:
      "Enter the order number and phone number used during checkout to view the latest status of your order.",
    orderNumber: "Order Number",
    phoneNumber: "Phone Number",
    checkingOrder: "Checking Order...",
    trackYourOrder: "Track Your Order",
    privacyNote:
      "For your privacy, your phone number and full address are never displayed on this page.",
    latestUpdate: "Latest update",
    cairoTime: "Cairo time",
    orderCancelled: "Order Cancelled",
    orderCancelledDescription:
      "This order has been cancelled. Contact ORVIX support if you believe this was a mistake.",
    orderProgress: "Order Progress",
    currentStatus: "Current Status",
    completed: "Completed",
    shippingUpdate: "Shipping update",
    cancelledShipmentHeadline:
      "This order is cancelled",
    cancelledShipmentDescription:
      "Contact ORVIX support if you need help with this order.",
    shippingIssueDescription:
      "This shipment needs attention. Contact ORVIX support and mention your order number.",
    shipmentInProgress:
      "Shipment in progress with Bosta",
    trackingDescription:
      "Follow the latest carrier movement using the official Bosta tracking page.",
    preparingShipment: "Preparing your shipment",
    preparingDescription:
      "Your Bosta tracking number will appear here as soon as the shipment is created.",
    trackOnBosta: "Track Live on Bosta",
    contactSupport: "Contact ORVIX Support",
    bostaTrackingNumber:
      "Bosta tracking number",
    notAssigned: "Not assigned yet",
    latestAvailableUpdate:
      "Latest available update",
    howWasExperience: "How was your experience?",
    reviewDescription:
      "Your order has been delivered. Share your experience and help other customers shop with confidence.",
    leaveReview: "Leave a Review",
    orderDetails: "Order Details",
    product: "Product",
    deliveryArea: "Delivery Area",
    instapayOnDelivery: "InstaPay on Delivery",
    productsTotal: "Products Total",
    delivery: "Delivery",
    free: "FREE",
    discount: "Discount",
    total: "Total",
    orderPlacedOn: "Order placed on",
    trackAnother: "Track Another Order",
    rightsReserved: "All rights reserved.",
    invalidDate: "Update time unavailable",
    missingDetails:
      "Please enter your order number and phone number.",
    invalidDetails:
      "Please check your order number and phone number.",
    lookupFailed:
      "Could not check your order right now.",
    orderNotFound:
      "No order was found with these details.",
  },
  ar: {
    languageLabel: "اختر اللغة",
    loadingTracking: "جارٍ تحميل بيانات التتبع...",
    eyebrow: "تتبّع طلبات ORVIX",
    title: "تتبّع طلبك",
    subtitle:
      "أدخل رقم الطلب ورقم الهاتف المستخدم أثناء الشراء لعرض أحدث حالة لطلبك.",
    orderNumber: "رقم الطلب",
    phoneNumber: "رقم الهاتف",
    checkingOrder: "جارٍ التحقق من الطلب...",
    trackYourOrder: "تتبّع طلبك",
    privacyNote:
      "حرصًا على خصوصيتك، لن نعرض رقم هاتفك أو عنوانك بالكامل في هذه الصفحة.",
    latestUpdate: "آخر تحديث",
    cairoTime: "بتوقيت القاهرة",
    orderCancelled: "تم إلغاء الطلب",
    orderCancelledDescription:
      "تم إلغاء هذا الطلب. تواصل مع دعم ORVIX إذا كنت تعتقد أن ذلك حدث بالخطأ.",
    orderProgress: "مراحل الطلب",
    currentStatus: "الحالة الحالية",
    completed: "مكتمل",
    shippingUpdate: "تحديث الشحن",
    cancelledShipmentHeadline:
      "هذا الطلب ملغي",
    cancelledShipmentDescription:
      "تواصل مع دعم ORVIX إذا كنت تحتاج إلى مساعدة بخصوص هذا الطلب.",
    shippingIssueDescription:
      "تحتاج هذه الشحنة إلى متابعة. تواصل مع دعم ORVIX واذكر رقم طلبك.",
    shipmentInProgress:
      "الشحنة قيد التوصيل مع بوسطة",
    trackingDescription:
      "تابع آخر تحركات الشحنة من خلال صفحة التتبع الرسمية لدى بوسطة.",
    preparingShipment: "جارٍ تجهيز شحنتك",
    preparingDescription:
      "سيظهر رقم تتبع بوسطة هنا فور إنشاء الشحنة.",
    trackOnBosta: "تتبّع الشحنة على بوسطة",
    contactSupport: "تواصل مع دعم ORVIX",
    bostaTrackingNumber: "رقم تتبع بوسطة",
    notAssigned: "لم يتم تعيينه بعد",
    latestAvailableUpdate: "آخر تحديث متاح",
    howWasExperience: "كيف كانت تجربتك؟",
    reviewDescription:
      "تم توصيل طلبك. شاركنا تجربتك وساعد العملاء الآخرين على التسوق بثقة.",
    leaveReview: "أضف تقييمك",
    orderDetails: "تفاصيل الطلب",
    product: "المنتج",
    deliveryArea: "منطقة التوصيل",
    instapayOnDelivery:
      "الدفع عبر InstaPay عند الاستلام",
    productsTotal: "إجمالي المنتجات",
    delivery: "التوصيل",
    free: "مجاني",
    discount: "الخصم",
    total: "الإجمالي",
    orderPlacedOn: "تم إنشاء الطلب في",
    trackAnother: "تتبّع طلبًا آخر",
    rightsReserved: "جميع الحقوق محفوظة.",
    invalidDate: "وقت التحديث غير متاح",
    missingDetails:
      "من فضلك أدخل رقم الطلب ورقم الهاتف.",
    invalidDetails:
      "من فضلك راجع رقم الطلب ورقم الهاتف.",
    lookupFailed:
      "تعذر التحقق من طلبك الآن. حاول مرة أخرى لاحقًا.",
    orderNotFound:
      "لم يتم العثور على طلب بهذه البيانات.",
  },
} as const;

const orderSteps = [
  {
    status: "new",
    title: {
      en: "Order Placed",
      ar: "تم استلام الطلب",
    },
    description: {
      en: "Your order has been received successfully by ORVIX.",
      ar: "تم استلام طلبك بنجاح لدى ORVIX.",
    },
  },
  {
    status: "confirmed",
    title: {
      en: "Order Confirmed",
      ar: "تم تأكيد الطلب",
    },
    description: {
      en: "Your order details have been reviewed and confirmed.",
      ar: "تمت مراجعة بيانات طلبك وتأكيده.",
    },
  },
  {
    status: "shipped",
    title: {
      en: "Shipped",
      ar: "تم الشحن",
    },
    description: {
      en: "Your order has left our facility and is on its way.",
      ar: "غادر طلبك مركز التجهيز وهو في طريقه إليك.",
    },
  },
  {
    status: "out_for_delivery",
    title: {
      en: "Out for Delivery",
      ar: "خرج للتوصيل",
    },
    description: {
      en: "The courier is delivering your order to your address.",
      ar: "مندوب الشحن في طريقه لتوصيل الطلب إلى عنوانك.",
    },
  },
  {
    status: "delivered",
    title: {
      en: "Delivered",
      ar: "تم التوصيل",
    },
    description: {
      en: "Your order has been delivered successfully.",
      ar: "تم توصيل طلبك بنجاح.",
    },
  },
] as const;

const statusLabels: Record<
  Language,
  Record<string, string>
> = {
  en: {
    new: "New",
    confirmed: "Confirmed",
    shipped: "Shipped",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  },
  ar: {
    new: "جديد",
    confirmed: "تم التأكيد",
    shipped: "تم الشحن",
    out_for_delivery: "خرج للتوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  },
};

const arabicBostaStatuses: Record<
  string,
  string
> = {
  "pickup requested": "تم طلب الاستلام",
  "waiting for route": "في انتظار تحديد خط السير",
  "route assigned": "تم تحديد خط السير",
  "picked up from business": "تم الاستلام من ORVIX",
  "picking up from consignee": "جارٍ الاستلام من العميل",
  "picked up from consignee": "تم الاستلام من العميل",
  "received at warehouse": "تم الاستلام في المخزن",
  fulfilled: "تم تجهيز الشحنة",
  "in transit between hubs": "قيد النقل بين مراكز الشحن",
  "picking up": "جارٍ الاستلام",
  "out for delivery": "خرجت للتوصيل",
  delivered: "تم التوصيل",
  "returned to business": "تمت الإعادة إلى ORVIX",
  exception: "توجد مشكلة في الشحنة",
  terminated: "تم إنهاء الشحنة",
  canceled: "تم إلغاء الشحنة",
  "returned to stock": "تمت الإعادة إلى المخزون",
  lost: "الشحنة مفقودة",
  damaged: "الشحنة تالفة",
  investigation: "الشحنة قيد المراجعة",
  "awaiting your action": "في انتظار إجراء مطلوب",
  archived: "تمت الأرشفة",
  "on hold": "الشحنة معلقة مؤقتًا",
};

function normaliseStatus(status: string) {
  const cleanStatus = status
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  if (cleanStatus === "pending") {
    return "new";
  }

  if (
    cleanStatus === "outfordelivery" ||
    cleanStatus === "out_for_delivery"
  ) {
    return "out_for_delivery";
  }

  return cleanStatus;
}

function getStatusIndex(status: string) {
  const normalisedStatus =
    normaliseStatus(status);

  const index = orderSteps.findIndex(
    (step) =>
      step.status === normalisedStatus
  );

  return index >= 0 ? index : 0;
}

function formatStatus(
  status: string,
  language: Language
) {
  const normalisedStatus =
    normaliseStatus(status);

  return (
    statusLabels[language][
      normalisedStatus
    ] ||
    normalisedStatus
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function formatMoney(
  value: number,
  language: Language
) {
  const locale =
    language === "ar" ? "ar-EG" : "en-GB";

  const currencyLabel =
    language === "ar" ? "ج.م" : "EGP";

  return `${Number(value || 0).toLocaleString(
    locale
  )} ${currencyLabel}`;
}

function formatTrackingDate(
  value: string,
  language: Language
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return copyByLanguage[language].invalidDate;
  }

  return new Intl.DateTimeFormat(
    language === "ar" ? "ar-EG" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }
  ).format(date);
}

function formatCarrierStatus(
  status: string,
  language: Language
) {
  if (language === "en") {
    return status;
  }

  const normalizedStatus = status
    .trim()
    .toLowerCase();

  if (
    arabicBostaStatuses[normalizedStatus]
  ) {
    return arabicBostaStatuses[
      normalizedStatus
    ];
  }

  const stateNumber = status.match(
    /^Bosta state (\d+)$/i
  );

  return stateNumber
    ? `حالة بوسطة ${stateNumber[1]}`
    : status;
}

function getTrackingErrorMessage(
  result: TrackingResult,
  language: Language
) {
  const copy = copyByLanguage[language];

  const messages: Record<string, string> = {
    CONFIGURATION_ERROR: copy.lookupFailed,
    MISSING_DETAILS: copy.missingDetails,
    INVALID_DETAILS: copy.invalidDetails,
    LOOKUP_FAILED: copy.lookupFailed,
    ORDER_NOT_FOUND: copy.orderNotFound,
    UNKNOWN_ERROR: copy.lookupFailed,
  };

  return (
    (result.code && messages[result.code]) ||
    (language === "en" && result.message) ||
    copy.lookupFailed
  );
}

function getBostaTrackingLink(
  trackingNumber: string
) {
  return `https://bosta.co/ar-eg/tracking-shipments?shipment-number=${encodeURIComponent(
    trackingNumber
  )}`;
}

export default function TrackOrderPage() {
  const { language, isArabic } =
    useLanguage();

  const [orderNumber, setOrderNumber] =
    useState("");

  const [phone, setPhone] = useState("");

  const [order, setOrder] =
    useState<TrackedOrder | null>(null);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [detailsLoaded, setDetailsLoaded] =
    useState(false);

  const copy = copyByLanguage[language];
  useEffect(() => {
    const animationFrame =
      window.requestAnimationFrame(() => {
        const searchParams =
          new URLSearchParams(
            window.location.search
          );

        const orderNumberFromUrl =
          searchParams.get(
            "orderNumber"
          ) || "";

        const savedPhone =
          sessionStorage.getItem(
            "orvixLastOrderPhone"
          ) || "";

        if (orderNumberFromUrl) {
          setOrderNumber(
            orderNumberFromUrl
              .trim()
              .toUpperCase()
          );
        }

        if (savedPhone) {
          setPhone(savedPhone);
        }

        setDetailsLoaded(true);
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, []);

  async function trackOrder(
    submittedOrderNumber: string,
    submittedPhone: string
  ) {
    setLoading(true);
    setMessage("");
    setOrder(null);

    try {
      const response = await fetch(
        "/api/track-order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderNumber:
              submittedOrderNumber
                .trim()
                .toUpperCase(),

            phone: submittedPhone.trim(),
          }),
        }
      );

      const result =
        (await response.json()) as TrackingResult;

      if (
        !response.ok ||
        !result.success ||
        !result.order
      ) {
        throw new Error(
          getTrackingErrorMessage(
            result,
            language
          )
        );
      }

      setOrder(result.order);

      sessionStorage.setItem(
        "orvixLastOrderPhone",
        submittedPhone.trim()
      );

      window.history.replaceState(
        {},
        "",
        `/track-order?orderNumber=${encodeURIComponent(
          submittedOrderNumber
            .trim()
            .toUpperCase()
        )}`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : copy.lookupFailed
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !orderNumber.trim() ||
      !phone.trim()
    ) {
      setMessage(
        copy.missingDetails
      );

      return;
    }

    await trackOrder(orderNumber, phone);
  }

  function resetTracking() {
    setOrder(null);
    setMessage("");
    setOrderNumber("");
    setPhone("");

    sessionStorage.removeItem(
      "orvixLastOrderPhone"
    );

    window.history.replaceState(
      {},
      "",
      "/track-order"
    );
  }

  const normalisedOrderStatus = order
    ? normaliseStatus(order.status)
    : "new";

  const activeStatusIndex = order
    ? getStatusIndex(order.status)
    : 0;

  const isCancelled =
    normalisedOrderStatus === "cancelled";

  const isDelivered =
    normalisedOrderStatus === "delivered";

  const normalisedShippingStatus = order
    ? normaliseStatus(
        order.shippingStatus || ""
      )
    : "";

  const hasShippingIssue = [
    "returned",
    "cancelled",
    "exception",
    "shipping_issue",
  ].includes(normalisedShippingStatus);

  const trackingNumber =
    order?.trackingNumber?.trim() || "";

  const shippingHeadline = isCancelled
    ? copy.cancelledShipmentHeadline
    : trackingNumber
      ? order?.carrierStatus
        ? formatCarrierStatus(
            order.carrierStatus,
            language
          )
        : copy.shipmentInProgress
      : copy.preparingShipment;

  const shippingDescription = isCancelled
    ? copy.cancelledShipmentDescription
    : hasShippingIssue
      ? copy.shippingIssueDescription
      : trackingNumber
        ? copy.trackingDescription
        : copy.preparingDescription;

  const reviewLink = order
    ? `/leave-review?orderNumber=${encodeURIComponent(
        order.orderNumber
      )}`
    : "/leave-review";

  if (!detailsLoaded) {
    return (
      <main
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-[#070707] text-white"
      >
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-5 text-gray-400">
              {copy.loadingTracking}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              {copy.eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              {copy.title}
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              {copy.subtitle}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  {copy.orderNumber}
                </span>

                <input
                  type="text"
                  dir="ltr"
                  value={orderNumber}
                  onChange={(event) => {
                    setOrderNumber(
                      event.target.value.toUpperCase()
                    );

                    setMessage("");
                    setOrder(null);
                  }}
                  placeholder="ORVIX-..."
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 uppercase text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  {copy.phoneNumber}
                </span>

                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);

                    setMessage("");
                    setOrder(null);
                  }}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>
            </div>

            {message && (
              <p
                role="alert"
                className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !orderNumber.trim() ||
                !phone.trim()
              }
              className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? copy.checkingOrder
                : copy.trackYourOrder}
            </button>
          </form>

          {order && (
            <section className="mt-8 overflow-hidden rounded-[36px] border border-white/10 bg-white/5">
              <div className="p-5 sm:p-8">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                      {copy.orderNumber}
                    </p>

                    <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
                      {order.orderNumber}
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                      {copy.privacyNote}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                    <div
                      className={`w-fit rounded-full border px-5 py-3 text-sm font-black ${
                        isCancelled
                          ? "border-red-500/20 bg-red-500/10 text-red-300"
                          : isDelivered
                            ? "border-green-500/20 bg-green-500/10 text-green-300"
                            : "border-white bg-white text-black"
                      }`}
                    >
                      {formatStatus(
                        order.status,
                        language
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      {copy.latestUpdate} ·{" "}
                      {formatTrackingDate(
                        order.lastUpdatedAt,
                        language
                      )}{" "}
                      {copy.cairoTime}
                    </p>
                  </div>
                </div>

                {isCancelled ? (
                  <div className="mt-8 rounded-[28px] border border-red-500/20 bg-red-500/10 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-400 font-black text-black">
                        ×
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-red-200">
                          {copy.orderCancelled}
                        </h3>

                        <p className="mt-2 leading-7 text-red-200/70">
                          {
                            copy.orderCancelledDescription
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-9">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                      {copy.orderProgress}
                    </p>

                    <div className="mt-8">
                      {orderSteps.map(
                        (step, index) => {
                          const completed =
                            index <
                            activeStatusIndex;

                          const current =
                            index ===
                            activeStatusIndex;

                          const reached =
                            index <=
                            activeStatusIndex;

                          const isLast =
                            index ===
                            orderSteps.length - 1;

                          return (
                            <div
                              key={step.status}
                              className="relative flex gap-5"
                            >
                              {!isLast && (
                                <div
                                  className={`absolute top-12 h-[calc(100%-4px)] w-px ${
                                    isArabic
                                      ? "right-[23px]"
                                      : "left-[23px]"
                                  } ${
                                    index <
                                    activeStatusIndex
                                      ? "bg-white"
                                      : "bg-white/10"
                                  }`}
                                />
                              )}

                              <div
                                className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-black transition ${
                                  completed
                                    ? "border-white bg-white text-black"
                                    : current
                                      ? "border-white bg-black text-white shadow-[0_0_0_6px_rgba(255,255,255,0.08)]"
                                      : "border-white/15 bg-[#070707] text-gray-600"
                                }`}
                              >
                                {completed
                                  ? "✓"
                                  : index + 1}
                              </div>

                              <div
                                className={`min-w-0 flex-1 ${
                                  isLast
                                    ? "pb-0"
                                    : "pb-9"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3
                                    className={`text-lg font-black ${
                                      reached
                                        ? "text-white"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {
                                      step.title[
                                        language
                                      ]
                                    }
                                  </h3>

                                  {current && (
                                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                                      {
                                        copy.currentStatus
                                      }
                                    </span>
                                  )}

                                  {completed && (
                                    <span className="text-xs font-bold text-gray-500">
                                      {copy.completed}
                                    </span>
                                  )}
                                </div>

                                <p
                                  className={`mt-2 text-sm leading-6 ${
                                    reached
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {
                                    step.description[
                                      language
                                    ]
                                  }
                                </p>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-9 rounded-[28px] border p-5 sm:p-6 ${
                    isCancelled ||
                    hasShippingIssue
                      ? "border-red-500/20 bg-red-500/10"
                      : trackingNumber
                        ? "border-blue-500/20 bg-blue-500/10"
                        : "border-white/10 bg-black/40"
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <p
                        className={`text-xs font-black uppercase tracking-[0.28em] ${
                          isCancelled ||
                          hasShippingIssue
                            ? "text-red-300/70"
                            : trackingNumber
                              ? "text-blue-300/70"
                              : "text-gray-500"
                        }`}
                      >
                        {copy.shippingUpdate}
                      </p>

                      <h3 className="mt-3 text-xl font-black sm:text-2xl">
                        {shippingHeadline}
                      </h3>

                      <p className="mt-3 leading-7 text-gray-300/80">
                        {shippingDescription}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                      {trackingNumber && (
                        <a
                          href={getBostaTrackingLink(
                            trackingNumber
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center rounded-full bg-white px-6 py-3 text-center text-sm font-black text-black transition hover:bg-gray-200"
                        >
                          {copy.trackOnBosta} ↗
                        </a>
                      )}

                      <a
                        href={ORVIX_SUPPORT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                      >
                        {copy.contactSupport}
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        {
                          copy.bostaTrackingNumber
                        }
                      </p>

                      <p
                        dir="ltr"
                        className={`mt-2 break-all font-black ${
                          isArabic
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {trackingNumber ||
                          copy.notAssigned}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        {
                          copy.latestAvailableUpdate
                        }
                      </p>

                      <p className="mt-2 font-black">
                        {formatTrackingDate(
                          order.lastUpdatedAt,
                          language
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {copy.cairoTime}
                      </p>
                    </div>
                  </div>
                </div>

                {isDelivered && (
                  <div className="mt-9 rounded-[28px] border border-yellow-400/20 bg-yellow-400/10 p-6 text-center">
                    <div className="text-4xl">
                      ★★★★★
                    </div>

                    <h3 className="mt-4 text-2xl font-black">
                      {copy.howWasExperience}
                    </h3>

                    <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-300">
                      {copy.reviewDescription}
                    </p>

                    <Link
                      href={reviewLink}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-4 font-black text-black transition hover:bg-gray-200 sm:w-auto"
                    >
                      {copy.leaveReview}
                    </Link>
                  </div>
                )}

                <div className="mt-9 border-t border-white/10 pt-8">
                  <h3 className="text-xl font-black">
                    {copy.orderDetails}
                  </h3>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <p className="text-sm text-gray-500">
                        {copy.product}
                      </p>

                      <p className="mt-2 font-black">
                        {order.productName ||
                          "Google Fitbit Air"}
                      </p>

                      <p className="mt-2 text-sm text-gray-400">
                        {order.colour} ×{" "}
                        {order.quantity}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <p className="text-sm text-gray-500">
                        {copy.deliveryArea}
                      </p>

                      <p className="mt-2 font-black">
                        {order.governorate}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        {copy.instapayOnDelivery}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6">
                  <div className="flex justify-between gap-5 text-gray-400">
                    <span>{copy.productsTotal}</span>

                    <span>
                      {formatMoney(
                        order.productsTotal,
                        language
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between gap-5 text-gray-400">
                    <span>{copy.delivery}</span>

                    <span>
                      {order.deliveryFee === 0
                        ? copy.free
                        : formatMoney(
                            order.deliveryFee,
                            language
                          )}
                    </span>
                  </div>

                  {order.discountAmount > 0 && (
                    <div className="mt-4 flex justify-between gap-5 text-green-400">
                      <span>{copy.discount}</span>

                      <span>
                        -
                        {formatMoney(
                          order.discountAmount,
                          language
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex items-end justify-between gap-5 border-t border-white/10 pt-6">
                    <strong className="text-lg">
                      {copy.total}
                    </strong>

                    <strong className="text-2xl sm:text-3xl">
                      {formatMoney(
                        order.totalPrice,
                        language
                      )}
                    </strong>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-gray-600">
                  {copy.orderPlacedOn}{" "}
                  {formatTrackingDate(
                    order.createdAt,
                    language
                  )}
                </p>

                <div
                  className={`mt-7 grid gap-3 ${
                    isDelivered
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-1"
                  }`}
                >
                  {isDelivered && (
                    <Link
                      href={reviewLink}
                      className="flex items-center justify-center rounded-full bg-white px-7 py-4 text-center font-black text-black transition hover:bg-gray-200"
                    >
                      {copy.leaveReview}
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={resetTracking}
                    className="flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black text-white transition hover:bg-white/10"
                  >
                    {copy.trackAnother}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. {copy.rightsReserved}
        </p>
      </footer>
    </main>
  );
}
