"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CustomerServiceLink() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/under-construction")
  ) {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full border border-blue-400/25 bg-[#111827] px-4 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-blue-400/45 hover:bg-[#172033] print:hidden"
      aria-label="Open ORVIX Customer Service"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
      </span>
      Customer Service
    </Link>
  );
}
