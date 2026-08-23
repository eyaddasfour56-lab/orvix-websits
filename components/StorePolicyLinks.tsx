"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

const links = [
  ["shipping", "Shipping", "الشحن"],
  ["returns", "Returns", "الاستبدال والاسترجاع"],
  ["warranty", "Warranty", "الضمان"],
  ["privacy", "Privacy", "الخصوصية"],
  ["terms", "Terms", "الشروط"],
] as const;

export default function StorePolicyLinks() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const settings = useSiteSettings();
  if (pathname.startsWith("/admin") || pathname.startsWith("/under-construction")) return null;

  return (
    <footer className="border-t border-white/[0.08] bg-[#08090b] px-4 py-7 text-white sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-start">
        <div>
          <p className="text-xs font-black tracking-[0.28em]">{settings.shortName}</p>
          <p className="mt-1 text-[10px] text-white/25">© 2026 {settings.brandName} · Secure shopping in Egypt</p>
        </div>
        <nav aria-label="Store policies" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-bold text-white/38">
          {links.map(([slug, en, ar]) => (
            <Link key={slug} href={`/policies/${slug}`} className="transition hover:text-white/75">
              {language === "ar" ? ar : en}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
