"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

const copyByLanguage = {
  en: {
    received: "Order received",
    thankYou: "Thank you!",
    description:
      "Your order has been received successfully. ORVIX will contact you to confirm the delivery details.",
    orderNumber: "Your order number",
    copied: "Copied ✓",
    copyNumber: "Copy Order Number",
    saveNumber:
      "Save your order number. You will need it with your phone number to track your order.",
    track: "Track Your Order",
    continueShopping: "Continue Shopping",
  },
  ar: {
    received: "تم استلام الطلب",
    thankYou: "شكرًا لك!",
    description:
      "تم استلام طلبك بنجاح. سيتواصل معك فريق ORVIX لتأكيد تفاصيل التوصيل.",
    orderNumber: "رقم طلبك",
    copied: "تم النسخ ✓",
    copyNumber: "نسخ رقم الطلب",
    saveNumber:
      "احتفظ برقم طلبك؛ ستحتاج إليه مع رقم هاتفك لتتبّع الطلب.",
    track: "تتبّع طلبك",
    continueShopping: "تابع التسوق",
  },
} as const;

export default function OrderSuccessPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];

  const params = useParams<{
    orderNumber: string;
  }>();

  const [copied, setCopied] = useState(false);

  const orderNumber = decodeURIComponent(
    params.orderNumber || ""
  );

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(
        orderNumber
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      <div className="flex min-h-[calc(100vh-81px)] items-center justify-center px-4 py-12">
        <section className="w-full max-w-xl rounded-[36px] border border-white/10 bg-white/5 p-7 text-center sm:p-12">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-3"
        >
          <Image
            src="/logo.jpeg"
            alt="ORVIX"
            width={48}
            height={48}
            className="rounded-full object-cover"
          />

          <span className="font-bold tracking-[0.3em]">
            ORVIX
          </span>
        </Link>

        <div className="mx-auto mt-9 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl font-black text-black">
          ✓
        </div>

        <p className="mt-8 text-sm uppercase tracking-[0.35em] text-gray-500">
          {copy.received}
        </p>

        <h1 className="mt-4 text-4xl font-black sm:text-5xl">
          {copy.thankYou}
        </h1>

        <p className="mt-5 leading-7 text-gray-400">
          {copy.description}
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
          <p className="text-sm text-gray-500">
            {copy.orderNumber}
          </p>

          <p className="mt-2 break-words text-xl font-black sm:text-2xl">
            {orderNumber}
          </p>

          <button
            type="button"
            onClick={copyOrderNumber}
            className="mt-5 flex w-full items-center justify-center rounded-full border border-white/15 bg-white px-6 py-4 font-bold text-black transition hover:bg-gray-200"
          >
            {copied
              ? copy.copied
              : copy.copyNumber}
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-200">
          {copy.saveNumber}
        </div>

        <Link
          href={`/track-order?orderNumber=${encodeURIComponent(
            orderNumber
          )}`}
          className="mt-7 flex w-full justify-center rounded-full bg-white px-8 py-5 font-bold text-black"
        >
          {copy.track}
        </Link>

        <Link
          href="/"
          className="mt-3 flex w-full justify-center rounded-full border border-white/15 px-8 py-5 font-bold text-white"
        >
          {copy.continueShopping}
        </Link>
        </section>
      </div>
    </main>
  );
}
