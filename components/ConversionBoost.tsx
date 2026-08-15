"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type ProductSnapshot = {
  status?: string;
  stockQuantity?: number;
  allowPurchase?: boolean;
};

const PROMO_PRICE = 7400;
const LIST_PRICE = 8500;
const PROMO_CODE = "ORVIX15";
const INSTAGRAM_URL = "https://www.instagram.com/orvix_tech/";

const copy = {
  en: {
    badge: "LIMITED PRICE DROP",
    title: "Google Fitbit Air",
    subtitle: "Smarter tracking. Cleaner design.",
    shopNow: "Order now",
    explore: "View details",
    code: `Use ${PROMO_CODE}`,
    saving: "Save 1,100 EGP",
    available: "Available now",
    lowStock: "Limited stock",
    unavailable: "Temporarily unavailable",
    battery: "Up to 7-day battery",
    colours: "3 colours",
    compatibility: "iOS & Android",
    trust1: "Simple ordering",
    trust1Sub: "Clear checkout, no hidden steps",
    trust2: "Order tracking",
    trust2Sub: "Track with order number + phone",
    trust3: "Customer support",
    trust3Sub: "Official ORVIX support channel",
    trust4: "Delivery pricing",
    trust4Sub: "Shown before you confirm",
    step1: "Your details",
    step2: "Delivery",
    step3: "Review & confirm",
    checkoutNote: "You will see the full total before placing your order.",
    help: "Need help?",
    instagram: "Message ORVIX",
    stickyLabel: "Limited offer",
    buyNow: "Order now",
    successTitle: "Keep your order number ready",
    successText: "Use it with your phone number to check the latest order status anytime.",
    track: "Track order",
    analytics: "Conversion analytics",
  },
  ar: {
    badge: "خفض سعر لفترة محدودة",
    title: "Google Fitbit Air",
    subtitle: "تتبّع أذكى. تصميم أبسط.",
    shopNow: "اطلب الآن",
    explore: "شاهد التفاصيل",
    code: `استخدم ${PROMO_CODE}`,
    saving: "وفّر 1,100 ج.م",
    available: "متوفر الآن",
    lowStock: "الكمية محدودة",
    unavailable: "غير متوفر مؤقتًا",
    battery: "بطارية حتى 7 أيام",
    colours: "3 ألوان",
    compatibility: "iOS و Android",
    trust1: "طلب بسيط",
    trust1Sub: "خطوات واضحة بدون تعقيد",
    trust2: "تتبّع الطلب",
    trust2Sub: "برقم الطلب ورقم الهاتف",
    trust3: "دعم العملاء",
    trust3Sub: "عبر قناة ORVIX الرسمية",
    trust4: "سعر التوصيل",
    trust4Sub: "يظهر قبل تأكيد الطلب",
    step1: "بياناتك",
    step2: "التوصيل",
    step3: "المراجعة والتأكيد",
    checkoutNote: "سيظهر لك الإجمالي كاملًا قبل إرسال الطلب.",
    help: "تحتاج مساعدة؟",
    instagram: "راسل ORVIX",
    stickyLabel: "عرض محدود",
    buyNow: "اطلب الآن",
    successTitle: "احتفظ برقم طلبك",
    successText: "استخدمه مع رقم هاتفك لمعرفة أحدث حالة للطلب في أي وقت.",
    track: "تتبّع الطلب",
    analytics: "تحليلات التحويل",
  },
} as const;

function Money({ value }: { value: number }) {
  return <>{value.toLocaleString("en-GB")} EGP</>;
}

function TrustIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg">
      {children}
    </span>
  );
}

