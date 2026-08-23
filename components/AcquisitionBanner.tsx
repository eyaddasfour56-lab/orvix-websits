"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AcquisitionBanner() {
  const pathname = usePathname();

  if (pathname !== "/" && pathname !== "/system-preview") return null;

  return (
    <div className="border-b border-emerald-300/20 bg-[#07110d] px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] font-bold sm:text-xs">
        <span className="text-emerald-200">Commerce platform available for acquisition</span>
        <span className="text-white/35">•</span>
        <span className="text-white/70">5-day price: 55,000 EGP (~US$1,100)</span>
        <span className="text-white/35">•</span>
        <Link href="/system-preview" className="text-emerald-200 underline underline-offset-4 hover:text-emerald-100">
          Buyer preview
        </Link>
        <span className="text-white/35">•</span>
        <a href="mailto:asfoureyad6@gmail.com?subject=ORVIX%20commerce%20platform%20acquisition" className="text-emerald-200 underline underline-offset-4 hover:text-emerald-100">
          Contact seller
        </a>
      </div>
    </div>
  );
}
