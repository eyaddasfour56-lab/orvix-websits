"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminAiToggle from "@/components/AdminAiToggle";
import AdminChatNotifier from "@/components/AdminChatNotifier";
import AdminNotifications from "@/components/AdminNotifications";
import AdminOrvixAssistant from "@/components/AdminOrvixAssistant";

type NavItem = { label: string; href: string; keywords: string; badge?: string };
type NavGroup = { label: string; items: NavItem[] };
type AdminMode = "simple" | "advanced";

const groups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { label: "Overview", href: "/admin", keywords: "home dashboard overview summary simple" },
      { label: "Orders & Tracking", href: "/admin/fulfillment", keywords: "orders preorder import egypt customs orvix handling fulfillment courier bosta live tracking pickup warehouse transit delivery", badge: "LIVE" },
      { label: "Legacy Orders", href: "/admin/legacy-orders", keywords: "legacy orders labels printing shipping" },
      { label: "Products & Stock", href: "/admin/products", keywords: "products price catalog fitbit garmin stock inventory quantity availability sale" },
      { label: "Pre-orders", href: "/admin/preorders", keywords: "preorder preorder eta lead time availability coming soon" },
      { label: "Commerce Control", href: "/admin/commerce", keywords: "health system checkout queue variants scheduled pricing rate limit reliability stock alerts kill switch" },
      { label: "Feature Flags", href: "/admin/features", keywords: "feature flags rollout switch experiment staged release" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Analytics", href: "/admin/analytics", keywords: "analytics conversion traffic visitors funnel sales add to cart checkout conversion" },
      { label: "Checkout Recovery", href: "/admin/recovery", keywords: "abandoned checkout recovery conversion sessions funnel" },
      { label: "Risk Center", href: "/admin/risk", keywords: "risk fraud suspicious duplicate repeated checkout order signals" },
      { label: "Discounts", href: "/admin/discounts", keywords: "discount coupon code offer promo" },
      { label: "Customers", href: "/admin/command-center/advanced#customers", keywords: "customers customer 360 vip returning" },
      { label: "Reviews", href: "/admin/reviews", keywords: "reviews ratings feedback" },
      { label: "Waitlist", href: "/admin/waitlist", keywords: "waitlist leads interest" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Cash Flow", href: "/admin/cashflow", keywords: "cash flow profit expense income partners money" },
      { label: "Quick Transfer", href: "/admin/cashflow/transfer", keywords: "transfer partner settlement" },
      { label: "Export Center", href: "/admin/export", keywords: "export csv backup orders products customers inventory audit cashflow" },
      { label: "Chats", href: "/admin/chats", keywords: "chat messages support customers" },
      { label: "Advanced", href: "/admin/command-center/advanced", keywords: "advanced returns audit roles funnel customers" },
    ],
  },
];

const simpleHrefs = new Set([
  "/admin",
  "/admin/fulfillment",
  "/admin/legacy-orders",
  "/admin/products",
  "/admin/analytics",
  "/admin/discounts",
  "/admin/cashflow",
  "/admin/chats",
]);

const allItems = groups.flatMap((group) => group.items);

function cleanHref(href: string) {
  return href.split("#")[0];
}

