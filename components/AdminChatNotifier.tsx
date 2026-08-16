"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  customerName: string;
  lastMessagePreview: string;
  lastSender?: "customer" | "admin" | "system" | null;
  lastMessageAt: string;
  humanRequested?: boolean;
  humanRequestedAt?: string | null;
  humanRequestReason?: string;
};

type InboxResult = {
  success?: boolean;
  conversations?: Conversation[];
};

type Toast = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  conversationId: string;
  urgent?: boolean;
};

export default function AdminChatNotifier() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSeenRef = useRef<Record<string, number>>({});
  const humanSeenRef = useRef<Record<string, number>>({});
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
        const currentHumanMap: Record<string, number> = {};

        for (const item of result.conversations) {
          const timestamp = new Date(item.lastMessageAt).getTime();
          if (!Number.isFinite(timestamp)) continue;

          const humanTimestamp = item.humanRequestedAt
            ? new Date(item.humanRequestedAt).getTime()
            : 0;

          currentMap[item.id] = timestamp;
          currentHumanMap[item.id] = Number.isFinite(humanTimestamp) ? humanTimestamp : 0;

          if (!initializedRef.current) continue;

          const previous = lastSeenRef.current[item.id] || 0;
          const previousHuman = humanSeenRef.current[item.id] || 0;
          const isNewCustomerMessage =
            item.lastSender === "customer" && timestamp > previous;
          const isNewHumanRequest =
            Boolean(item.humanRequested) && humanTimestamp > previousHuman;

          if (!isNewCustomerMessage && !isNewHumanRequest) continue;

          const toastId = `${item.id}-${Math.max(timestamp, humanTimestamp)}`;
          const toast: Toast = isNewHumanRequest
            ? {
                id: toastId,
                eyebrow: "WANTS CUSTOMER SERVICE",
                title: `${item.customerName} wants to speak with you`,
                body:
                  item.humanRequestReason ||
                  item.lastMessagePreview ||
                  "Customer requested a human support agent.",
                conversationId: item.id,
                urgent: true,
              }
            : {
                id: toastId,
                eyebrow: "NEW CUSTOMER MESSAGE",
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
          }, 9000);

          if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(toast.title, {
              body: toast.body,
              tag: isNewHumanRequest
                ? `orvix-human-${item.id}`
                : `orvix-chat-${item.id}`,
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
        humanSeenRef.current = currentHumanMap;
        initializedRef.current = true;
      } catch {
        // Keep the admin usable even if notification polling briefly fails.
      }
    }

    void poll();
    const interval = window.setInterval(poll, 3500);

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

      <div className="pointer-events-none fixed right-4 top-20 z-[150] flex w-[min(92vw,380px)] flex-col gap-2 print:hidden">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => openConversation(toast.conversationId)}
            className={`pointer-events-auto rounded-2xl border p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition ${
              toast.urgent
                ? "border-amber-400/30 bg-[#21180a] hover:border-amber-300/45 hover:bg-[#291e0c]"
                : "border-blue-400/20 bg-[#10141d] hover:border-blue-400/35 hover:bg-[#141a25]"
            }`}
          >
            <p
              className={`text-xs font-black uppercase tracking-[0.14em] ${
                toast.urgent ? "text-amber-300" : "text-blue-300/70"
              }`}
            >
              {toast.eyebrow}
            </p>
            <p className="mt-1 font-black text-white">{toast.title}</p>
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-white/60">
              {toast.body}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}
