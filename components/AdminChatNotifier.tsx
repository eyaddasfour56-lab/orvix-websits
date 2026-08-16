"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  customerName: string;
  lastMessagePreview: string;
  lastSender?: "customer" | "admin" | "system" | null;
  lastMessageAt: string;
};

type InboxResult = {
  success?: boolean;
  conversations?: Conversation[];
};

type Toast = {
  id: string;
  title: string;
  body: string;
  conversationId: string;
};

export default function AdminChatNotifier() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSeenRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/admin/chat", {
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) return;

        const result = (await response.json()) as InboxResult;
        if (!result.success || !result.conversations || cancelled) return;

        const currentMap: Record<string, number> = {};

        for (const item of result.conversations) {
          const timestamp = new Date(item.lastMessageAt).getTime();
          if (!Number.isFinite(timestamp)) continue;

          currentMap[item.id] = timestamp;

          if (!initializedRef.current) continue;

          const previous = lastSeenRef.current[item.id] || 0;
          const isNewCustomerMessage =
            item.lastSender === "customer" && timestamp > previous;

          if (!isNewCustomerMessage) continue;

          const toastId = `${item.id}-${timestamp}`;
          const toast: Toast = {
            id: toastId,
            title: `New message from ${item.customerName}`,
            body: item.lastMessagePreview || "New customer message",
            conversationId: item.id,
          };

          setToasts((current) => {
            if (current.some((existing) => existing.id === toastId)) return current;
            return [...current.slice(-2), toast];
          });

          window.setTimeout(() => {
            setToasts((current) => current.filter((entry) => entry.id !== toastId));
          }, 7000);

          if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(toast.title, {
              body: toast.body,
              tag: `orvix-chat-${item.id}`,
            });

            notification.onclick = () => {
              window.focus();
              window.location.assign(
                `/admin/chats?conversation=${encodeURIComponent(item.id)}`
              );
              notification.close();
            };
          }
        }

        lastSeenRef.current = currentMap;
        initializedRef.current = true;
      } catch {
        // Keep the admin usable even if notification polling briefly fails.
      }
    }

    void poll();
    const interval = window.setInterval(poll, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    const next = await Notification.requestPermission();
    setPermission(next);
  }

  function openConversation(conversationId: string) {
    window.location.assign(
      `/admin/chats?conversation=${encodeURIComponent(conversationId)}`
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void enableNotifications()}
        disabled={permission === "granted" || permission === "unsupported"}
        className={`rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-default ${
          permission === "granted"
            ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200"
            : permission === "denied"
              ? "border-red-400/20 bg-red-500/[0.08] text-red-200"
              : permission === "unsupported"
                ? "border-white/10 bg-white/[0.04] text-white/30"
                : "border-blue-400/20 bg-blue-500/[0.08] text-blue-200 hover:bg-blue-500/[0.14]"
        }`}
      >
        {permission === "granted"
          ? "Notifications On"
          : permission === "denied"
            ? "Notifications Blocked"
            : permission === "unsupported"
              ? "Notifications Unavailable"
              : "Enable Notifications"}
      </button>

      <div className="pointer-events-none fixed right-4 top-20 z-[150] flex w-[min(92vw,360px)] flex-col gap-2 print:hidden">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => openConversation(toast.conversationId)}
            className="pointer-events-auto rounded-2xl border border-blue-400/20 bg-[#10141d] p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.4)] transition hover:border-blue-400/35 hover:bg-[#141a25]"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-300/70">
              New Customer Message
            </p>
            <p className="mt-1 font-black text-white">{toast.title}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/55">
              {toast.body}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
