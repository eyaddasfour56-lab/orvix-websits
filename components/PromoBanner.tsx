"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

const PROMO_CODE = "ORVIX15";

export default function PromoBanner() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/under-construction")
  ) {
    return null;
  }

  const isHomepage = pathname === "/";

  const copy =
    language === "ar"
      ? {
          badge: "عرض محدود",
          headline: "خصم 1,100 ج.م على Google Fitbit Air",
          subline: "استخدم الكود ORVIX15 وخليه بـ 7,400 بدل 8,500 ج.م",
          useCode: "استخدم الكود",
          shopNow: "اطلب الآن",
          copied: "تم النسخ ✓",
          limited: "لفترة محدودة",
        }
      : {
          badge: "LIMITED OFFER",
          headline: "GET 1,100 EGP OFF GOOGLE FITBIT AIR",
          subline: "Use ORVIX15 and get it for 7,400 EGP instead of 8,500 EGP",
          useCode: "USE CODE",
          shopNow: "SHOP NOW",
          copied: "COPIED ✓",
          limited: "LIMITED TIME",
        };

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be unavailable in some browsers.
    }
  }

  return (
    <div
      className={`relative z-[60] overflow-hidden border-b border-[#4f8cff]/35 bg-gradient-to-r from-[#02060f] via-[#0a2d69] to-[#02060f] text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${
        isHomepage ? "py-1" : ""
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center gap-3 px-3 sm:px-6 ${
          isHomepage
            ? "min-h-[88px] py-3 sm:min-h-[96px]"
            : "min-h-12 py-2"
        }`}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.div
            aria-label={`${copy.headline}. ${copy.useCode}: ${PROMO_CODE}`}
            animate={
              reduceMotion
                ? undefined
                : {
                    x: isHomepage
                      ? ["-1.5%", "1.5%", "-1.5%"]
                      : ["-4%", "4%", "-4%"],
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: isHomepage ? 5.5 : 7,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
            className="flex min-w-max items-center gap-3 whitespace-nowrap"
          >
            <motion.span
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [1, 1.08, 1] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 1.25,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
              className={`rounded-full border border-yellow-300/60 bg-yellow-300 font-black tracking-[0.18em] text-black shadow-[0_0_22px_rgba(253,224,71,0.38)] ${
                isHomepage
                  ? "px-3 py-1.5 text-[10px] sm:text-xs"
                  : "px-2.5 py-1 text-[9px] sm:text-[10px]"
              }`}
            >
              {copy.badge}
            </motion.span>

            <div className="flex items-center gap-3">
              <div>
                <div
                  className={`font-black uppercase tracking-[0.08em] ${
                    isHomepage
                      ? "text-sm sm:text-xl"
                      : "text-[11px] sm:text-sm"
                  }`}
                >
                  {copy.headline}
                </div>

                {isHomepage && (
                  <div className="mt-1 hidden text-xs font-bold tracking-[0.02em] text-blue-100 sm:block">
                    {copy.subline}
                  </div>
                )}
              </div>

              <span className="text-blue-200">•</span>

              <div className="flex items-center gap-2">
                <span
                  className={`text-white/55 line-through ${
                    isHomepage
                      ? "text-sm sm:text-base"
                      : "text-[10px] sm:text-xs"
                  }`}
                >
                  8,500 EGP
                </span>

                <span
                  className={`font-black text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.35)] ${
                    isHomepage
                      ? "text-xl sm:text-2xl"
                      : "text-sm sm:text-base"
                  }`}
                >
                  7,400 EGP
                </span>
              </div>

              <span className="text-blue-200">•</span>

              <span
                className={`font-black tracking-[0.12em] text-blue-100 ${
                  isHomepage
                    ? "text-xs sm:text-sm"
                    : "text-[10px] sm:text-xs"
                }`}
              >
                {copy.useCode}: {PROMO_CODE}
              </span>
            </div>
          </motion.div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            className={`rounded-full border border-white/20 bg-white font-black tracking-[0.12em] text-[#0b2454] transition hover:scale-[1.03] hover:bg-blue-50 active:scale-95 ${
              isHomepage
                ? "px-3 py-2 text-[10px] sm:px-4 sm:text-xs"
                : "px-3 py-2 text-[9px] sm:text-[10px]"
            }`}
            aria-label={`${copy.useCode}: ${PROMO_CODE}`}
          >
            {copied ? copy.copied : PROMO_CODE}
          </button>

          {isHomepage && (
            <Link
              href="/products/google-fitbit-air"
              className="hidden rounded-full bg-yellow-300 px-4 py-2 text-xs font-black tracking-[0.1em] text-black shadow-[0_0_20px_rgba(253,224,71,0.32)] transition hover:scale-[1.03] hover:bg-yellow-200 sm:inline-flex"
            >
              {copy.shopNow}
            </Link>
          )}
        </div>
      </div>

      {isHomepage && (
        <div className="border-t border-white/10 bg-black/25 px-3 py-1.5 text-center text-[9px] font-black tracking-[0.2em] text-blue-100 sm:text-[10px]">
          {copy.limited} • {PROMO_CODE} • 1,100 EGP OFF • {copy.limited}
        </div>
      )}

      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-28 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"
          initial={{ x: "-160%" }}
          animate={{ x: "1500%" }}
          transition={{
            duration: 3.8,
            repeat: Infinity,
            repeatDelay: 0.9,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}
