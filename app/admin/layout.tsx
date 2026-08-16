import Link from "next/link";
import { ReactNode } from "react";
import AdminChatNotifier from "@/components/AdminChatNotifier";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="sticky top-0 z-[120] border-b border-white/10 bg-[#070707]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-3 py-2.5 sm:px-5">
          <Link
            href="/admin"
            className="shrink-0 rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-xs font-black tracking-[0.08em] text-white/80 transition hover:bg-[#171717] hover:text-white"
          >
            ORVIX ADMIN
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/admin/chats"
              className="shrink-0 rounded-xl border border-blue-400/20 bg-blue-500/[0.08] px-3 py-2 text-xs font-black text-blue-200 transition hover:bg-blue-500/[0.14]"
            >
              Customer Chats
            </Link>
            <Link
              href="/admin/cashflow"
              className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-xs font-black text-emerald-200 transition hover:bg-emerald-500/[0.14]"
            >
              Cash Flow
            </Link>
            <AdminChatNotifier />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
