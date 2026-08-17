import Link from "next/link";
import { ReactNode } from "react";
import AdminChatNotifier from "@/components/AdminChatNotifier";
import AdminUiPolish from "@/components/AdminUiPolish";
import AdminAiToggle from "@/components/AdminAiToggle";
import AdminPwaRefresh from "@/components/AdminPwaRefresh";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <AdminPwaRefresh />
      <AdminUiPolish />

      <div className="sticky top-0 z-[120] border-b border-white/10 bg-[#070707]/95 backdrop-blur print:hidden">
        <div className="mx-auto max-w-[1600px] px-3 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/command-center"
              className="shrink-0 rounded-xl border border-violet-400/25 bg-violet-500/[0.1] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-violet-100 transition hover:bg-violet-500/[0.16] sm:text-xs"
            >
              ORVIX OS
            </Link>

            <Link
              href="/admin"
              className="shrink-0 rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-[11px] font-black text-white/70 transition hover:bg-[#171717] hover:text-white sm:text-xs"
            >
              Operations
            </Link>

            <Link
              href="/admin/chats"
              className="shrink-0 rounded-xl border border-blue-400/20 bg-blue-500/[0.08] px-3 py-2 text-[11px] font-black text-blue-200 transition hover:bg-blue-500/[0.14] sm:text-xs"
            >
              Chats
            </Link>

            <Link
              href="/admin/cashflow"
              className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-[11px] font-black text-emerald-200 transition hover:bg-emerald-500/[0.14] sm:text-xs"
            >
              Cash Flow
            </Link>

            <Link
              href="/admin/cashflow/transfer"
              className="shrink-0 rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-3 py-2 text-[11px] font-black text-violet-200 transition hover:bg-violet-500/[0.14] sm:text-xs"
            >
              Transfer
            </Link>

            <AdminAiToggle />

            <div className="min-w-0 sm:ml-auto">
              <AdminChatNotifier />
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
