"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

type Promotion = {
  enabled: boolean;
  code?: string;
  labelEn?: string;
  labelAr?: string;
  productName?: string;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  price?: number;
  finalPrice?: number;
  freeDelivery?: boolean;
};

export default function PromoBanner() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const settings = useSiteSettings();
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [promotion, setPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/promotion", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (!cancelled) setPromotion(result?.promotion || { enabled: false });
      })
      .catch(() => {
        if (!cancelled) setPromotion({ enabled: false });
      });
    return () => { cancelled = true; };
  }, [settings.promoCode, settings.promoEnabled, settings.promoProductSlug]);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/under-construction") ||
    !promotion?.enabled
  ) {
    return null;
  }

  const promoCode = promotion.code || settings.promoCode;
  const numberLocale = language === "ar" ? "ar-EG" : "en-GB";
  const money = (value: number) => Number(value || 0).toLocaleString(numberLocale);
  const discountText = promotion.freeDelivery
    ? language === "ar" ? "توصيل مجاني" : "FREE DELIVERY"
    : language === "ar"
      ? `خصم ${money(Number(promotion.discountAmount || 0))} ج.م`
      : `GET ${money(Number(promotion.discountAmount || 0))} EGP OFF`;

  const message =
    language === "ar"
      ? `${discountText} على ${promotion.productName}`
      : `${discountText} ${String(promotion.productName || "").toUpperCase()}`;

  const codeLabel =
    language === "ar"
      ? `استخدم الكود: ${promoCode}`
      : `USE CODE: ${promoCode}`;

  const copiedLabel =
    language === "ar" ? "تم النسخ ✓" : "COPIED ✓";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(promoCode);
      window.localStorage.setItem("orvixPromoCode", promoCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be unavailable in some browsers.
    }
  }

  return (
    <div className="relative z-[60] overflow-hidden border-b border-blue-400/20 bg-gradient-to-r from-[#071022] via-[#0d2c66] to-[#071022] text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex min-h-12 max-w-7xl items-center gap-3 px-3 py-2 sm:px-6">
        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.div
            aria-label={`${message}. ${codeLabel}`}
            animate={
              reduceMotion
                ? undefined
                : {
                    x: ["-5%", "5%", "-5%"],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
            className="flex min-w-max items-center gap-3 whitespace-nowrap text-[11px] font-black tracking-[0.12em] sm:gap-5 sm:text-sm sm:tracking-[0.16em]"
          >
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] tracking-[0.2em] sm:text-xs">
              {language === "ar" ? promotion.labelAr : promotion.labelEn}
            </span>
            <span>{message}</span>
            <span className="text-blue-200">•</span>
            <span>{codeLabel}</span>
            <span className="text-blue-200">•</span>
            {!promotion.freeDelivery ? <span>
              <span className="text-white/55 line-through">{money(Number(promotion.price || 0))}</span>{" "}
              <span className="text-blue-200">→ {money(Number(promotion.finalPrice || 0))} {language === "ar" ? "ج.م" : "EGP"}</span>
            </span> : null}
          </motion.div>
        </div>

        <button
          type="button"
          onClick={copyCode}
          className="shrink-0 rounded-full border border-white/20 bg-white px-3 py-2 text-[10px] font-black tracking-[0.12em] text-[#0b2454] transition hover:scale-[1.03] hover:bg-blue-50 active:scale-95 sm:px-4 sm:text-xs"
          aria-label={codeLabel}
        >
          {copied ? copiedLabel : promoCode}
        </button>
      </div>

      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/15 to-transparent blur-sm"
          initial={{ x: "-140%" }}
          animate={{ x: "1300%" }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}