export default function ConversionBoost() {
  const pathname = usePathname();
  const { language, isArabic } = useLanguage();
  const t = copy[language];
  const [product, setProduct] = useState<ProductSnapshot | null>(null);

  const isHome = pathname === "/";
  const isFitbit = pathname === "/products/google-fitbit-air";
  const isCheckout = pathname === "/checkout";
  const isOrderSuccess = pathname.startsWith("/order-success/");
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isStorePath =
    isHome || pathname.startsWith("/products/") || isCheckout || isOrderSuccess;

  useEffect(() => {
    if (!isHome && !isFitbit) return;

    let cancelled = false;

    void fetch("/api/products?slug=google-fitbit-air", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled && result?.product) {
          setProduct(result.product as ProductSnapshot);
        }
      })
      .catch(() => {
        // Conversion UI should never block the shopping experience.
      });

    return () => {
      cancelled = true;
    };
  }, [isFitbit, isHome]);

  const availabilityLabel = useMemo(() => {
    if (!product) return t.available;
    if (product.status !== "available" || product.allowPurchase === false) {
      return t.unavailable;
    }
    if (
      typeof product.stockQuantity === "number" &&
      product.stockQuantity > 0 &&
      product.stockQuantity <= 5
    ) {
      return t.lowStock;
    }
    return t.available;
  }, [product, t]);

  const canOrder =
    !product ||
    (product.status === "available" &&
      product.allowPurchase !== false &&
      (typeof product.stockQuantity !== "number" || product.stockQuantity > 0));

  if (isAdmin) {
    if (pathname.startsWith("/admin/analytics")) return null;

    return (
      <Link
        href="/admin/analytics"
        className="fixed bottom-5 right-5 z-[90] rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-black text-black shadow-2xl transition hover:scale-[1.02] active:scale-95"
      >
        {t.analytics}
      </Link>
    );
  }

  if (!isStorePath) return null;

  const trustItems = [
    ["✓", t.trust1, t.trust1Sub],
    ["↗", t.trust2, t.trust2Sub],
    ["✦", t.trust3, t.trust3Sub],
    ["£", t.trust4, t.trust4Sub],
  ] as const;

  return (
    <>
      {isHome && (
        <section className="border-b border-white/10 bg-[#050505] px-4 py-5 text-white sm:px-6 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_86%_38%,rgba(37,99,235,0.28),transparent_34%),linear-gradient(120deg,#0a0a0a_0%,#0a0d16_58%,#07152f_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
              <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:36px_36px]" />

              <div className="relative grid min-h-[390px] grid-cols-[1.15fr_0.85fr] items-center sm:min-h-[430px] lg:grid-cols-[0.9fr_1.1fr]">
                <div className={`z-10 px-5 py-7 sm:px-8 sm:py-10 lg:px-12 ${isArabic ? "text-right" : "text-left"}`}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-[10px] font-black tracking-[0.15em] text-blue-100 sm:text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,0.9)]" />
                    {t.badge}
                  </div>

                  <h1 className="mt-5 max-w-xl text-3xl font-black leading-[0.94] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                    {t.title}
                  </h1>

                  <p className="mt-3 text-sm font-semibold text-white/50 sm:text-base">
                    {t.subtitle}
                  </p>

                  <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-sm font-bold text-white/30 line-through sm:text-base">
                      <Money value={LIST_PRICE} />
                    </span>
                    <span className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                      <Money value={PROMO_PRICE} />
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black text-emerald-200 sm:text-xs">
                      {t.saving}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-black text-white/70 sm:text-xs">
                      {t.code}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <Link
                      href={canOrder ? "/checkout?colour=Black&quantity=1" : "/products/google-fitbit-air"}
                      className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.015] hover:bg-blue-50 active:scale-95 sm:px-7"
                    >
                      {canOrder ? t.shopNow : t.explore}
                    </Link>

                    <Link
                      href="/products/google-fitbit-air"
                      className="hidden text-sm font-black text-white/60 underline-offset-4 transition hover:text-white hover:underline sm:inline"
                    >
                      {t.explore} →
                    </Link>
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-[10px] font-bold text-white/40 sm:text-xs">
                    <span>{availabilityLabel}</span>
                    <span>•</span>
                    <span>{t.battery}</span>
                  </div>
                </div>

                <div className="relative flex h-full items-center justify-center overflow-hidden pr-2 sm:pr-6 lg:pr-10">
                  <div className="absolute right-[-15%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-blue-500/25 blur-3xl sm:h-96 sm:w-96" />
                  <Image
                    src="/black.png"
                    alt="Google Fitbit Air in Black"
                    width={760}
                    height={760}
                    priority
                    sizes="(max-width: 640px) 42vw, (max-width: 1024px) 44vw, 42vw"
                    className="relative z-10 w-[155%] max-w-none object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.48)] sm:w-[115%] lg:w-full"
                  />
                </div>
              </div>

              <div className="relative grid grid-cols-3 border-t border-white/10 bg-black/20 px-3 py-3 text-center text-[10px] font-bold text-white/55 sm:px-6 sm:text-xs">
                {[t.battery, t.colours, t.compatibility].map((item, index) => (
                  <div
                    key={item}
                    className={`px-2 ${index > 0 ? "border-l border-white/10" : ""}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {(isHome || isFitbit || isCheckout) && (
        <section className="border-b border-white/10 bg-[#090909] px-4 py-4 text-white sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {trustItems.map(([icon, title, description]) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"
              >
                <TrustIcon>{icon}</TrustIcon>
                <div>
                  <p className="text-sm font-black">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-white/45">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isCheckout && (
        <section className="border-b border-white/10 bg-black px-4 py-5 text-white sm:px-6">
          <div className="mx-auto max-w-5xl rounded-[24px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 text-xs font-black tracking-[0.08em] sm:text-sm">
              <span className="text-blue-200">1. {t.step1}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-blue-400/70 to-white/10" />
              <span className="text-white/65">2. {t.step2}</span>
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-white/45">3. {t.step3}</span>
            </div>
            <p className="mt-3 text-center text-xs text-white/45">{t.checkoutNote}</p>
          </div>
        </section>
      )}

      {isOrderSuccess && (
        <section className="border-b border-white/10 bg-[#080808] px-4 py-5 text-white sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.05] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-black">{t.successTitle}</p>
              <p className="mt-1 text-sm leading-6 text-white/50">{t.successText}</p>
            </div>
            <Link
              href="/track-order"
              className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              {t.track}
            </Link>
          </div>
        </section>
      )}

      {isFitbit && canOrder && (
        <div className="fixed inset-x-0 bottom-0 z-[85] border-t border-white/10 bg-black/90 px-3 py-3 text-white shadow-[0_-16px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">
                {t.stickyLabel}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-white/35 line-through">
                  <Money value={LIST_PRICE} />
                </span>
                <span className="text-lg font-black">
                  <Money value={PROMO_PRICE} />
                </span>
              </div>
            </div>
            <Link
              href="/checkout?colour=Black&quantity=1"
              className="rounded-full bg-white px-6 py-3 text-sm font-black text-black active:scale-95"
            >
              {t.buyNow}
            </Link>
          </div>
        </div>
      )}

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed right-4 z-[84] flex items-center gap-2 rounded-full border border-white/15 bg-[#111] px-4 py-3 text-xs font-black text-white shadow-2xl transition hover:scale-[1.02] hover:bg-[#171717] ${
          isFitbit && canOrder ? "bottom-24 sm:bottom-5" : "bottom-5"
        }`}
        aria-label={t.instagram}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black">✦</span>
        <span className="hidden sm:inline">{t.help}</span>
        <span>{t.instagram}</span>
      </a>
    </>
  );
}
