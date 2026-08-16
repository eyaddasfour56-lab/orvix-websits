"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type ChatApiResult = {
  success?: boolean;
  messages?: ChatMessage[];
};

const TOKEN_KEY = "orvix_customer_chat_token";
const SEEN_KEY = "orvix_customer_chat_seen_admin_at";

export default function CustomerServiceChat() {
  const pathname = usePathname();
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const hidden =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/under-construction");

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token || hidden) return;

    let cancelled = false;

    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/chat?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const result = (await response.json()) as ChatApiResult;

        if (response.status === 404 || response.status === 400) {
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(SEEN_KEY);
          setToken("");
          setMessages([]);
          return;
        }

        if (!response.ok || !result.success || cancelled) return;
        setMessages(result.messages || []);
      } catch {
        // Keep the store usable if background chat polling briefly fails.
      }
    }

    void loadMessages();
    const interval = window.setInterval(loadMessages, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hidden, token]);

  const latestAdminMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.sender === "admin") || null,
    [messages]
  );

  const hasUnread = useMemo(() => {
    if (!latestAdminMessage) return false;

    const latestValue = new Date(latestAdminMessage.created_at).getTime();
    const seenValue = Number(
      typeof window !== "undefined"
        ? window.localStorage.getItem(SEEN_KEY) || 0
        : 0
    );

    return Number.isFinite(latestValue) && latestValue > seenValue;
  }, [latestAdminMessage]);

  if (hidden) return null;

  return (
    <Link
      href="/chat"
      className="fixed bottom-5 right-5 z-[110] inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-[#090909] px-5 py-3.5 text-sm font-black text-white shadow-[0_16px_45px_rgba(0,0,0,0.38)] transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-[#111] sm:bottom-6 sm:right-6"
      aria-label="Open ORVIX customer service chat"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
      </span>
      <span>Chat with us</span>
      {hasUnread && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#050505] bg-red-500 px-1 text-[10px] font-black text-white">
          1
        </span>
      )}
    </Link>
  );
}
