"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SummaryResponse = {
  success?: boolean;
  summary?: { total: number; withPhone: number; newLast7Days: number };
};

export default function AdminCustomerSummary() {
  const [summary, setSummary] = useState({ total: 0, withPhone: 0, newLast7Days: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/customers", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const result = (await response.json()) as SummaryResponse;
        if (active && response.ok && result.success && result.summary) setSummary(result.summary);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href="/admin/customers"
      className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:bg-white/[0.05] sm:p-5"
    >
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/25">Registered customers</p>
        <div className="mt-2 flex items-baseline gap-3">
          <p className="text-3xl font-black tracking-[-0.04em]">{loading ? "—" : summary.total.toLocaleString("en-GB")}</p>
          <p className="text-xs font-bold text-white/35">customer accounts</p>
        </div>
      </div>
      <div className="flex gap-5 text-right">
        <div><p className="text-lg font-black">{summary.withPhone}</p><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">With phone</p></div>
        <div><p className="text-lg font-black">+{summary.newLast7Days}</p><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">Last 7 days</p></div>
        <span className="self-center text-white/30">→</span>
      </div>
    </Link>
  );
}
