import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Link
        href="/admin/cashflow"
        className="fixed bottom-5 right-5 z-[100] rounded-full border border-emerald-300/25 bg-emerald-400 px-5 py-3 text-sm font-black text-black shadow-[0_18px_45px_rgba(16,185,129,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-300 print:hidden"
      >
        Cash Flow
      </Link>
    </>
  );
}
