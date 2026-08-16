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
              href="/admin"
              className="shrink-0 rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-[11px] font-black tracking-[0.08em] text-white/80 transition hover:bg-[#171717] hover:text-white sm:text-xs"
            >
              ORVIX ADMIN
            </Link>

            <Link
              href="/admin/chats"
              className="shrink-0 rounded-xl border border-blue-400/20 bg-blue-500/[0.08] px-3 py-2 text-[11px] font-black text-blue-200 transition hover:bg-blue-500/[0.14] sm:text-xs"
            >
              Customer Chats
            </Link>

            <Link
              href="/admin/cashflow"
              className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-2 text-[11px] font-black text-emerald-200 transition hover:bg-emerald-500/[0.14] sm:text-xs"
            >
              Cash Flow
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
