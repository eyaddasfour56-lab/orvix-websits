"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta)) return "";
  const minutes = Math.max(0, Math.round(delta / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function dotClass(severity: string) {
  if (severity === "critical") return "bg-red-400";
  if (severity === "warning") return "bg-amber-300";
  if (severity === "success") return "bg-emerald-300";
  return "bg-sky-300";
}

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok || !result.success) return;
      setItems(Array.isArray(result.notifications) ? result.notifications : []);
      setUnread(Number(result.unread || 0));
    } catch {
      // The admin header stays usable if notifications are unavailable.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (open && containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function markRead(id?: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      if (id) {
        setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
        setUnread((current) => Math.max(0, current - 1));
      } else {
        setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
        setUnread(0);
      }
    } catch {
      // Keep the local state unchanged if marking read fails.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) void load(); }}
        aria-label={`Admin notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-sm text-white/65 hover:bg-white/[0.06] hover:text-white"
      >
        ♢
        {unread > 0 ? <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-[220] w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-white/10 bg-[#151619] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div><p className="text-sm font-black">Notifications</p><p className="mt-0.5 text-[10px] text-white/30">{unread} unread</p></div>
            {unread ? <button type="button" onClick={() => void markRead()} className="text-[10px] font-bold text-white/45 hover:text-white">Mark all read</button> : null}
          </div>
          <div className="max-h-[430px] overflow-y-auto p-2">
            {loading && items.length === 0 ? <p className="px-3 py-8 text-center text-xs text-white/30">Loading…</p> : null}
            {!loading && items.length === 0 ? <p className="px-3 py-8 text-center text-xs text-white/30">No notifications yet.</p> : null}
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.targetUrl || "/admin"}
                onClick={() => { setOpen(false); if (!item.readAt) void markRead(item.id); }}
                className={`mb-1 flex gap-3 rounded-xl p-3 transition hover:bg-white/[0.055] ${item.readAt ? "opacity-55" : "bg-white/[0.025]"}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(item.severity)}`} />
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-xs font-black text-white/80">{item.title}</p><span className="shrink-0 text-[9px] font-semibold text-white/20">{relativeTime(item.createdAt)}</span></div><p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/35">{item.body}</p></div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
