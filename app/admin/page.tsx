"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import OrvixAiPanel from "./OrvixAiPanel";

type AlertItem = {
  id: string;
  severity: "info" | "warning" | "critical" | "success";
  title: string;
  body: string;
  targetUrl: string;
};

type Dashboard = {
  today: {
    orders: number;
    sales: number;
    deliveredSales: number;
    profit: number;
    waitingConfirmation: number;
    unreadChats: number;
  };
  allTime: {
    deliveredSales: number;
    realProfit: number;
  };
  summaryText: string;
  alerts: AlertItem[];
  stats: {
    lowStock: number;
    unreadChats: number;
    waitingChats: number;
    missingExpensePayer: number;
    returns: number;
  };
};

type DashboardResult = {
  success?: boolean;
  message?: string;
  dashboard?: Dashboard;
};

type ViewsResult = {
  success?: boolean;
  totalViews?: number;
  viewsToday?: number;
  uniqueVisitorsToday?: number;
};

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return `${(Number.isFinite(parsed) ? parsed : 0).toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function MetricCard({ label, value, note, href }: { label: string; value: string; note: string; href: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/30">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-white sm:text-[28px]">{value}</p>
          <p className="mt-1.5 text-[11px] font-semibold text-white/30">{note}</p>
        </div>
        <Link href={href} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-white/38 transition hover:bg-white/[0.07] hover:text-white/70">
          Advanced
        </Link>
      </div>
    </article>
  );
}

export default function AdminHomePage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [viewsToday, setViewsToday] = useState(0);
  const [uniqueVisitorsToday, setUniqueVisitorsToday] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHome(silent = false) {
    if (!silent) setLoading(true);
    setError("");

    try {
      const overviewResponse = await fetch("/api/admin/os", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (overviewResponse.status === 401) {
        setAuthenticated(false);
        setDashboard(null);
        return;
      }

      const overview = (await overviewResponse.json()) as DashboardResult;
      if (!overviewResponse.ok || !overview.success || !overview.dashboard) {
        throw new Error(overview.message || "Could not load ORVIX admin home.");
      }

      setAuthenticated(true);
      setDashboard(overview.dashboard);

      const viewsResponse = await fetch("/api/admin/views", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (viewsResponse.ok) {
        const views = (await viewsResponse.json()) as ViewsResult;
        if (views.success) {
          setTotalViews(Number(views.totalViews || 0));
          setViewsToday(Number(views.viewsToday || 0));
          setUniqueVisitorsToday(Number(views.uniqueVisitorsToday || 0));
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load ORVIX admin home.");
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
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#0b0c0e] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
          <p className="mt-4 text-sm font-semibold text-white/35">Loading ORVIX…</p>
        </div>
      </main>
    );
  }

  if (authenticated === false) {
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#0b0c0e] px-4 py-10 text-white">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-[28px] border border-white/[0.09] bg-white/[0.03] p-6 shadow-2xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">ORVIX ADMIN</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Welcome back.</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/35">Sign in to open your live business summary and ORVIX AI.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            className="mt-7 h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/20 focus:border-white/25"
          />
          {error ? <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-xs font-bold text-red-100">{error}</p> : null}
          <button disabled={loginLoading || !password.trim()} className="mt-4 h-12 w-full rounded-2xl bg-white text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-40">
            {loginLoading ? "Signing in…" : "Open Admin"}
          </button>
        </form>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-5 text-sm font-semibold text-red-100">{error || "ORVIX admin home is unavailable."}</div>
      </main>
    );
  }

  const alerts = dashboard.alerts.slice(0, 4);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1240px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">ORVIX ADMIN · SIMPLE HOME</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">What matters right now.</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/38">{dashboard.summaryText}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-[11px] font-black text-black">Simple</span>
            <Link href="/admin/command-center/advanced" className="inline-flex h-10 items-center rounded-xl border border-violet-300/20 bg-violet-500/[0.08] px-4 text-[11px] font-black text-violet-100 transition hover:bg-violet-500/[0.14]">Advanced</Link>
            <Link href="/admin/command-center" className="inline-flex h-10 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-[11px] font-black text-white/55 transition hover:bg-white/[0.06] hover:text-white">Full Admin</Link>
          </div>
        </header>

        {error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm font-semibold text-red-100">{error}</div> : null}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Views today" value={viewsToday.toLocaleString("en-GB")} note={`${uniqueVisitorsToday.toLocaleString("en-GB")} unique · ${totalViews.toLocaleString("en-GB")} all time`} href="/admin/analytics" />
          <MetricCard label="Orders today" value={String(dashboard.today.orders)} note={`${dashboard.today.waitingConfirmation} pre-orders need attention`} href="/admin/fulfillment" />
          <MetricCard label="Sales today" value={money(dashboard.today.sales)} note="Orders placed today" href="/admin/analytics" />
          <MetricCard label="Profit today" value={money(dashboard.today.profit)} note="Delivered real profit" href="/admin/cashflow" />
          <MetricCard label="Low stock" value={String(dashboard.stats.lowStock)} note="Products needing attention" href="/admin/inventory" />
          <MetricCard label="Chats" value={String(dashboard.today.unreadChats)} note={`${dashboard.stats.waitingChats} waiting`} href="/admin/chats" />
        </section>

        <OrvixAiPanel onActionComplete={() => loadHome(true)} />

        <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Orders & Tracking", text: `${dashboard.today.orders} today · supplier, ORVIX and live courier journey`, href: "/admin/fulfillment" },
            { title: "Products & Stock", text: `${dashboard.stats.lowStock} low-stock products`, href: "/admin/products" },
            { title: "Courier Tracking", text: "One-click Bosta dispatch and live shipment tracking", href: "/admin/fulfillment" },
            { title: "Finance", text: `${money(dashboard.allTime.realProfit)} all-time real profit`, href: "/admin/cashflow" },
            { title: "Customers", text: "Customer 360, repeat buyers and VIPs", href: "/admin/command-center/advanced#customers" },
            { title: "Analytics", text: `${viewsToday.toLocaleString("en-GB")} views today`, href: "/admin/analytics" },
            { title: "Support", text: `${dashboard.today.unreadChats} unread customer chats`, href: "/admin/chats" },
            { title: "Marketing", text: "Discounts, recovery and growth controls", href: "/admin/discounts" },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-sm font-black text-white">{item.title}</p>
              <p className="mt-1.5 min-h-10 text-xs font-medium leading-5 text-white/34">{item.text}</p>
              <div className="mt-4 flex gap-2">
                <Link href={item.href} className="inline-flex h-9 items-center rounded-xl bg-white px-3 text-[10px] font-black text-black">Open</Link>
                <Link href={item.href} className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[10px] font-black text-white/48">Advanced</Link>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/28">Needs attention</p>
              <h2 className="mt-1 text-lg font-black">Main points only</h2>
            </div>
            <Link href="/admin/command-center/advanced" className="text-[10px] font-black text-violet-200/70 hover:text-violet-100">See every detail →</Link>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {alerts.length ? alerts.map((alert) => (
              <Link key={alert.id} href={alert.targetUrl || "/admin/command-center/advanced"} className="rounded-xl border border-white/[0.07] bg-black/20 p-3 transition hover:bg-white/[0.04]">
                <p className="text-xs font-black text-white/75">{alert.title}</p>
                <p className="mt-1 text-[11px] font-medium leading-5 text-white/32">{alert.body}</p>
              </Link>
            )) : <p className="text-sm font-semibold text-emerald-200/70">Everything looks clear right now.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
