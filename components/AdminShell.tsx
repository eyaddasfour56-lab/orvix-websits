"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminChatNotifier from "@/components/AdminChatNotifier";
import AdminNotifications from "@/components/AdminNotifications";
import AdminOrvixAssistant from "@/components/AdminOrvixAssistant";

type AdminMode = "simple" | "advanced";
type NavItem = { label: string; href: string; keywords: string; badge?: string };

const simpleItems: NavItem[] = [
  { label: "Home", href: "/admin", keywords: "home dashboard overview summary" },
  { label: "Orders", href: "/admin/fulfillment", keywords: "orders status preorder tracking customs courier bosta", badge: "LIVE" },
  { label: "Products", href: "/admin/products", keywords: "products stock inventory price variants" },
  { label: "Money", href: "/admin/cashflow", keywords: "money cashflow profit expenses revenue" },
  { label: "Customers", href: "/admin/command-center/advanced#customers", keywords: "customers crm repeat vip" },
  { label: "Messages", href: "/admin/chats", keywords: "messages chats support customers" },
];

const advancedItems: NavItem[] = [
  { label: "ORVIX AI", href: "/admin/ai", keywords: "ai assistant copilot ask" },
  { label: "Email Previews", href: "/admin/email-preview", keywords: "email preview signup confirmation otp sign in" },
  { label: "Analytics", href: "/admin/analytics", keywords: "analytics views conversion traffic funnel" },
  { label: "Discounts", href: "/admin/discounts", keywords: "discount coupon promo codes" },
  { label: "Brand & SEO", href: "/admin/settings", keywords: "brand logo colours favicon social instagram seo promotion settings" },
  { label: "Checkout Recovery", href: "/admin/recovery", keywords: "abandoned checkout recovery" },
  { label: "Risk Center", href: "/admin/risk", keywords: "risk fraud suspicious duplicate" },
  { label: "Reviews", href: "/admin/reviews", keywords: "reviews ratings feedback" },
  { label: "Waitlist", href: "/admin/waitlist", keywords: "waitlist leads" },
  { label: "Commerce Control", href: "/admin/commerce", keywords: "commerce checkout controls system" },
  { label: "Feature Flags", href: "/admin/features", keywords: "features flags experiments" },
  { label: "Export Center", href: "/admin/export", keywords: "export csv backup" },
  { label: "Advanced Dashboard", href: "/admin/command-center/advanced", keywords: "advanced dashboard audit returns roles" },
];

const allItems = [...simpleItems, ...advancedItems];

function cleanHref(href: string) {
  return href.split("#")[0];
}

function isActive(pathname: string, href: string) {
  const clean = cleanHref(href);
  if (clean === "/admin") return pathname === "/admin";
  return pathname === clean || pathname.startsWith(`${clean}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mode, setMode] = useState<AdminMode>("simple");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setSearch("");
  }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem("orvix-admin-mode");
    if (saved === "advanced") setMode("advanced");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = query ? allItems : mode === "simple" ? simpleItems : allItems;
    return source
      .filter((item) => !query || `${item.label} ${item.keywords}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [search, mode]);

  function changeMode(next: AdminMode) {
    setMode(next);
    window.localStorage.setItem("orvix-admin-mode", next);
  }

  function go(href: string) {
    setSearchOpen(false);
    setSearch("");
    router.push(href);
  }

  const navItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center justify-between rounded-xl px-3 py-3 text-[13px] font-bold transition ${
          active ? "bg-white text-black" : "text-white/62 hover:bg-white/[0.055] hover:text-white"
        }`}
      >
        <span>{item.label}</span>
        {item.badge ? <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${active ? "bg-black/10" : "bg-emerald-400/10 text-emerald-200"}`}>{item.badge}</span> : null}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-[#111214] text-white">
      <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-black">O</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[0.12em]">ORVIX</p>
            <p className="text-[10px] font-semibold text-white/35">Admin</p>
          </div>
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/45 lg:hidden" aria-label="Close menu">×</button>
      </div>

      <div className="border-b border-white/[0.07] p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
          <button type="button" onClick={() => changeMode("simple")} className={`rounded-lg px-3 py-2 text-[10px] font-black ${mode === "simple" ? "bg-white text-black" : "text-white/35"}`}>Simple</button>
          <button type="button" onClick={() => changeMode("advanced")} className={`rounded-lg px-3 py-2 text-[10px] font-black ${mode === "advanced" ? "bg-violet-300 text-black" : "text-white/35"}`}>Advanced</button>
        </div>
        <p className="mt-2 px-1 text-[10px] leading-4 text-white/25">Simple shows only what you use every day.</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">{simpleItems.map(navItem)}</div>
        {mode === "advanced" ? (
          <div className="mt-6">
            <p className="mb-2 px-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/25">More tools</p>
            <div className="space-y-1">{advancedItems.map(navItem)}</div>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <Link href="/" target="_blank" className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-3 text-xs font-bold text-white/55">
          <span>Open Store</span><span>↗</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-[160] hidden w-[224px] border-r border-white/[0.07] lg:block print:hidden">{sidebar}</aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-[180] bg-black/65 backdrop-blur-sm lg:hidden print:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[82vw] max-w-[280px]" onClick={(event) => event.stopPropagation()}>{sidebar}</aside>
        </div>
      ) : null}

      <div className="lg:pl-[224px]">
        <header className="sticky top-0 z-[140] border-b border-white/[0.07] bg-[#0b0c0e]/94 backdrop-blur-xl print:hidden">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
            <button type="button" onClick={() => setMobileOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-lg text-white/70 lg:hidden" aria-label="Open menu">☰</button>

            <div className="relative min-w-0 flex-1 sm:max-w-[520px]">
              <input
                ref={searchRef}
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
                placeholder="Search admin"
                className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 pr-12 text-sm font-medium text-white outline-none placeholder:text-white/25 focus:border-white/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white/25">⌘K</span>
              {searchOpen ? (
                <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-white/10 bg-[#151619] p-2 shadow-2xl">
                  {searchResults.map((item) => (
                    <button key={item.href} type="button" onClick={() => go(item.href)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white">
                      <span>{item.label}</span><span className="text-white/20">→</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => changeMode(mode === "simple" ? "advanced" : "simple")} className="hidden rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-black text-white/55 sm:block">
                {mode === "simple" ? "Advanced" : "Simple"}
              </button>
              <AdminNotifications />
              {mode === "advanced" ? <AdminOrvixAssistant /> : null}
              <div className="hidden md:block"><AdminChatNotifier /></div>
            </div>
          </div>
        </header>
        <div onClick={() => searchOpen && setSearchOpen(false)}>{children}</div>
      </div>
    </div>
  );
}
