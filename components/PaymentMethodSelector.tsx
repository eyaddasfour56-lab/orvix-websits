"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

type PaymentMethod = "cash_on_delivery" | "instapay_on_delivery";

const STORAGE_KEY = "orvixPaymentMethod";
const COOKIE_NAME = "orvixPaymentMethod";

const copy = {
  en: {
    title: "Payment method",
    subtitle: "Choose how you want to pay for this order.",
    cashTitle: "Cash on Delivery",
    cashText: "Pay the full order total in cash to the courier when your order arrives.",
    instaTitle: "InstaPay on Delivery",
    instaText: "Transfer the product total to ORVIX shortly before the courier arrives. The courier collects the delivery fee only.",
    selected: "Selected",
    intro: "Review your order, enter your delivery information, then choose Cash on Delivery or InstaPay on Delivery before placing your order.",
  },
  ar: {
    title: "طريقة الدفع",
    subtitle: "اختر الطريقة المناسبة لدفع قيمة الطلب.",
    cashTitle: "الدفع كاش عند الاستلام",
    cashText: "ادفع إجمالي الطلب كاملًا كاش لمندوب الشحن عند وصول الطلب.",
    instaTitle: "InstaPay عند التوصيل",
    instaText: "حوّل قيمة المنتجات إلى ORVIX قبل وصول المندوب مباشرة، وادفع رسوم التوصيل فقط للمندوب.",
    selected: "محدد",
    intro: "راجع طلبك وأدخل بيانات التوصيل، ثم اختر الدفع كاش عند الاستلام أو عبر InstaPay عند التوصيل قبل تأكيد الطلب.",
  },
} as const;

function readSavedMethod(): PaymentMethod {
  if (typeof window === "undefined") return "cash_on_delivery";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "instapay_on_delivery" ? "instapay_on_delivery" : "cash_on_delivery";
}

export default function PaymentMethodSelector() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = copy[language];
  const [method, setMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/checkout") {
      setHost(null);
      return;
    }

    const saved = readSavedMethod();
    setMethod(saved);

    const timer = window.setTimeout(() => {
      const aside = document.querySelector("main form aside");
      if (!(aside instanceof HTMLElement)) return;

      const mount = document.createElement("div");
      mount.dataset.orvixPaymentMount = "true";

      const submitButton = aside.querySelector('button[type="submit"]');
      const submitContainer = submitButton?.parentElement;

      if (submitContainer) {
        aside.insertBefore(mount, submitContainer);
      } else {
        aside.appendChild(mount);
      }

      // Hide the old single-method explanation so the checkout stays clean.
      const blocks = Array.from(aside.querySelectorAll("div"))
        .filter((element) => {
          const text = element.textContent || "";
          return (
            text.includes("How payment works") ||
            text.includes("Two separate payments on delivery") ||
            text.includes("طريقة الدفع") ||
            text.includes("دفعتان منفصلتان عند الاستلام")
          );
        })
        .sort((a, b) => (a.textContent?.length || 0) - (b.textContent?.length || 0));

      const oldBlock = blocks[0];
      if (oldBlock instanceof HTMLElement && oldBlock !== aside) {
        oldBlock.dataset.orvixHiddenPaymentInfo = "true";
        oldBlock.style.display = "none";
      }

      // Replace the old InstaPay-only intro with neutral wording.
      const heading = Array.from(document.querySelectorAll("main h1")).find((node) => {
        const text = node.textContent || "";
        return text.includes("Complete your order") || text.includes("أكمل طلبك");
      });

      const intro = heading?.parentElement?.querySelector("p.mt-5");
      if (intro instanceof HTMLElement) {
        intro.textContent = t.intro;
      }

      setHost(mount);

      return () => {
        mount.remove();
      };
    }, 80);

    return () => {
      window.clearTimeout(timer);
      const mounted = document.querySelector('[data-orvix-payment-mount="true"]');
      mounted?.remove();
      const hidden = document.querySelector('[data-orvix-hidden-payment-info="true"]');
      if (hidden instanceof HTMLElement) hidden.style.display = "";
      setHost(null);
    };
  }, [pathname, t.intro]);

  useEffect(() => {
    if (pathname !== "/checkout") return;
    window.localStorage.setItem(STORAGE_KEY, method);
    document.cookie = `${COOKIE_NAME}=${method}; Path=/; Max-Age=86400; SameSite=Lax`;
  }, [method, pathname]);

  if (pathname !== "/checkout" || !host) return null;

  const options: Array<{
    value: PaymentMethod;
    icon: string;
    title: string;
    text: string;
  }> = [
    {
      value: "cash_on_delivery",
      icon: "£",
      title: t.cashTitle,
      text: t.cashText,
    },
    {
      value: "instapay_on_delivery",
      icon: "↗",
      title: t.instaTitle,
      text: t.instaText,
    },
  ];

  return createPortal(
    <section className="mt-7 rounded-[26px] border border-white/10 bg-black/25 p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-black text-white">{t.title}</h3>
        <p className="mt-1 text-sm leading-6 text-white/45">{t.subtitle}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {options.map((option) => {
          const selected = method === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMethod(option.value)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition ${
                selected
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/[0.025] text-white hover:border-white/25"
              }`}
              aria-pressed={selected}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                  selected ? "bg-black text-white" : "bg-white/10 text-white"
                }`}
              >
                {option.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <strong className="font-black">{option.title}</strong>
                  {selected && (
                    <span className="rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                      {t.selected}
                    </span>
                  )}
                </span>
                <span className={`mt-1 block text-xs leading-5 ${selected ? "text-black/60" : "text-white/45"}`}>
                  {option.text}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>,
    host
  );
}
