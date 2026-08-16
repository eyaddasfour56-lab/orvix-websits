"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Conversation = {
  id: string;
  customerName: string;
  customerPhone: string;
  status: "open" | "closed";
  lastMessagePreview: string;
  lastSender?: "customer" | "admin" | "system" | null;
  lastMessageAt: string;
  createdAt: string;
  unread: boolean;
};

type ChatMessage = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type ApiResult = {
  success?: boolean;
  message?: string | ChatMessage;
  conversations?: Conversation[];
  conversation?: Conversation;
  messages?: ChatMessage[];
  status?: "open" | "closed";
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerChatsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  async function loadInbox(quiet = false) {
    if (!quiet) setLoadingInbox(true);

    try {
      const response = await fetch("/api/admin/chat", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not load customer chats."
        );
      }

      const next = result.conversations || [];
      setConversations(next);
      setError("");

      if (!selectedId && next.length > 0 && window.innerWidth >= 1024) {
        setSelectedId(next[0].id);
      }
    } catch (loadError) {
      if (!quiet) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load customer chats."
        );
      }
    } finally {
      if (!quiet) setLoadingInbox(false);
    }
  }

  async function loadConversation(sessionId = selectedId, quiet = false) {
    if (!sessionId) return;
    if (!quiet) setLoadingThread(true);

    try {
      const response = await fetch(
        `/api/admin/chat?sessionId=${encodeURIComponent(sessionId)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
        }
      );
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !result.conversation) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not load conversation."
        );
      }

      setSelectedConversation(result.conversation);
      setMessages(result.messages || []);
      setConversations((current) =>
        current.map((item) =>
          item.id === sessionId
            ? { ...item, ...result.conversation, unread: false }
            : item
        )
      );
      setError("");
    } catch (loadError) {
      if (!quiet) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load conversation."
        );
      }
    } finally {
      if (!quiet) setLoadingThread(false);
    }
  }

  useEffect(() => {
    void loadInbox(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    void loadConversation(selectedId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadInbox(true);
      if (selectedId) void loadConversation(selectedId, true);
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
  }, [selectedId, messages.length]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!selectedId || !message || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "message",
          sessionId: selectedId,
          message,
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not send reply."
        );
      }

      setDraft("");
      await Promise.all([loadConversation(selectedId, true), loadInbox(true)]);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Could not send reply."
      );
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!selectedConversation || changingStatus) return;

    const nextStatus =
      selectedConversation.status === "open" ? "closed" : "open";
    setChangingStatus(true);
    setError("");

    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          sessionId: selectedConversation.id,
          status: nextStatus,
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not update conversation."
        );
      }

      setSelectedConversation((current) =>
        current ? { ...current, status: nextStatus } : current
      );
      setConversations((current) =>
        current.map((item) =>
          item.id === selectedConversation.id
            ? { ...item, status: nextStatus }
            : item
        )
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Could not update conversation."
      );
    } finally {
      setChangingStatus(false);
    }
  }

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((item) =>
      [item.customerName, item.customerPhone, item.lastMessagePreview]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  const unreadCount = conversations.filter((item) => item.unread).length;
  const openCount = conversations.filter((item) => item.status === "open").length;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200/70">
              ORVIX ADMIN
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black tracking-[-0.035em] sm:text-6xl">
                Customer Chats
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-white/45 sm:text-base">
              Reply to website customers directly from your dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadInbox(false);
                if (selectedId) void loadConversation(selectedId, false);
              }}
              className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black transition hover:bg-white/10"
            >
              Refresh
            </button>
            <Link
              href="/admin"
              className="rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-gray-200"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
              Conversations
            </p>
            <p className="mt-1 text-2xl font-black">{conversations.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">
              Open
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-200">{openCount}</p>
          </div>
          <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200/55">
              Needs Reply
            </p>
            <p className="mt-1 text-2xl font-black text-red-200">{unreadCount}</p>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-5 py-4 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        <div className="mt-5 grid min-h-[680px] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.025] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside
            className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-[680px] flex-col border-white/10 lg:border-r`}
          >
            <div className="border-b border-white/10 p-4">
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Search
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, phone or message…"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-white/25"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loadingInbox && conversations.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-white/35">
                  Loading customer chats…
                </p>
              ) : filteredConversations.length === 0 ? (
                <div className="m-2 rounded-2xl border border-dashed border-white/10 p-7 text-center">
                  <p className="font-black">No chats yet</p>
                  <p className="mt-2 text-sm leading-6 text-white/35">
                    New website conversations will appear here automatically.
                  </p>
                </div>
              ) : (
                filteredConversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`mb-1 w-full rounded-2xl border p-4 text-left transition ${
                      selectedId === item.id
                        ? "border-blue-400/25 bg-blue-500/[0.11]"
                        : item.unread
                          ? "border-white/15 bg-white/[0.075] hover:bg-white/[0.1]"
                          : "border-transparent hover:bg-white/[0.055]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.unread && (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />
                          )}
                          <p className={`truncate ${item.unread ? "font-black" : "font-bold"}`}>
                            {item.customerName}
                          </p>
                        </div>
                        {item.customerPhone && (
                          <p className="mt-1 truncate text-xs text-white/35">
                            {item.customerPhone}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-white/30">
                        {formatDateTime(item.lastMessageAt)}
                      </span>
                    </div>

                    <p
                      className={`mt-3 line-clamp-2 text-sm leading-5 ${
                        item.unread ? "text-white/75" : "text-white/38"
                      }`}
                    >
                      {item.lastSender === "admin" ? "You: " : ""}
                      {item.lastMessagePreview}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
                          item.status === "open"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-white/[0.06] text-white/35"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.unread && (
                        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-blue-300">
                          New message
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section
            className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-[680px] min-w-0 flex-col`}
          >
            {!selectedId ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7 text-white/45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                    </svg>
                  </div>
                  <h2 className="mt-4 text-2xl font-black">Select a conversation</h2>
                  <p className="mt-2 text-sm text-white/35">
                    Customer messages will update automatically.
                  </p>
                </div>
              </div>
            ) : loadingThread && !selectedConversation ? (
              <div className="grid flex-1 place-items-center text-sm text-white/35">
                Loading conversation…
              </div>
            ) : selectedConversation ? (
              <>
                <header className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId("")}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/65 lg:hidden"
                      aria-label="Back to conversations"
                    >
                      ←
                    </button>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-black">
                      {selectedConversation.customerName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase() || "C"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-lg font-black sm:text-xl">
                          {selectedConversation.customerName}
                        </h2>
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            selectedConversation.status === "open"
                              ? "bg-emerald-400"
                              : "bg-white/25"
                          }`}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/35">
                        {selectedConversation.customerPhone && (
                          <span>{selectedConversation.customerPhone}</span>
                        )}
                        <span>
                          Started {formatDateTime(selectedConversation.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleStatus()}
                    disabled={changingStatus}
                    className={`rounded-full border px-4 py-2.5 text-xs font-black transition disabled:opacity-50 ${
                      selectedConversation.status === "open"
                        ? "border-red-400/20 bg-red-500/[0.08] text-red-200 hover:bg-red-500/[0.14]"
                        : "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200 hover:bg-emerald-500/[0.14]"
                    }`}
                  >
                    {changingStatus
                      ? "Updating…"
                      : selectedConversation.status === "open"
                        ? "Close Conversation"
                        : "Reopen Conversation"}
                  </button>
                </header>

                <div
                  ref={threadRef}
                  className="flex-1 space-y-4 overflow-y-auto bg-black/20 px-4 py-6 sm:px-6"
                >
                  {messages.map((item) => {
                    const mine = item.sender === "admin";
                    const system = item.sender === "system";

                    return (
                      <div
                        key={item.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[86%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${
                            mine
                              ? "rounded-br-md bg-blue-500 text-white"
                              : system
                                ? "border border-white/10 bg-white/[0.05] text-white/55"
                                : "rounded-bl-md border border-white/10 bg-white/[0.09] text-white"
                          }`}
                        >
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.13em] opacity-55">
                            {mine
                              ? "You · ORVIX"
                              : system
                                ? "ORVIX System"
                                : selectedConversation.customerName}
                          </p>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {item.body}
                          </p>
                          <p className="mt-1.5 text-right text-[10px] opacity-45">
                            {messageTime(item.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-white/10 bg-[#090909] p-4 sm:p-5">
                  {selectedConversation.status === "closed" && (
                    <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/45">
                      This conversation is closed. Sending a reply will reopen it automatically.
                    </p>
                  )}

                  <form onSubmit={sendReply} className="flex items-end gap-2.5">
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
                      placeholder="Reply to customer…"
                      className="max-h-36 min-h-[50px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/40"
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="h-[50px] shrink-0 rounded-2xl bg-white px-5 text-sm font-black text-black transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </form>
                  <p className="mt-2 text-[10px] text-white/25">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
