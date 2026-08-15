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
          headline: "وفّر 1,100 ج.م الآن",
          product: "على Google Fitbit Air",
          codeLabel: "استخدم الكود",
          shopNow: "اطلب الآن",
          copied: "تم النسخ ✓",
          save: "خصم 1,100 ج.م",
        }
      : {
          badge: "LIMITED OFFER",
          headline: "SAVE 1,100 EGP NOW",
          product: "ON GOOGLE FITBIT AIR",
          codeLabel: "USE CODE",
          shopNow: "SHOP NOW",
          copied: "COPIED ✓",
          save: "1,100 EGP OFF",
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

  if (!isHomepage) {
    return (
      <div className="relative z-[60] overflow-hidden border-b border-blue-400/25 bg-gradient-to-r from-[#02060f] via-[#0a2d69] to-[#02060f] text-white shadow-[0_8px_30px_rgba(0,0,0,0.28)]">
        <div className="mx-auto flex min-h-12 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6">
          <div className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.12em] sm:text-xs">
            <span className="text-yellow-300">{copy.save}</span>
            <span className="mx-2 text-white/35">•</span>
            <span>{copy.codeLabel}: {PROMO_CODE}</span>
            <span className="mx-2 text-white/35">•</span>
            <span className="text-white/45 line-through">8,500 EGP</span>
            <span className="ml-2 text-yellow-300">7,400 EGP</span>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-[9px] font-black tracking-[0.12em] text-[#0b2454]"
          >
            {copied ? copy.copied : PROMO_CODE}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[60] overflow-hidden border-b border-yellow-300/35 bg-[radial-gradient(circle_at_top,#123e86_0%,#071a3f_42%,#02060f_100%)] text-white shadow-[0_12px_45px_rgba(0,0,0,0.38)]">
      <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <motion.span
                animate={
                  reduceMotion
                    ? undefined
                    : { scale: [1, 1.07, 1] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 1.35,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                }
                className="rounded-full bg-yellow-300 px-3 py-1.5 text-[10px] font-black tracking-[0.18em] text-black shadow-[0_0_25px_rgba(253,224,71,0.35)] sm:text-xs"
              >
                {copy.badge}
              </motion.span>

              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.14em] text-blue-100 sm:text-xs">
                {copy.product}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h2 className="text-2xl font-black leading-none tracking-tight sm:text-3xl md:text-4xl">
                {copy.headline}
              </h2>

              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-emerald-300 sm:text-xs">
                {copy.save}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="text-base font-bold text-white/45 line-through sm:text-lg">
                8,500 EGP
              </span>
              <span className="text-3xl font-black leading-none text-yellow-300 drop-shadow-[0_0_18px_rgba(253,224,71,0.35)] sm:text-4xl">
                7,400 EGP
              </span>
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
            <button
              type="button"
              onClick={copyCode}
              className="flex-1 rounded-2xl border border-white/20 bg-white px-4 py-3 text-center text-[11px] font-black tracking-[0.14em] text-[#0b2454] shadow-lg transition hover:scale-[1.02] hover:bg-blue-50 active:scale-95 sm:flex-none sm:rounded-full sm:px-5 sm:text-xs"
              aria-label={`${copy.codeLabel}: ${PROMO_CODE}`}
            >
              <span className="block text-[8px] font-black tracking-[0.16em] text-[#54709f] sm:text-[9px]">
                {copy.codeLabel}
              </span>
              <span className="mt-0.5 block">
                {copied ? copy.copied : PROMO_CODE}
              </span>
            </button>

            <Link
              href="/products/google-fitbit-air"
              className="flex-1 rounded-2xl bg-yellow-300 px-4 py-3 text-center text-[11px] font-black tracking-[0.12em] text-black shadow-[0_0_24px_rgba(253,224,71,0.28)] transition hover:scale-[1.02] hover:bg-yellow-200 active:scale-95 sm:flex-none sm:rounded-full sm:px-6 sm:text-xs"
            >
              {copy.shopNow}
            </Link>
          </div>
        </div>
      </div>

      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/12 to-transparent blur-sm"
          initial={{ x: "-180%" }}
          animate={{ x: "1500%" }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "linear",
          }}
        />
      )}
    </div>
  );
}
