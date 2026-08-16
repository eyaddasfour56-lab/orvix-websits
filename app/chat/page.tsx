"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

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

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerServicePage() {
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
  const threadRef = useRef<HTMLDivElement | null>(null);

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
        setToken("");
        setSession(null);
        setMessages([]);
        return;
      }

      if (!response.ok || !result.success || !result.session) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not load your chat."
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
            : "Could not load your chat."
        );
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_KEY) || "";
    setToken(savedToken);
    setReady(true);

    if (savedToken) {
      void loadChat(savedToken, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;

    const interval = window.setInterval(() => {
      void loadChat(token, true);
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
  }, [messages.length]);

  async function startChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

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

      if (!response.ok || !result.success || !result.token || !result.session) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not start chat."
        );
      }

      window.localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setSession(result.session);
      setMessages(result.messages || []);
      setError("");
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
    if (!token || !message || sending) return;

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
        sendError instanceof Error
          ? sendError.message
          : "Could not send message."
      );
    } finally {
      setSending(false);
    }
  }

  function resetLocalChat() {
    if (
      !window.confirm(
        "Start a new chat on this device? Your previous conversation will stay in ORVIX support history."
      )
    ) {
      return;
    }

    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setSession(null);
    setMessages([]);
    setName("");
    setPhone("");
    setDraft("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-5xl flex-col">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300/70">
              ORVIX SUPPORT
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Customer Service
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/45 sm:text-base">
              Chat directly with the ORVIX team from the website.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {session && (
              <button
                type="button"
                onClick={resetLocalChat}
                className="rounded-full border border-white/10 bg-[#111] px-4 py-2.5 text-sm font-black text-white/70 transition hover:bg-[#181818] hover:text-white"
              >
                New Chat
              </button>
            )}
            <Link
              href="/"
              className="rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2.5 text-sm font-black text-blue-200 transition hover:bg-blue-500/15"
            >
              Back to Store
            </Link>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-5 py-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {!ready ? (
          <div className="grid flex-1 place-items-center py-16 text-sm text-white/35">
            Loading customer service…
          </div>
        ) : !session ? (
          <section className="mx-auto my-auto w-full max-w-xl py-10">
            <div className="rounded-[30px] border border-white/10 bg-[#0b0b0b] p-5 sm:p-8">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                </svg>
              </div>
              <h2 className="mt-5 text-2xl font-black">Start a private chat</h2>
              <p className="mt-2 text-sm leading-6 text-white/40">
                Enter your name, send your question, and return to this page later to continue the same conversation.
              </p>

              <form onSubmit={startChat} className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-white/65">
                  Your name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    required
                    placeholder="Full name"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/45"
                  />
                </label>

                <label className="block text-sm font-bold text-white/65">
                  Phone number <span className="text-white/30">(optional)</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={30}
                    inputMode="tel"
                    placeholder="01xxxxxxxxx"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/45"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading || name.trim().length < 2}
                  className="w-full rounded-2xl bg-blue-500 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading ? "Starting…" : "Start Chat"}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#090909]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0c0c0c] px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-500/15 text-sm font-black text-blue-200">
                  OR
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">ORVIX Customer Service</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/35">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        session.status === "open"
                          ? "bg-emerald-400"
                          : "bg-white/25"
                      }`}
                    />
                    <span>{session.status === "open" ? "Conversation open" : "Conversation closed"}</span>
                  </div>
                </div>
              </div>

              <span className="rounded-full border border-white/10 bg-[#111] px-3 py-2 text-xs font-bold text-white/45">
                {session.customerName}
              </span>
            </div>

            <div
              ref={threadRef}
              className="min-h-[360px] flex-1 space-y-4 overflow-y-auto bg-[#070707] px-4 py-6 sm:px-6"
            >
              {loading && messages.length === 0 ? (
                <p className="py-12 text-center text-sm text-white/35">
                  Loading conversation…
                </p>
              ) : (
                messages.map((item) => {
                  const mine = item.sender === "customer";
                  const system = item.sender === "system";

                  return (
                    <div
                      key={item.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${
                          mine
                            ? "rounded-br-md bg-blue-500 text-white"
                            : system
                              ? "border border-white/10 bg-[#121212] text-white/60"
                              : "rounded-bl-md border border-white/10 bg-[#171717] text-white"
                        }`}
                      >
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.13em] opacity-55">
                          {mine
                            ? session.customerName
                            : system
                              ? "ORVIX System"
                              : "ORVIX Support"}
                        </p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {item.body}
                        </p>
                        <p className="mt-1.5 text-right text-[10px] opacity-45">
                          {timeLabel(item.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 bg-[#0c0c0c] p-3 sm:p-4">
              {session.status === "closed" && (
                <p className="mb-3 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-100/70">
                  This conversation is closed. Sending a new message will reopen it.
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
                  className="max-h-36 min-h-[52px] min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-[#141414] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/45"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="h-[52px] shrink-0 rounded-2xl bg-blue-500 px-5 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
              <p className="mt-2 text-[10px] text-white/25">
                Enter to send · Shift + Enter for a new line
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
