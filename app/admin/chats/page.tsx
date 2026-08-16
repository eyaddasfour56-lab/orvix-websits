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
  deletedIds?: string[];
  deletedCount?: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const [deleting, setDeleting] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(
    () => new Set()
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

      setConversations(result.conversations || []);
      setError("");
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
        if (response.status === 404) {
          setSelectedId("");
          setSelectedConversation(null);
          setMessages([]);
          await loadInbox(true);
          return;
        }

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
    const requestedConversation = new URLSearchParams(window.location.search).get(
      "conversation"
    );

    if (requestedConversation && UUID_PATTERN.test(requestedConversation)) {
      setSelectedId(requestedConversation);
    }

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
    setNotice("");

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
    setNotice("");

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

  function toggleDeleteSelection(id: string) {
    setDeleteSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteChats(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids)).filter((id) => UUID_PATTERN.test(id));
    if (uniqueIds.length === 0 || deleting) return;

    const names = conversations
      .filter((item) => uniqueIds.includes(item.id))
      .map((item) => item.customerName)
      .slice(0, 4);
    const extraCount = Math.max(uniqueIds.length - names.length, 0);
    const label = names.length > 0 ? names.join(", ") : `${uniqueIds.length} chat(s)`;

    if (
      !window.confirm(
        `Permanently delete ${label}${
          extraCount ? ` + ${extraCount} more` : ""
        }? This deletes the selected conversation history only and cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/chat", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: uniqueIds }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Could not delete selected conversations."
        );
      }

      const deletedIds = result.deletedIds || uniqueIds;
      setConversations((current) =>
        current.filter((item) => !deletedIds.includes(item.id))
      );
      setDeleteSelection((current) => {
        const next = new Set(current);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (selectedId && deletedIds.includes(selectedId)) {
        setSelectedId("");
        setSelectedConversation(null);
        setMessages([]);
      }

      setNotice(
        `${result.deletedCount ?? deletedIds.length} selected conversation${
          (result.deletedCount ?? deletedIds.length) === 1 ? "" : "s"
        } deleted.`
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete selected conversations."
      );
    } finally {
      setDeleting(false);
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
  const selectedForDeleteCount = deleteSelection.size;

  return (
    <main
      className={`min-h-screen bg-[#050505] text-white ${
        selectedId
          ? "px-0 py-0 lg:px-6 lg:py-10"
          : "px-4 py-7 sm:px-6 sm:py-10"
      }`}
    >
      <div className="mx-auto max-w-[1500px]">
        <header
          className={`${
            selectedId ? "hidden lg:flex" : "flex"
          } flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between`}
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300/70">
              ORVIX ADMIN
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-black tracking-[-0.035em] sm:text-6xl">
                Customer Chats
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-black text-red-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-white/45 sm:text-base">
              Reply to customers, close conversations, or delete only the chats you select.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void loadInbox(false);
                if (selectedId) void loadConversation(selectedId, false);
              }}
              className="rounded-full border border-white/10 bg-[#111] px-5 py-3 text-sm font-black text-white/75 transition hover:bg-[#171717] hover:text-white"
            >
              Refresh
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-[#111] px-5 py-3 text-sm font-black text-white/75 transition hover:bg-[#171717] hover:text-white"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        <section
          className={`${
            selectedId ? "hidden lg:grid" : "grid"
          } mt-5 gap-3 sm:grid-cols-3`}
        >
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
              Conversations
            </p>
            <p className="mt-1 text-2xl font-black">{conversations.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200/55">
              Open
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-200">{openCount}</p>
          </div>
          <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.05] p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200/55">
              Needs Reply
            </p>
            <p className="mt-1 text-2xl font-black text-red-200">{unreadCount}</p>
          </div>
        </section>

        {(error || notice) && (
          <div
            className={`${
              selectedId ? "mx-3 mt-3 lg:mx-0 lg:mt-5" : "mt-5"
            } rounded-2xl border px-5 py-4 text-sm font-bold ${
              error
                ? "border-red-400/20 bg-red-500/[0.08] text-red-100"
                : "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100"
            }`}
          >
            {error || notice}
          </div>
        )}

        <div
          className={`${
            selectedId ? "mt-0 lg:mt-5" : "mt-5"
          } grid overflow-hidden border border-white/10 bg-[#080808] lg:h-[720px] lg:grid-cols-[390px_minmax(0,1fr)] lg:rounded-[30px] ${
            selectedId ? "h-[calc(100dvh-58px)]" : "min-h-[680px] rounded-[30px]"
          }`}
        >
          <aside
            className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-white/10 lg:border-r`}
          >
            <div className="space-y-3 border-b border-white/10 p-4">
              <label className="block text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Search
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, phone or message…"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/35"
                />
              </label>

              {selectedForDeleteCount > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3">
                  <div>
                    <p className="text-xs font-black text-red-100">
                      {selectedForDeleteCount} selected
                    </p>
                    <p className="mt-0.5 text-[10px] text-red-100/45">
                      Only checked chats will be deleted.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteSelection(new Set())}
                      className="rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-xs font-black text-white/60 hover:text-white"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteChats(Array.from(deleteSelection))}
                      disabled={deleting}
                      className="rounded-xl border border-red-400/25 bg-red-500/15 px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-500/20 disabled:opacity-45"
                    >
                      {deleting ? "Deleting…" : "Delete Selected"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
                filteredConversations.map((item) => {
                  const checked = deleteSelection.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`mb-1 flex items-stretch overflow-hidden rounded-2xl border transition ${
                        checked
                          ? "border-red-400/30 bg-red-500/[0.06]"
                          : selectedId === item.id
                            ? "border-blue-400/25 bg-blue-500/[0.09]"
                            : item.unread
                              ? "border-white/15 bg-[#111]"
                              : "border-transparent hover:bg-[#101010]"
                      }`}
                    >
                      <label className="grid w-12 shrink-0 cursor-pointer place-items-center border-r border-white/[0.07]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDeleteSelection(item.id)}
                          className="h-4 w-4 accent-red-500"
                          aria-label={`Select ${item.customerName} for deletion`}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="min-w-0 flex-1 p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.unread && (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />
                              )}
                              <p
                                className={`truncate ${
                                  item.unread ? "font-black" : "font-bold"
                                }`}
                              >
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
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section
            className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}
          >
            {!selectedId ? (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-[#111]">
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
                    Customer messages update automatically.
                  </p>
                </div>
              </div>
            ) : loadingThread && !selectedConversation ? (
              <div className="grid flex-1 place-items-center text-sm text-white/35">
                Loading conversation…
              </div>
            ) : selectedConversation ? (
              <>
                <header className="flex shrink-0 flex-col gap-3 border-b border-white/10 bg-[#0b0b0b] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId("")}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#111] text-white/70 lg:hidden"
                      aria-label="Back to conversations"
                    >
                      ←
                    </button>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-500/15 text-sm font-black text-blue-200">
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

                  <div className="grid grid-cols-2 gap-2 lg:flex">
                    <button
                      type="button"
                      onClick={() => void toggleStatus()}
                      disabled={changingStatus}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-black transition disabled:opacity-50 ${
                        selectedConversation.status === "open"
                          ? "border-amber-400/20 bg-amber-500/[0.07] text-amber-100 hover:bg-amber-500/[0.12]"
                          : "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-200 hover:bg-emerald-500/[0.12]"
                      }`}
                    >
                      {changingStatus
                        ? "Updating…"
                        : selectedConversation.status === "open"
                          ? "Close"
                          : "Reopen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteChats([selectedConversation.id])}
                      disabled={deleting}
                      className="rounded-xl border border-red-400/20 bg-red-500/[0.07] px-3 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-500/[0.12] disabled:opacity-45"
                    >
                      {deleting ? "Deleting…" : "Delete Chat"}
                    </button>
                  </div>
                </header>

                <div
                  ref={threadRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#070707] px-4 py-5 sm:px-6"
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
                          className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${
                            mine
                              ? "rounded-br-md bg-blue-500 text-white"
                              : system
                                ? "border border-white/10 bg-[#121212] text-white/55"
                                : "rounded-bl-md border border-white/10 bg-[#181818] text-white"
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

                <div className="sticky bottom-0 z-10 shrink-0 border-t border-white/10 bg-[#0b0b0b] p-3 sm:p-4">
                  {selectedConversation.status === "closed" && (
                    <p className="mb-3 rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-xs text-white/45">
                      This conversation is closed. Sending a reply will reopen it automatically.
                    </p>
                  )}

                  <form onSubmit={sendReply} className="flex items-end gap-2">
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
                      className="max-h-36 min-h-[52px] min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-[#151515] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/40"
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
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
