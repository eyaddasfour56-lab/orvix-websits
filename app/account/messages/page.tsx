"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

type Conversation = {
  id: string;
  status?: string | null;
  last_message_preview?: string | null;
  last_sender?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
  unread?: boolean;
};

type Message = {
  id: string;
  sender: "customer" | "admin" | "system";
  body: string;
  created_at: string;
};

function when(value: unknown) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

async function tokenOrEmpty() {
  const supabase = getCustomerSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

export default function CustomerMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const authRequest = useCallback(async (url: string, init: RequestInit = {}) => {
    const token = await tokenOrEmpty();
    if (!token) {
      router.replace("/account/login");
      throw new Error("Please log in.");
    }
    return fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });
  }, [router]);

  const loadList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await authRequest("/api/account/support");
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load messages.");
      const list = Array.isArray(result.conversations) ? result.conversations : [];
      setConversations(list);
      if (!selectedId && list[0]?.id) setSelectedId(list[0].id);
      setError("");
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message !== "Please log in.") setError(loadError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authRequest, selectedId]);

  const loadThread = useCallback(async (sessionId: string, silent = false) => {
    if (!sessionId) return;
    try {
      const response = await authRequest(`/api/account/support?sessionId=${encodeURIComponent(sessionId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load conversation.");
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      if (!silent) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
      setError("");
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message !== "Please log in.") setError(loadError.message);
    }
  }, [authRequest]);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) void loadThread(selectedId); }, [selectedId, loadThread]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadList(true);
      if (selectedId) void loadThread(selectedId, true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadList, loadThread, selectedId]);

  async function startConversation() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authRequest("/api/account/support", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not start a conversation.");
      const id = String(result.conversation?.id || "");
      await loadList(true);
      if (id) setSelectedId(id);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Could not start a conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await authRequest("/api/account/support", {
        method: "POST",
        body: JSON.stringify({ action: "send", sessionId: selectedId, message: text }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not send message.");
      setDraft("");
      await Promise.all([loadThread(selectedId), loadList(true)]);
      window.dispatchEvent(new Event("orvix-auth-changed"));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  }

  const selected = conversations.find((conversation) => conversation.id === selectedId) || null;

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/account" className="text-[10px] font-black uppercase tracking-[0.15em] text-white/30">← My Account</Link>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Messages</h1>
            <p className="mt-2 text-sm font-medium text-white/38">Your private Customer Service inbox. Replies from ORVIX appear here.</p>
          </div>
          <button type="button" onClick={() => void startConversation()} disabled={busy} className="h-11 rounded-xl bg-white px-4 text-xs font-black text-black disabled:opacity-40">New Conversation</button>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-bold text-red-100">{error}</p> : null}

        <section className="mt-5 grid min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e10] lg:grid-cols-[330px_1fr]">
          <aside className="border-b border-white/8 p-3 lg:border-b-0 lg:border-r">
            <p className="px-2 pb-3 pt-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/25">Conversations</p>
            <div className="space-y-2">
              {loading && !conversations.length ? <p className="p-4 text-xs text-white/30">Loading…</p> : null}
              {!loading && !conversations.length ? <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center"><p className="text-xs font-bold text-white/45">No messages yet.</p><button type="button" onClick={() => void startConversation()} className="mt-3 text-xs font-black text-white">Start Customer Service chat →</button></div> : null}
              {conversations.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === conversation.id ? "border-white/20 bg-white/[0.08]" : "border-white/7 bg-white/[0.025] hover:bg-white/[0.05]"}`}>
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-black">Customer Service</p>{conversation.unread ? <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-white" /> : null}</div>
                  <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-white/35">{conversation.last_message_preview || "Conversation started"}</p>
                  <p className="mt-2 text-[9px] font-semibold text-white/20">{when(conversation.last_message_at || conversation.created_at)}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="flex min-h-[560px] flex-col">
            {selected ? (
              <>
                <header className="border-b border-white/8 px-4 py-4 sm:px-5"><p className="text-sm font-black">ORVIX Customer Service</p><p className="mt-1 text-[10px] font-semibold text-emerald-200/55">{selected.status === "closed" ? "Conversation closed · send a message to reopen" : "Conversation open"}</p></header>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
                  {messages.map((message) => {
                    const mine = message.sender === "customer";
                    const system = message.sender === "system";
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${system ? "border border-white/8 bg-white/[0.025] text-white/45" : mine ? "bg-white text-black" : "border border-white/10 bg-white/[0.07] text-white"}`}>
                          <p className="whitespace-pre-wrap text-sm font-medium leading-6">{message.body}</p>
                          <p className={`mt-1.5 text-[9px] font-semibold ${mine ? "text-black/45" : "text-white/25"}`}>{system ? "ORVIX" : mine ? "You" : "Customer Service"} · {when(message.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} className="border-t border-white/8 p-3 sm:p-4">
                  <div className="flex gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message to Customer Service…" rows={2} className="min-h-[48px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-medium outline-none placeholder:text-white/20 focus:border-white/25" /><button disabled={busy || !draft.trim()} className="rounded-2xl bg-white px-5 text-xs font-black text-black disabled:opacity-40">Send</button></div>
                </form>
              </>
            ) : <div className="grid flex-1 place-items-center p-8 text-center"><div><p className="text-lg font-black text-white/65">Customer Service</p><p className="mt-2 max-w-sm text-xs leading-5 text-white/30">Start a conversation and every reply will stay saved inside your account.</p><button type="button" onClick={() => void startConversation()} className="mt-5 h-11 rounded-xl bg-white px-4 text-xs font-black text-black">Start Conversation</button></div></div>}
          </div>
        </section>
      </div>
    </main>
  );
}
