"use client";

import Image from "next/image";
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
  humanRequested?: boolean;
  aiPaused?: boolean;
};

type ChatApiResult = {
  success?: boolean;
  message?: string | ChatMessage;
  token?: string;
  session?: ChatSession;
  messages?: ChatMessage[];
  humanRequested?: boolean;
  alreadyRequested?: boolean;
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
  const [requestingHuman, setRequestingHuman] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

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
        initialScrollDoneRef.current = false;
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

    initialScrollDoneRef.current = false;
    stickToBottomRef.current = true;

    const interval = window.setInterval(() => {
      void loadChat(token, true);
    }, 2200);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const thread = threadRef.current;
      if (!thread) return;

      if (!initialScrollDoneRef.current || stickToBottomRef.current) {
        thread.scrollTop = thread.scrollHeight;
        initialScrollDoneRef.current = true;
        stickToBottomRef.current = true;
      }
    });
  }, [messages.length]);

  function handleThreadScroll() {
    const thread = threadRef.current;
    if (!thread) return;
    const distanceFromBottom =
      thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 140;
  }

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
      initialScrollDoneRef.current = false;
      stickToBottomRef.current = true;
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

    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      sender: "customer",
      body: message,
      created_at: new Date().toISOString(),
    };

    stickToBottomRef.current = true;
    setDraft("");
    setSending(true);
    setError("");
    setMessages((current) => [...current, optimisticMessage]);

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

      if (result.message && typeof result.message !== "string") {
        setMessages((current) =>
          current.map((item) =>
            item.id === optimisticId ? result.message as ChatMessage : item
          )
        );
      }

      void loadChat(token, true);
    } catch (sendError) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setDraft((current) => current || message);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send message."
      );
    } finally {
      setSending(false);
    }
  }

  async function requestHumanSupport() {
    if (!token || requestingHuman || session?.humanRequested) return;

    setRequestingHuman(true);
    setError("");
    stickToBottomRef.current = true;

    try {
      const response = await fetch("/api/chat-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      const result = (await response.json()) as ChatApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not request Customer Service."
        );
      }

      setSession((current) =>
        current
          ? { ...current, humanRequested: true, aiPaused: true, status: "open" }
          : current
      );

      if (result.message && typeof result.message !== "string") {
        setMessages((current) =>
          current.some((item) => item.id === (result.message as ChatMessage).id)
            ? current
            : [...current, result.message as ChatMessage]
        );
      }

      void loadChat(token, true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not request Customer Service."
      );
    } finally {
      setRequestingHuman(false);
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
    initialScrollDoneRef.current = false;
    stickToBottomRef.current = true;
  }

  if (session) {
    return (
      <main className="h-[100dvh] overflow-hidden bg-[#050505] text-white">
        <div className="mx-auto flex h-full max-w-5xl flex-col sm:p-4">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#090909] sm:rounded-[28px] sm:border sm:border-white/10">
            <div className="z-20 flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0c0c0c]/95 px-3 py-3 backdrop-blur-xl sm:px-5">
              <Link
                href="/"
                aria-label="Back to store"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/65 transition hover:bg-white/[0.08] hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>

              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#111]">
                <Image src="/logo.jpeg" alt="ORVIX" width={40} height={40} className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black sm:text-base">ORVIX Customer Service</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40">
                  <span className={`h-1.5 w-1.5 rounded-full ${session.humanRequested ? "bg-amber-400" : session.status === "open" ? "bg-emerald-400" : "bg-white/25"}`} />
                  <span className="truncate">
                    {session.humanRequested
                      ? "Human Support requested"
                      : session.status === "open"
                        ? "Conversation open"
                        : "Conversation closed"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void requestHumanSupport()}
                disabled={requestingHuman || Boolean(session.humanRequested)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black transition sm:px-4 sm:text-xs ${
                  session.humanRequested
                    ? "border-amber-400/20 bg-amber-500/[0.08] text-amber-200"
                    : "border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100 hover:bg-emerald-500/[0.16]"
                } disabled:cursor-default`}
              >
                {session.humanRequested
                  ? "Human requested"
                  : requestingHuman
                    ? "Requesting…"
                    : "Talk to a Human"}
              </button>

              <button
                type="button"
                onClick={resetLocalChat}
                aria-label="Start new chat"
                className="hidden h-10 shrink-0 items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-[11px] font-black text-white/55 transition hover:bg-white/[0.08] hover:text-white sm:flex"
              >
                New Chat
              </button>
            </div>

            {error && (
              <div className="shrink-0 border-b border-red-400/15 bg-red-500/[0.08] px-4 py-2.5 text-xs font-bold text-red-100">
                {error}
              </div>
            )}

            <div
              ref={threadRef}
              onScroll={handleThreadScroll}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#070707] px-3 py-4 [scrollbar-width:none] sm:px-6 sm:py-6 [&::-webkit-scrollbar]:hidden"
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

            <div className="z-20 shrink-0 border-t border-white/10 bg-[#0c0c0c]/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:p-4">
              {session.status === "closed" && (
                <p className="mb-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-100/70">
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
                  placeholder="Message ORVIX…"
                  className="max-h-32 min-h-[48px] min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/45"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="h-[48px] shrink-0 rounded-2xl bg-blue-500 px-5 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "…" : "Send"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    );
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

          <Link
            href="/"
            className="w-fit rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-2.5 text-sm font-black text-blue-200 transition hover:bg-blue-500/15"
          >
            Back to Store
          </Link>
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
        ) : (
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
                Enter your name, choose AI or Human Support, then start the conversation.
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
        )}
      </div>
    </main>
  );
}
