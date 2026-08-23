"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AcquisitionBanner() {
  const pathname = usePathname();

  if (pathname !== "/" && pathname !== "/system-preview" && pathname !== "/license") return null;

  return (
    <div className="border-b border-emerald-300/20 bg-[#07110d] px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] font-bold sm:text-xs">
        <span className="text-emerald-200">White-label ecommerce licence available</span>
        <span className="text-white/35">•</span>
        <span className="text-white/70">24,900 EGP / US$499</span>
        <span className="text-white/35">•</span>
        <span className="text-white/70">50% to reserve</span>
        <span className="text-white/35">•</span>
        <Link href="/license" className="text-emerald-200 underline underline-offset-4 hover:text-emerald-100">
          Licence details
        </Link>
        <span className="text-white/35">•</span>
        <Link href="/system-preview" className="text-emerald-200 underline underline-offset-4 hover:text-emerald-100">
          Buyer preview
        </Link>
      </div>
    </div>
  );
}
