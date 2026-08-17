"use client";

import Link from "next/link";

export default function AdminOrvixAssistant() {
  return (
    <Link
      href="/admin/ai"
      className="shrink-0 rounded-xl border border-violet-300/25 bg-violet-500/[0.12] px-3 py-2 text-[11px] font-black text-violet-100 transition hover:bg-violet-500/[0.2] sm:text-xs"
      aria-label="Open ORVIX AI page"
    >
      ✦ ORVIX AI
    </Link>
  );
}
