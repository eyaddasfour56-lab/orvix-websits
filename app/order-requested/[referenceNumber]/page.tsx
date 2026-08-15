"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

const copyByLanguage = {
  en: {
    received: "Details received",
    title:
      "Ordering is not available right now",
    description:
      "No order has been confirmed. We saved your details and ORVIX will contact you when ordering becomes available.",
    reference: "Your request reference",
    copied: "Copied ✓",
    copyReference: "Copy Reference",
    noPayment:
      "No payment is required. Please wait for ORVIX to contact you before sending any money.",
    backHome: "Back to ORVIX",
  },
  ar: {
    received: "تم استلام البيانات",
    title: "الطلب غير متاح حاليًا",
    description:
      "لم يتم تأكيد أي طلب. حفظنا بياناتك وسيتواصل معك فريق ORVIX عندما يصبح الطلب متاحًا.",
    reference: "الرقم المرجعي لطلب التواصل",
    copied: "تم النسخ ✓",
    copyReference: "نسخ الرقم المرجعي",
    noPayment:
      "لا يوجد أي مبلغ مطلوب. انتظر تواصل ORVIX معك قبل إرسال أي أموال.",
    backHome: "العودة إلى ORVIX",
  },
} as const;

export default function OrderRequestedPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];

  const params = useParams<{
    referenceNumber: string;
  }>();

  const [copied, setCopied] =
    useState(false);

  const referenceNumber =
    decodeURIComponent(
      params.referenceNumber || ""
    );

  async function copyReferenceNumber() {
    try {
      await navigator.clipboard.writeText(
        referenceNumber
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

          <div className="mx-auto mt-9 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-4xl font-black text-amber-200">
            !
          </div>

          <p className="mt-8 text-sm uppercase tracking-[0.35em] text-amber-300">
            {copy.received}
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            {copy.title}
          </h1>

          <p className="mt-5 leading-7 text-gray-400">
            {copy.description}
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm text-gray-500">
              {copy.reference}
            </p>

            <p className="mt-2 break-words text-xl font-black sm:text-2xl">
              {referenceNumber}
            </p>

            <button
              type="button"
              onClick={copyReferenceNumber}
              className="mt-5 flex w-full items-center justify-center rounded-full border border-white/15 bg-white px-6 py-4 font-bold text-black transition hover:bg-gray-200"
            >
              {copied
                ? copy.copied
                : copy.copyReference}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {copy.noPayment}
          </div>

          <Link
            href="/"
            className="mt-7 flex w-full justify-center rounded-full bg-white px-8 py-5 font-bold text-black"
          >
            {copy.backHome}
          </Link>
        </section>
      </div>
    </main>
  );
}