function isActive(pathname: string, href: string) {
  const clean = cleanHref(href);
  if (clean === "/admin") return pathname === "/admin";
  if (clean === "/admin/command-center") return pathname === "/admin/command-center";
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
    const savedMode = window.localStorage.getItem("orvix-admin-mode");
    if (savedMode === "simple" || savedMode === "advanced") {
      setMode(savedMode);
    }
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

  const visibleGroups = useMemo(() => {
    if (mode === "advanced") return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => simpleHrefs.has(cleanHref(item.href))),
      }))
      .filter((group) => group.items.length > 0);
  }, [mode]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allItems.slice(0, 7);
    return allItems
      .filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [search]);

  function go(href: string) {
    setSearchOpen(false);
    setSearch("");
    router.push(href);
  }

  function changeMode(nextMode: AdminMode) {
    setMode(nextMode);
    window.localStorage.setItem("orvix-admin-mode", nextMode);
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#111214] text-white">
      <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-black">O</span>
          <div className="min-w-0"><p className="truncate text-sm font-black tracking-[0.13em]">ORVIX</p><p className="text-[10px] font-semibold text-white/35">Commerce Admin</p></div>
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-white/45 hover:bg-white/[0.06] lg:hidden" aria-label="Close menu">×</button>
      </div>

      <div className="border-b border-white/[0.07] p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
          <button type="button" onClick={() => changeMode("simple")} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${mode === "simple" ? "bg-white text-black" : "text-white/38 hover:bg-white/[0.05] hover:text-white/70"}`}>Simple</button>
          <button type="button" onClick={() => changeMode("advanced")} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${mode === "advanced" ? "bg-violet-300 text-black" : "text-white/38 hover:bg-white/[0.05] hover:text-white/70"}`}>Advanced</button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/25">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${active ? "bg-white text-black shadow-sm" : "text-white/58 hover:bg-white/[0.055] hover:text-white"}`}>
                    <span>{item.label}</span>
                    {item.badge ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${active ? "bg-black/10" : "bg-white/10 text-white/55"}`}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/25">Store</p>
          <div className="mt-2 flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-white/75">ORVIX Store</p><p className="mt-0.5 text-[10px] text-emerald-300/65">Online</p></div><Link href="/" target="_blank" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white/55 hover:bg-white/[0.05]">View</Link></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-white">
      <aside className="fixed inset-y-0 left-0 z-[160] hidden w-[244px] border-r border-white/[0.07] lg:block print:hidden">{sidebar}</aside>
      {mobileOpen ? <div className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm lg:hidden print:hidden" onClick={() => setMobileOpen(false)}><aside className="h-full w-[86vw] max-w-[290px]" onClick={(event) => event.stopPropagation()}>{sidebar}</aside></div> : null}

      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-[140] border-b border-white/[0.07] bg-[#0b0c0e]/92 backdrop-blur-xl print:hidden">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:px-6">
            <button type="button" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-lg text-white/70 lg:hidden" aria-label="Open menu">☰</button>
            <div className="relative min-w-0 flex-1 sm:max-w-[520px]">
              <input ref={searchRef} value={search} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} placeholder="Search admin" className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 pr-14 text-sm font-medium text-white outline-none transition placeholder:text-white/25 focus:border-white/20 focus:bg-white/[0.05]" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/25">⌘K</span>
              {searchOpen ? <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-white/10 bg-[#151619] p-2 shadow-2xl"><p className="px-2 pb-1.5 pt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">Jump to</p>{searchResults.length ? searchResults.map((item) => <button key={item.href} type="button" onClick={() => go(item.href)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white/65 hover:bg-white/[0.06] hover:text-white"><span>{item.label}</span><span className="text-[10px] text-white/20">→</span></button>) : <p className="px-3 py-4 text-xs text-white/30">No admin page found.</p>}</div> : null}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 md:flex">
                <button type="button" onClick={() => changeMode("simple")} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black transition ${mode === "simple" ? "bg-white text-black" : "text-white/32 hover:text-white/70"}`}>Simple</button>
                <button type="button" onClick={() => changeMode("advanced")} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black transition ${mode === "advanced" ? "bg-violet-300 text-black" : "text-white/32 hover:text-white/70"}`}>Advanced</button>
              </div>
              <AdminNotifications />
              <AdminOrvixAssistant />
              <div className="hidden sm:block"><AdminAiToggle /></div>
              <div className="hidden md:block"><AdminChatNotifier /></div>
            </div>
          </div>
        </header>
        <div onClick={() => searchOpen && setSearchOpen(false)}>{children}</div>
      </div>
    </div>
  );
}
