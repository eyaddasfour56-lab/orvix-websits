import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2 print:hidden">
        <Link
          href="/admin/chats"
          className="rounded-full border border-blue-300/25 bg-blue-500 px-5 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-400"
        >
          Customer Chats
        </Link>
        <Link
          href="/admin/cashflow"
          className="rounded-full border border-emerald-300/25 bg-emerald-400 px-5 py-3 text-sm font-black text-black shadow-[0_18px_45px_rgba(16,185,129,0.28)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
        >
          Cash Flow
        </Link>
      </div>
    </>
  );
}
