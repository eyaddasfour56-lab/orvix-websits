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
  humanRequested: boolean;
  humanRequestedAt?: string | null;
  humanRequestReason?: string;
  aiPaused: boolean;
};

type ChatMessage = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

type SupportSettings = {
  aiAutoReply: boolean;
  aiConfigured: boolean;
  aiModel?: string;
};

type ApiResult = {
  success?: boolean;
  message?: string | ChatMessage;
  conversations?: Conversation[];
  conversation?: Conversation;
  messages?: ChatMessage[];
  status?: "open" | "closed";
  settings?: SupportSettings;
  deletedIds?: string[];
  deletedCount?: number;
  aiPaused?: boolean;
  humanRequested?: boolean;
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
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminCustomerChats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [settings, setSettings] = useState<SupportSettings>({
    aiAutoReply: false,
    aiConfigured: false,
  });
  const [selectedId, setSelectedId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingAi, setChangingAi] = useState(false);
  const [changingGlobalAi, setChangingGlobalAi] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
        throw new Error(typeof result.message === "string" ? result.message : "Could not load customer chats.");
      }
      setConversations(result.conversations || []);
      if (result.settings) setSettings(result.settings);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : "Could not load customer chats.");
    } finally {
      if (!quiet) setLoadingInbox(false);
    }
  }

  async function loadConversation(sessionId = selectedId, quiet = false) {
    if (!sessionId) return;
    if (!quiet) setLoadingThread(true);
    try {
      const response = await fetch(`/api/admin/chat?sessionId=${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.conversation) {
        if (response.status === 404) {
          setSelectedId("");
          setSelectedConversation(null);
          setMessages([]);
          await loadInbox(true);
          return;
        }
        throw new Error(typeof result.message === "string" ? result.message : "Could not load conversation.");
      }

      setSelectedConversation(result.conversation);
      setMessages(result.messages || []);
      setConversations((current) =>
        current.map((item) =>
          item.id === sessionId ? { ...item, ...result.conversation, unread: false } : item
        )
      );
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError instanceof Error ? loadError.message : "Could not load conversation.");
    } finally {
      if (!quiet) setLoadingThread(false);
    }
  }

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("conversation");
    if (requested && UUID_PATTERN.test(requested)) setSelectedId(requested);
    void loadInbox(false);
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
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
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
        body: JSON.stringify({ action: "message", sessionId: selectedId, message }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(typeof result.message === "string" ? result.message : "Could not send reply.");
      }
      setDraft("");
      setNotice("Reply sent. AI is paused for this conversation while you handle it.");
      await Promise.all([loadConversation(selectedId, true), loadInbox(true)]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send reply.");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!selectedConversation || changingStatus) return;
    const nextStatus = selectedConversation.status === "open" ? "closed" : "open";
    setChangingStatus(true);
    setError("");
    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", sessionId: selectedConversation.id, status: nextStatus }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error("Could not update conversation.");
      await Promise.all([loadConversation(selectedConversation.id, true), loadInbox(true)]);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Could not update conversation.");
    } finally {
      setChangingStatus(false);
    }
  }

  async function setGlobalAi(enabled: boolean) {
    if (changingGlobalAi) return;
    setChangingGlobalAi(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_settings", enabled }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.settings) {
        throw new Error("Could not update AI auto reply.");
      }
      setSettings(result.settings);
      setNotice(enabled ? "AI auto reply enabled globally." : "AI auto reply disabled globally.");
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Could not update AI auto reply.");
    } finally {
      setChangingGlobalAi(false);
    }
  }

  async function setConversationAi(mode: "ai" | "human") {
    if (!selectedConversation || changingAi) return;
    setChangingAi(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_mode", sessionId: selectedConversation.id, mode }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error("Could not update AI mode.");
      setNotice(mode === "ai" ? "AI resumed for this conversation." : "You took over this conversation. AI is paused.");
      await Promise.all([loadConversation(selectedConversation.id, true), loadInbox(true)]);
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Could not update AI mode.");
    } finally {
      setChangingAi(false);
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
    if (!uniqueIds.length || deleting) return;
    if (!window.confirm(`Permanently delete ${uniqueIds.length} selected conversation${uniqueIds.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/chat", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: uniqueIds }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error("Could not delete selected conversations.");
      const deletedIds = result.deletedIds || uniqueIds;
      setConversations((current) => current.filter((item) => !deletedIds.includes(item.id)));
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
      setNotice(`${result.deletedCount ?? deletedIds.length} conversation${(result.deletedCount ?? deletedIds.length) === 1 ? "" : "s"} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete selected conversations.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) =>
      [item.customerName, item.customerPhone, item.lastMessagePreview, item.humanRequestReason]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  const unreadCount = conversations.filter((item) => item.unread).length;
  const openCount = conversations.filter((item) => item.status === "open").length;
  const humanCount = conversations.filter((item) => item.humanRequested).length;

  return (
    <main className={`min-h-screen bg-[#050505] text-white ${selectedId ? "p-0 lg:px-6 lg:py-8" : "px-4 py-7 sm:px-6"}`}>
      <div className="mx-auto max-w-[1500px]">
        <header className={`${selectedId ? "hidden lg:flex" : "flex"} flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between`}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300/70">ORVIX ADMIN</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.035em] sm:text-6xl">Customer Chats</h1>
            <p className="mt-3 text-sm text-white/45 sm:text-base">AI can answer normal questions. Human requests are escalated directly to you.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${settings.aiAutoReply && settings.aiConfigured ? "border-emerald-400/20 bg-emerald-500/[0.07]" : "border-white/10 bg-[#101010]"}`}>
              <div>
                <p className="text-xs font-black">AI AUTO REPLY</p>
                <p className={`mt-0.5 text-[10px] ${settings.aiConfigured ? "text-white/35" : "text-amber-300/70"}`}>
                  {settings.aiConfigured ? (settings.aiAutoReply ? "Active" : "Off") : "API key required"}
                </p>
              </div>
              <button
                type="button"
                disabled={changingGlobalAi || !settings.aiConfigured}
                onClick={() => void setGlobalAi(!settings.aiAutoReply)}
                className={`relative h-7 w-12 rounded-full transition disabled:opacity-40 ${settings.aiAutoReply && settings.aiConfigured ? "bg-emerald-400" : "bg-white/15"}`}
                aria-label="Toggle AI auto reply"
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${settings.aiAutoReply && settings.aiConfigured ? "left-6" : "left-1"}`} />
              </button>
            </div>
            <button type="button" onClick={() => void loadInbox(false)} className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-xs font-black text-white/70 hover:bg-[#171717]">Refresh</button>
            <Link href="/admin" className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-xs font-black text-white/70 hover:bg-[#171717]">Back to Admin</Link>
          </div>
        </header>

        <section className={`${selectedId ? "hidden lg:grid" : "grid"} mt-5 gap-3 sm:grid-cols-2 xl:grid-cols-4`}>
          <Metric label="Conversations" value={conversations.length} />
          <Metric label="Open" value={openCount} tone="green" />
          <Metric label="Needs Reply" value={unreadCount} tone="red" />
          <Metric label="Wants Human" value={humanCount} tone="amber" />
        </section>

        {(error || notice) && (
          <div className={`${selectedId ? "mx-3 mt-3 lg:mx-0" : "mt-5"} rounded-2xl border px-5 py-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-500/[0.08] text-red-100" : "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-100"}`}>
            {error || notice}
          </div>
        )}

        <div className={`${selectedId ? "mt-0 lg:mt-5" : "mt-5"} grid overflow-hidden border border-white/10 bg-[#080808] lg:h-[720px] lg:grid-cols-[390px_minmax(0,1fr)] lg:rounded-[30px] ${selectedId ? "h-[calc(100dvh-58px)]" : "min-h-[680px] rounded-[30px]"}`}>
          <aside className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-white/10 lg:border-r`}>
            <div className="space-y-3 border-b border-white/10 p-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone or message…" className="w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/35" />
              {deleteSelection.size > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-3">
                  <span className="text-xs font-black text-red-100">{deleteSelection.size} selected</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDeleteSelection(new Set())} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/60">Clear</button>
                    <button type="button" onClick={() => void deleteChats(Array.from(deleteSelection))} disabled={deleting} className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-45">{deleting ? "Deleting…" : "Delete Selected"}</button>
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {loadingInbox && !conversations.length ? (
                <p className="px-4 py-10 text-center text-sm text-white/35">Loading customer chats…</p>
              ) : !filteredConversations.length ? (
                <p className="px-4 py-10 text-center text-sm text-white/35">No chats yet.</p>
              ) : (
                filteredConversations.map((item) => {
                  const checked = deleteSelection.has(item.id);
                  return (
                    <div key={item.id} className={`mb-1 flex overflow-hidden rounded-2xl border transition ${checked ? "border-red-400/30 bg-red-500/[0.06]" : item.humanRequested ? "border-amber-400/25 bg-amber-500/[0.055]" : selectedId === item.id ? "border-blue-400/25 bg-blue-500/[0.09]" : item.unread ? "border-white/15 bg-[#111]" : "border-transparent hover:bg-[#101010]"}`}>
                      <label className="grid w-12 shrink-0 cursor-pointer place-items-center border-r border-white/[0.07]">
                        <input type="checkbox" checked={checked} onChange={() => toggleDeleteSelection(item.id)} className="h-4 w-4 accent-red-500" />
                      </label>
                      <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 flex-1 p-4 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />}
                              <p className={`truncate ${item.unread || item.humanRequested ? "font-black" : "font-bold"}`}>{item.customerName}</p>
                            </div>
                            {item.customerPhone && <p className="mt-1 truncate text-xs text-white/35">{item.customerPhone}</p>}
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-white/30">{formatDateTime(item.lastMessageAt)}</span>
                        </div>
                        {item.humanRequested && <div className="mt-3 inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.09em] text-amber-200">Wants Customer Service</div>}
                        <p className={`mt-3 line-clamp-2 text-sm leading-5 ${item.unread ? "text-white/75" : "text-white/38"}`}>{item.lastSender === "admin" ? "ORVIX: " : ""}{item.lastMessagePreview}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.status === "open" ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.06] text-white/35"}`}>{item.status}</span>
                          <span className={`text-[10px] font-black ${item.aiPaused ? "text-amber-300/70" : "text-blue-300/70"}`}>{item.aiPaused ? "HUMAN MODE" : "AI MODE"}</span>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
            {!selectedId ? (
              <div className="grid flex-1 place-items-center p-8 text-center text-white/35">Select a conversation.</div>
            ) : loadingThread && !selectedConversation ? (
              <div className="grid flex-1 place-items-center text-sm text-white/35">Loading conversation…</div>
            ) : selectedConversation ? (
              <>
                <header className="shrink-0 border-b border-white/10 bg-[#0b0b0b] p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <button type="button" onClick={() => setSelectedId("")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#111] text-white/70 lg:hidden">←</button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-lg font-black sm:text-xl">{selectedConversation.customerName}</h2>
                          <span className={`h-2.5 w-2.5 rounded-full ${selectedConversation.status === "open" ? "bg-emerald-400" : "bg-white/25"}`} />
                        </div>
                        <p className="mt-1 text-xs text-white/35">{selectedConversation.customerPhone || "No phone"} · Started {formatDateTime(selectedConversation.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {selectedConversation.humanRequested && (
                    <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-200">Customer wants Customer Service</p>
                      <p className="mt-1 text-sm text-amber-50/65">{selectedConversation.humanRequestReason || "The customer asked to speak with a human support agent."}</p>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button type="button" onClick={() => void setConversationAi(selectedConversation.aiPaused ? "ai" : "human")} disabled={changingAi || (!settings.aiConfigured && selectedConversation.aiPaused)} className={`rounded-xl border px-3 py-2.5 text-xs font-black disabled:opacity-40 ${selectedConversation.aiPaused ? "border-blue-400/20 bg-blue-500/[0.08] text-blue-200" : "border-amber-400/20 bg-amber-500/[0.08] text-amber-100"}`}>
                      {changingAi ? "Updating…" : selectedConversation.aiPaused ? "Resume AI" : "Take Over"}
                    </button>
                    <button type="button" onClick={() => void toggleStatus()} disabled={changingStatus} className="rounded-xl border border-white/10 bg-[#111] px-3 py-2.5 text-xs font-black text-white/65 disabled:opacity-40">{changingStatus ? "Updating…" : selectedConversation.status === "open" ? "Close" : "Reopen"}</button>
                    <button type="button" onClick={() => void deleteChats([selectedConversation.id])} disabled={deleting} className="rounded-xl border border-red-400/20 bg-red-500/[0.07] px-3 py-2.5 text-xs font-black text-red-200 disabled:opacity-40">Delete Chat</button>
                    <span className={`grid place-items-center rounded-xl border px-3 py-2.5 text-xs font-black ${selectedConversation.aiPaused ? "border-amber-400/15 text-amber-200/70" : "border-blue-400/15 text-blue-200/70"}`}>{selectedConversation.aiPaused ? "HUMAN MODE" : "AI MODE"}</span>
                  </div>
                </header>

                <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#070707] px-4 py-5 sm:px-6">
                  {messages.map((item) => {
                    const mine = item.sender === "admin";
                    const system = item.sender === "system";
                    return (
                      <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${mine ? "rounded-br-md bg-blue-500 text-white" : system ? "border border-white/10 bg-[#121212] text-white/55" : "rounded-bl-md border border-white/10 bg-[#181818] text-white"}`}>
                          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.13em] opacity-55">{mine ? "ORVIX Support" : system ? "ORVIX System" : selectedConversation.customerName}</p>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.body}</p>
                          <p className="mt-1.5 text-right text-[10px] opacity-45">{messageTime(item.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 z-20 shrink-0 border-t border-white/10 bg-[#0b0b0b] p-3 sm:p-4">
                  {selectedConversation.humanRequested && <p className="mb-2 text-xs font-bold text-amber-200/75">This customer requested you. Your first reply will clear the human-request alert and keep AI paused.</p>}
                  <form onSubmit={sendReply} className="flex items-end gap-2">
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={1000} placeholder="Reply to customer…" className="max-h-36 min-h-[52px] min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-[#151515] px-4 py-3.5 text-base text-white outline-none placeholder:text-white/25 focus:border-blue-400/40" />
                    <button type="submit" disabled={sending || !draft.trim()} className="h-[52px] shrink-0 rounded-2xl bg-blue-500 px-5 text-sm font-black text-white transition hover:bg-blue-400 disabled:opacity-40">{sending ? "Sending…" : "Send"}</button>
                  </form>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "green" | "red" | "amber" }) {
  const classes = {
    neutral: "border-white/10 bg-[#0d0d0d] text-white",
    green: "border-emerald-400/15 bg-emerald-500/[0.05] text-emerald-200",
    red: "border-red-400/15 bg-red-500/[0.05] text-red-200",
    amber: "border-amber-400/15 bg-amber-500/[0.05] text-amber-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] opacity-50">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
