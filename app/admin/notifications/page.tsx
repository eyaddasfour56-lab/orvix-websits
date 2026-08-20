"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  targetUrl: string;
  severity: string;
  createdAt: string;
  readAt?: string | null;
};

type Filter = "all" | "unread" | "critical" | "warning";

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function tone(value: string) {
  if (value === "critical") return "border-red-400/20 bg-red-500/[0.07]";
  if (value === "warning") return "border-amber-300/20 bg-amber-500/[0.06]";
  if (value === "success") return "border-emerald-300/20 bg-emerald-500/[0.06]";
  return "border-sky-300/15 bg-sky-500/[0.045]";
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load notifications.");
      setItems(Array.isArray(result.notifications) ? result.notifications : []);
      setUnread(Number(result.unread || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  async function markRead(id?: string) {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    const stamp = new Date().toISOString();
    if (id) {
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt || stamp } : item));
      setUnread((current) => Math.max(0, current - 1));
    } else {
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || stamp })));
      setUnread(0);
    }
  }

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === "unread") return !item.readAt;
    if (filter === "critical") return item.severity === "critical";
    if (filter === "warning") return item.severity === "warning";
    return true;
  }), [filter, items]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/28">ORVIX ADMIN</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">Notification Center</h1>
          <p className="mt-2 text-sm font-medium text-white/38">Every alert opens its own relevant admin page. No notification popups.</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && <button type="button" onClick={() => void markRead()} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/65">Mark all read</button>}
          <button type="button" onClick={() => void load()} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black">Refresh</button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["all", "unread", "critical", "warning"] as Filter[]).map((value) => {
          const count = value === "all" ? items.length : value === "unread" ? unread : items.filter((item) => item.severity === value).length;
          return <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-2xl border p-4 text-left transition ${filter === value ? "border-white/25 bg-white/[0.08]" : "border-white/[0.07] bg-white/[0.025]"}`}><p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/30">{value}</p><p className="mt-2 text-2xl font-black text-white">{count}</p></button>;
        })}
      </section>

      {error && <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4 text-sm font-bold text-red-100">{error}</p>}

      <section className="mt-5 space-y-3">
        {loading && items.length === 0 && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-10 text-center text-sm text-white/30">Loading notifications…</div>}
        {!loading && filtered.length === 0 && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-10 text-center text-sm text-white/30">Nothing in this filter.</div>}
        {filtered.map((item) => (
          <Link
            key={item.id}
            href={item.targetUrl || "/admin/command-center"}
            onClick={() => { if (!item.readAt) void markRead(item.id); }}
            className={`block rounded-2xl border p-4 transition hover:translate-y-[-1px] hover:border-white/20 sm:p-5 ${tone(item.severity)} ${item.readAt ? "opacity-55" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">{item.severity}</span>{!item.readAt && <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-black">NEW</span>}</div>
                <h2 className="mt-3 text-base font-black text-white">{item.title}</h2>
                <p className="mt-1.5 text-sm font-medium leading-6 text-white/48">{item.body}</p>
              </div>
              <div className="shrink-0 text-right"><p className="text-[10px] font-semibold text-white/25">{when(item.createdAt)}</p><p className="mt-3 text-xs font-black text-white/55">Open →</p></div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
