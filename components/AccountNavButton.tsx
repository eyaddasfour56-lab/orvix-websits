"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

export default function AccountNavButton() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const supabase = getCustomerSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    setLoggedIn(Boolean(session));

    if (!session?.access_token) {
      setUnread(0);
      return;
    }

    try {
      const response = await fetch("/api/account/overview", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const result = await response.json();
      setUnread(Math.max(0, Number(result?.unreadMessages || 0)));
    } catch {
      // Account badge is a convenience; navigation should stay usable offline.
    }
  }, []);

  useEffect(() => {
    const supabase = getCustomerSupabaseBrowser();
    void refresh();

    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refresh(), 0);
    });
    const timer = window.setInterval(() => void refresh(), 30000);
    const onChanged = () => void refresh();
    window.addEventListener("orvix-auth-changed", onChanged);

    return () => {
      data.subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("orvix-auth-changed", onChanged);
    };
  }, [refresh]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/account")) return null;

  const label = loggedIn
    ? language === "ar" ? "حسابي" : "My Account"
    : language === "ar" ? "تسجيل الدخول" : "Log In";

  return (
    <Link
      href={loggedIn ? "/account" : "/account/login"}
      aria-label={label}
      title={label}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#0c0d0f]/95 text-white shadow-2xl backdrop-blur transition hover:bg-[#17181b]"
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20C5.7 15.9 8.1 14 12 14C15.9 14 18.3 15.9 19 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {loggedIn ? <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400" /> : null}
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[9px] font-black text-black">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
