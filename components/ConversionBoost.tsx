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
    eyebrow: "SMART FITNESS, SIMPLIFIED",
    title: "Google Fitbit Air",
    description:
      "Screen-free health and fitness tracking in a lightweight design, with a cleaner ordering experience from ORVIX.",
    shopNow: "Shop Google Fitbit Air",
    explore: "See Product Details",
    code: `Use code ${PROMO_CODE}`,
    saving: "Save 1,100 EGP",
    available: "Available now",
    lowStock: "Limited stock available",
    unavailable: "Temporarily unavailable",
    battery: "Up to 7-day battery",
    colours: "3 colour options",
    compatibility: "iOS & Android",
    trust1: "Simple ordering",
    trust1Sub: "Clear checkout, no hidden steps",
    trust2: "Order tracking",
    trust2Sub: "Track with order number + phone",
    trust3: "Customer support",
    trust3Sub: "Official ORVIX support channel",
    trust4: "Delivery pricing",
    trust4Sub: "Shown before you confirm",
    checkout: "CHECKOUT",
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
    eyebrow: "لياقة ذكية ببساطة",
    title: "Google Fitbit Air",
    description:
      "تتبّع للصحة واللياقة بدون شاشة مشتتة، بتصميم خفيف وتجربة طلب أوضح من ORVIX.",
    shopNow: "اطلب Google Fitbit Air",
    explore: "شاهد تفاصيل المنتج",
    code: `استخدم الكود ${PROMO_CODE}`,
    saving: "وفّر 1,100 ج.م",
    available: "متوفر الآن",
    lowStock: "الكمية المتاحة محدودة",
    unavailable: "غير متوفر مؤقتًا",
    battery: "بطارية حتى 7 أيام",
    colours: "3 اختيارات ألوان",
    compatibility: "iOS و Android",
    trust1: "طلب بسيط",
    trust1Sub: "خطوات واضحة بدون تعقيد",
    trust2: "تتبّع الطلب",
    trust2Sub: "برقم الطلب ورقم الهاتف",
    trust3: "دعم العملاء",
    trust3Sub: "عبر قناة ORVIX الرسمية",
    trust4: "سعر التوصيل",
    trust4Sub: "يظهر قبل تأكيد الطلب",
    checkout: "إتمام الطلب",
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
    if (typeof product.stockQuantity === "number" && product.stockQuantity > 0 && product.stockQuantity <= 5) {
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
        <section className="relative overflow-hidden border-b border-white/10 bg-[#050505] px-4 py-10 text-white sm:px-6 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_35%,rgba(43,103,255,0.18),transparent_34%),radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.07),transparent_26%)]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className={isArabic ? "text-right" : "text-left"}>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-xs font-black tracking-[0.16em] text-blue-100">
                <span className="h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_16px_rgba(147,197,253,0.8)]" />
                {t.badge}
              </div>

              <p className="mt-7 text-xs font-black uppercase tracking-[0.35em] text-white/45">
                {t.eyebrow}
              </p>

              <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl lg:text-8xl">
                {t.title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg sm:leading-8">
                {t.description}
              </p>

              <div className="mt-7 flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="text-lg font-bold text-white/35 line-through">
                  <Money value={LIST_PRICE} />
                </span>
                <span className="text-4xl font-black tracking-tight sm:text-5xl">
                  <Money value={PROMO_PRICE} />
                </span>
                <span className="mb-1 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                  {t.saving}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-bold text-white/55">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                  {t.code}
                </span>
                <span>{availabilityLabel}</span>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={canOrder ? "/checkout?colour=Black&quantity=1" : "/products/google-fitbit-air"}
                  className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 py-4 text-base font-black text-black transition hover:scale-[1.015] hover:bg-blue-50 active:scale-95"
                >
                  {canOrder ? t.shopNow : t.explore}
                </Link>

                <Link
                  href="/products/google-fitbit-air"
                  className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 py-4 text-base font-black text-white transition hover:bg-white/[0.09]"
                >
                  {t.explore}
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-white/45 sm:text-sm">
                {[t.battery, t.colours, t.compatibility].map((item) => (
                  <span key={item} className="rounded-full border border-white/10 px-3 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute inset-10 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-b from-white to-[#e9eefc] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.42)] sm:p-10">
                <Image
                  src="/black.png"
                  alt="Google Fitbit Air in Black"
                  width={900}
                  height={900}
                  priority
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="mx-auto aspect-square w-full object-contain drop-shadow-[0_22px_35px_rgba(0,0,0,0.28)]"
                />

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Black", "bg-[#151515]"],
                    ["Lavender", "bg-[#b7a7d8]"],
                    ["Berry", "bg-[#8c3157]"],
                  ].map(([name, colourClass]) => (
                    <div
                      key={name}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/75 px-2 py-3 text-xs font-black text-black"
                    >
                      <span className={`h-3 w-3 rounded-full ${colourClass}`} />
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {(isHome || isFitbit || isCheckout) && (
        <section className="border-b border-white/10 bg-[#090909] px-4 py-4 text-white sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {trustItems.map(([icon, title, description]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
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
            <Link href="/track-order" className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-black text-black">
              {t.track}
            </Link>
          </div>
        </section>
      )}

      {isFitbit && canOrder && (
        <div className="fixed inset-x-0 bottom-0 z-[85] border-t border-white/10 bg-black/90 px-3 py-3 text-white shadow-[0_-16px_50px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">{t.stickyLabel}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-white/35 line-through"><Money value={LIST_PRICE} /></span>
                <span className="text-lg font-black"><Money value={PROMO_PRICE} /></span>
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
