"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type ChatSession = {
  customerName: string;
  status: "open" | "closed";
  createdAt: string;
};

type ChatApiResult = {
  success?: boolean;
  message?: string | ChatMessage;
  token?: string;
  session?: ChatSession;
  messages?: ChatMessage[];
};

const TOKEN_KEY = "orvix_customer_chat_token";
const SEEN_KEY = "orvix_customer_chat_seen_admin_at";

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerServiceChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const hidden = pathname?.startsWith("/admin") || pathname?.startsWith("/under-construction");

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) || "";
    setToken(storedToken);
    setReady(true);
  }, []);

  const latestAdminMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((item) => item.sender === "admin") || null,
    [messages]
  );

  useEffect(() => {
    if (!latestAdminMessage) {
      setHasUnread(false);
      return;
    }

    const seenValue = Number(window.localStorage.getItem(SEEN_KEY) || 0);
    const latestValue = new Date(latestAdminMessage.created_at).getTime();

    if (isOpen) {
      if (Number.isFinite(latestValue)) {
        window.localStorage.setItem(SEEN_KEY, String(latestValue));
      }
      setHasUnread(false);
    } else {
      setHasUnread(Number.isFinite(latestValue) && latestValue > seenValue);
    }
  }, [isOpen, latestAdminMessage]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
  }, [isOpen, messages.length]);

  async function loadChat(currentToken = token, quiet = false) {
    if (!currentToken) return;
    if (!quiet) setLoading(true);

    try {
      const response = await fetch(
        `/api/chat?token=${encodeURIComponent(currentToken)}`,
        { cache: "no-store" }
      );
      const result = (await response.json()) as ChatApiResult;

      if (response.status === 404 || response.status === 400) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(SEEN_KEY);
        setToken("");
        setSession(null);
        setMessages([]);
        return;
      }

      if (!response.ok || !result.success || !result.session) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not load customer service chat."
        );
      }

      setSession(result.session);
      setMessages(result.messages || []);
      setError("");
    } catch (loadError) {
      if (!quiet) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load customer service chat."
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !token) return;
    void loadChat(token, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token]);

  useEffect(() => {
    if (!token) return;

    const delay = isOpen ? 3000 : 8000;
    const interval = window.setInterval(() => {
      void loadChat(token, true);
    }, delay);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isOpen]);

  async function startChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          customerName: name,
          customerPhone: phone,
        }),
      });
      const result = (await response.json()) as ChatApiResult;

      if (!response.ok || !result.success || !result.token) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not start chat."
        );
      }

      window.localStorage.setItem(TOKEN_KEY, result.token);
      window.localStorage.removeItem(SEEN_KEY);
      setToken(result.token);
      setSession(result.session || null);
      setMessages(result.messages || []);
      setName("");
      setPhone("");
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "Could not start chat."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !token || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          token,
          message,
        }),
      });
      const result = (await response.json()) as ChatApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not send message."
        );
      }

      setDraft("");
      await loadChat(token, true);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Could not send message."
      );
    } finally {
      setSending(false);
    }
  }

  if (!ready || hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[120] flex max-w-[calc(100vw-2rem)] flex-col items-end sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          className="mb-3 flex h-[min(590px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
          aria-label="ORVIX customer service chat"
        >
          <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#070707] px-5 py-4 text-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <p className="font-black tracking-tight">ORVIX Customer Service</p>
              </div>
              <p className="mt-1 text-xs text-white/55">
                Replies appear directly in this chat
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-xl text-white/75 transition hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          {!token ? (
            <div className="flex flex-1 flex-col justify-center p-6">
              <div className="rounded-3xl bg-black/[0.035] p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-black/40">
                  START A CONVERSATION
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  How can we help?
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  Send us a message here and continue the same conversation whenever you return.
                </p>
              </div>

              <form onSubmit={startChat} className="mt-5 space-y-3">
                <label className="block text-sm font-bold text-black/65">
                  Your name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Enter your name"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-3 text-base outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                </label>

                <label className="block text-sm font-bold text-black/65">
                  Phone <span className="font-normal text-black/35">(optional)</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={30}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="01xxxxxxxxx"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-3 text-base outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                </label>

                {error && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-black px-5 py-4 text-sm font-black text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Starting…" : "Start Chat"}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-2.5 text-xs">
                <span className="truncate font-bold text-black/45">
                  {session?.customerName || "Your conversation"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 font-black ${
                    session?.status === "closed"
                      ? "bg-black/[0.06] text-black/45"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {session?.status === "closed" ? "Closed" : "Open"}
                </span>
              </div>

              <div
                ref={threadRef}
                className="flex-1 space-y-3 overflow-y-auto bg-[#f7f7f7] px-4 py-5"
              >
                {loading && messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-black/35">Loading chat…</p>
                )}

                {messages.map((item) => {
                  const mine = item.sender === "customer";
                  const system = item.sender === "system";

                  return (
                    <div
                      key={item.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[84%] rounded-2xl px-4 py-3 ${
                          mine
                            ? "rounded-br-md bg-black text-white"
                            : system
                              ? "border border-black/[0.07] bg-white text-black/65"
                              : "rounded-bl-md border border-black/[0.08] bg-white text-black"
                        }`}
                      >
                        {!mine && (
                          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-black/35">
                            {system ? "ORVIX" : "Customer Service"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {item.body}
                        </p>
                        <p
                          className={`mt-1.5 text-right text-[10px] ${
                            mine ? "text-white/45" : "text-black/30"
                          }`}
                        >
                          {timeLabel(item.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-black/10 bg-white p-3">
                {error && (
                  <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {error}
                  </p>
                )}
                <form onSubmit={sendMessage} className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder="Type your message…"
                    className="max-h-28 min-h-[46px] flex-1 resize-none rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-3 text-base outline-none placeholder:text-black/30 focus:border-black/30"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="grid h-[46px] w-[52px] shrink-0 place-items-center rounded-2xl bg-black text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <span className="text-xs font-black">•••</span>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M22 2 11 13" />
                        <path d="m22 2-7 20-4-9-9-4Z" />
                      </svg>
                    )}
                  </button>
                </form>
                <p className="mt-2 text-center text-[10px] font-medium text-black/30">
                  Your conversation is saved on this device.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="relative flex items-center gap-2.5 rounded-full bg-black px-5 py-3.5 font-black text-white shadow-[0_14px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-black/85"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close customer service chat" : "Chat with customer service"}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
        <span>Chat</span>
        {hasUnread && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] text-white">
            1
          </span>
        )}
      </button>
    </div>
  );
}
