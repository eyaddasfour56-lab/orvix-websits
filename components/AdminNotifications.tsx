"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminNotifications() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/admin/notifications", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const result = await response.json();
        if (active && response.ok && result.success) {
          setUnread(Math.max(0, Number(result.unread || 0)));
        }
      } catch {
        // The admin header stays usable when notification polling is unavailable.
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/admin/notifications"
      aria-label={`Open notification center${unread ? `, ${unread} unread` : ""}`}
      title="Notification Center"
      className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
    >
      ♢
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
