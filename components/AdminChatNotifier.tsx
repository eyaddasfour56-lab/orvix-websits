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

type Order = {
  id: string;
  order_number?: string;
  customer_name?: string;
  total_price?: number | string;
  quantity?: number;
  product_name?: string;
  created_at?: string;
};

type Toast = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  url: string;
  urgent?: boolean;
  order?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function money(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toLocaleString("en-GB") : "0";
}

export default function AdminChatNotifier() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [pushReady, setPushReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSeenRef = useRef<Record<string, number>>({});
  const humanSeenRef = useRef<Record<string, number>>({});
  const orderSeenRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);
  const ordersInitializedRef = useRef(false);

  function addToast(toast: Toast) {
    setToasts((current) => {
      if (current.some((existing) => existing.id === toast.id)) return current;
      return [...current.slice(-2), toast];
    });
    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== toast.id));
    }, 9000);
  }

  async function setupPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    try {
      const keyResponse = await fetch("/api/admin/push", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const keyResult = await keyResponse.json();
      if (!keyResponse.ok || !keyResult?.publicKey) return false;

      const registration = await navigator.serviceWorker.register("/orvix-admin-sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(String(keyResult.publicKey)),
        });
      }

      const json = subscription.toJSON();
      const saveResponse = await fetch("/api/admin/push", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: json.keys || {},
        }),
      });

      const ready = saveResponse.ok;
      setPushReady(ready);
      return ready;
    } catch (error) {
      console.error("ORVIX push setup failed:", error);
      setPushReady(false);
      return false;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
    if (Notification.permission === "granted") {
      void setupPush();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollChats() {
      try {
        const response = await fetch("/api/admin/chat", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const result = await response.json();
        const conversations = (result?.conversations || []) as Conversation[];
        if (cancelled) return;

        const currentMap: Record<string, number> = {};
        const currentHumanMap: Record<string, number> = {};

        for (const item of conversations) {
          const timestamp = new Date(item.lastMessageAt).getTime();
          if (!Number.isFinite(timestamp)) continue;
          const humanTimestamp = item.humanRequestedAt ? new Date(item.humanRequestedAt).getTime() : 0;
          currentMap[item.id] = timestamp;
          currentHumanMap[item.id] = Number.isFinite(humanTimestamp) ? humanTimestamp : 0;

          if (!initializedRef.current) continue;
          const isNewCustomerMessage = item.lastSender === "customer" && timestamp > (lastSeenRef.current[item.id] || 0);
          const isNewHumanRequest = Boolean(item.humanRequested) && humanTimestamp > (humanSeenRef.current[item.id] || 0);
          if (!isNewCustomerMessage && !isNewHumanRequest) continue;

          const toast: Toast = isNewHumanRequest
            ? {
                id: `human-${item.id}-${humanTimestamp}`,
                eyebrow: "HUMAN SUPPORT REQUESTED",
                title: `${item.customerName} wants Customer Service`,
                body: item.humanRequestReason || item.lastMessagePreview || "Customer requested a human agent.",
                url: `/admin/chats?conversation=${encodeURIComponent(item.id)}`,
                urgent: true,
              }
            : {
                id: `chat-${item.id}-${timestamp}`,
                eyebrow: "NEW CUSTOMER MESSAGE",
                title: `Message from ${item.customerName}`,
                body: item.lastMessagePreview || "New customer message",
                url: `/admin/chats?conversation=${encodeURIComponent(item.id)}`,
              };

          addToast(toast);

          if (!pushReady && "Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(toast.title, { body: toast.body, tag: toast.id, icon: "/logo.jpeg" });
            notification.onclick = () => {
              window.focus();
              window.location.assign(toast.url);
              notification.close();
            };
          }
        }

        lastSeenRef.current = currentMap;
        humanSeenRef.current = currentHumanMap;
        initializedRef.current = true;
      } catch {}
    }

    async function pollOrders() {
      try {
        const response = await fetch("/api/admin/orders", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok) return;
        const result = await response.json();
        const orders = (result?.orders || []) as Order[];
        if (cancelled) return;

        const currentMap: Record<string, number> = {};
        for (const order of orders.slice(0, 60)) {
          const timestamp = new Date(order.created_at || "").getTime();
          if (!order.id || !Number.isFinite(timestamp)) continue;
          currentMap[order.id] = timestamp;
          if (!ordersInitializedRef.current || timestamp <= (orderSeenRef.current[order.id] || 0)) continue;

          const orderNumber = order.order_number || "New order";
          const toast: Toast = {
            id: `order-${order.id}-${timestamp}`,
            eyebrow: "ORDER PLACED",
            title: `🛍️ ${money(order.total_price)} EGP · ${orderNumber}`,
            body: `${order.customer_name || "Customer"} placed ${Number(order.quantity || 1)}× ${order.product_name || "ORVIX product"}.`,
            url: `/admin?order=${encodeURIComponent(orderNumber)}`,
            order: true,
          };
          addToast(toast);

          if (!pushReady && "Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(toast.title, { body: toast.body, tag: toast.id, icon: "/logo.jpeg" });
            notification.onclick = () => {
              window.focus();
              window.location.assign(toast.url);
              notification.close();
            };
          }
        }
        orderSeenRef.current = currentMap;
        ordersInitializedRef.current = true;
      } catch {}
    }

    void pollChats();
    void pollOrders();
    const interval = window.setInterval(() => {
      void pollChats();
      void pollOrders();
    }, 3500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pushReady]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const next = await Notification.requestPermission();
    setPermission(next);
    if (next === "granted") await setupPush();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void enableNotifications()}
        disabled={permission === "unsupported"}
        className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
          permission === "granted" && pushReady
            ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200"
            : permission === "denied"
              ? "border-red-400/20 bg-red-500/[0.08] text-red-200"
              : "border-blue-400/20 bg-blue-500/[0.08] text-blue-200 hover:bg-blue-500/[0.14]"
        }`}
      >
        {permission === "granted" && pushReady
          ? "Push Notifications On"
          : permission === "denied"
            ? "Notifications Blocked"
            : permission === "unsupported"
              ? "Notifications Unavailable"
              : permission === "granted"
                ? "Connect Push"
                : "Enable Notifications"}
      </button>

      <div className="pointer-events-none fixed right-4 top-20 z-[150] flex w-[min(92vw,390px)] flex-col gap-2 print:hidden">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => window.location.assign(toast.url)}
            className={`pointer-events-auto rounded-2xl border p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition ${
              toast.urgent
                ? "border-amber-400/30 bg-[#21180a]"
                : toast.order
                  ? "border-emerald-400/25 bg-[#0b1d16]"
                  : "border-blue-400/20 bg-[#10141d]"
            }`}
          >
            <p className={`text-xs font-black uppercase tracking-[0.14em] ${toast.urgent ? "text-amber-300" : toast.order ? "text-emerald-300" : "text-blue-300/70"}`}>
              {toast.eyebrow}
            </p>
            <p className="mt-1 font-black text-white">{toast.title}</p>
            <p className="mt-1 line-clamp-3 text-sm leading-5 text-white/60">{toast.body}</p>
          </button>
        ))}
      </div>
    </>
  );
}
