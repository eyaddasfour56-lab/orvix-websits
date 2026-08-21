"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AdminCustomerSummary from "@/components/AdminCustomerSummary";
import OrvixAiPanel from "./OrvixAiPanel";

type AlertItem = { id: string; title: string; body: string; targetUrl: string };
type Dashboard = {
  today: { orders: number; sales: number; deliveredSales: number; profit: number; waitingConfirmation: number; unreadChats: number };
  allTime: { deliveredSales: number; realProfit: number };
  summaryText: string;
  alerts: AlertItem[];
  stats: { lowStock: number; unreadChats: number; waitingChats: number; missingExpensePayer: number; returns: number };
};
type DashboardResult = { success?: boolean; message?: string; dashboard?: Dashboard };
type ViewsResult = { success?: boolean; totalViews?: number; viewsToday?: number; uniqueVisitorsToday?: number };

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })} EGP`;
}

export default function AdminHomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [viewsToday, setViewsToday] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHome(silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const overviewResponse = await fetch("/api/admin/os", { cache: "no-store", credentials: "same-origin" });
      if (overviewResponse.status === 401) {
        setAuthenticated(false);
        setDashboard(null);
        return;
      }
      const overview = (await overviewResponse.json()) as DashboardResult;
      if (!overviewResponse.ok || !overview.success || !overview.dashboard) throw new Error(overview.message || "Could not load admin.");
      setAuthenticated(true);
      setDashboard(overview.dashboard);

      const viewsResponse = await fetch("/api/admin/views", { cache: "no-store", credentials: "same-origin" });
      if (viewsResponse.ok) {
        const views = (await viewsResponse.json()) as ViewsResult;
        if (views.success) setViewsToday(Number(views.viewsToday || 0));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load admin.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
    const interval = window.setInterval(() => void loadHome(true), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim() || loginLoading) return;
    setLoginLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) throw new Error(result.message || "Incorrect password.");
      setPassword("");
      await loadHome();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not sign in.");
    } finally {
      setLoginLoading(false);
    }
  }

  if (loading && authenticated === null) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#0b0c0e] text-white"><p className="text-sm font-semibold text-white/35">Loading admin…</p></main>;
  }

  if (authenticated === false) {
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#0b0c0e] px-4 text-white">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-[28px] border border-white/[0.09] bg-white/[0.03] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">ORVIX ADMIN</p>
          <h1 className="mt-3 text-3xl font-black">Sign in</h1>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password" className="mt-6 h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold outline-none placeholder:text-white/20" />
          {error ? <p className="mt-3 text-xs font-bold text-red-200">{error}</p> : null}
          <button disabled={loginLoading || !password.trim()} className="mt-4 h-12 w-full rounded-2xl bg-white text-sm font-black text-black disabled:opacity-40">{loginLoading ? "Signing in…" : "Open Admin"}</button>
        </form>
      </main>
    );
  }

  if (!dashboard) {
    return <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] p-6 text-red-200">{error || "Admin unavailable."}</main>;
  }

  const attention = dashboard.alerts.slice(0, 3);
  const quick = [
    { title: "Orders", text: "Change status, open an order, send to courier.", href: "/admin/fulfillment" },
    { title: "Customers", text: "Registered accounts, emails and phone numbers.", href: "/admin/customers" },
    { title: "Messages", text: "Customer chats and support replies.", href: "/admin/chats" },
    { title: "Money", text: "Sales, profit and expenses.", href: "/admin/cashflow" },
  ];

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">HOME</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Today at ORVIX</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/36">Orders, customers and messages in one simple place.</p>
          </div>
          <Link href="/admin/command-center/advanced" className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-[10px] font-black text-white/50">Advanced tools →</Link>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-semibold text-red-100">{error}</p> : null}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Views today", viewsToday.toLocaleString("en-GB")],
            ["Orders today", String(dashboard.today.orders)],
            ["Sales today", money(dashboard.today.sales)],
            ["Profit today", money(dashboard.today.profit)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-4 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/25">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.03em]">{value}</p>
            </article>
          ))}
        </section>

        <AdminCustomerSummary />

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map((item) => (
            <Link key={item.title} href={item.href} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:bg-white/[0.05]">
              <div className="flex items-center justify-between"><h2 className="text-lg font-black">{item.title}</h2><span className="text-white/25 transition group-hover:translate-x-1 group-hover:text-white/60">→</span></div>
              <p className="mt-2 text-xs font-medium leading-5 text-white/32">{item.text}</p>
            </Link>
          ))}
        </section>

        <OrvixAiPanel onActionComplete={() => loadHome(true)} />

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25">Needs attention</p><h2 className="mt-1 text-lg font-black">Only important things</h2></div>
            <button type="button" onClick={() => void loadHome()} className="rounded-lg border border-white/10 px-3 py-2 text-[9px] font-black text-white/45">Refresh</button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {attention.length ? attention.map((alert) => (
              <Link key={alert.id} href={alert.targetUrl || "/admin"} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                <p className="text-xs font-black text-white/75">{alert.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/30">{alert.body}</p>
              </Link>
            )) : <p className="text-sm font-semibold text-emerald-200/70">Nothing urgent right now.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
