"use client";

import { FormEvent, useState } from "react";

type AssistantResult = {
  success?: boolean;
  answer?: string;
  message?: string;
  ai?: boolean;
};

export default function AdminOrvixAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("اسألني عن ORVIX: الربح، الأوردرات، الستوك، العملاء أو أي حاجة في البزنس.");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ai" | "fallback" | "">("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/os/assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });
      const result = (await response.json()) as AssistantResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not answer.");
      setAnswer(result.answer || "No answer available.");
      setMode(result.ai === false ? "fallback" : "ai");
      setQuestion("");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "ORVIX Assistant could not answer right now.");
      setMode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-xl border border-violet-300/25 bg-violet-500/[0.12] px-3 py-2 text-[11px] font-black text-violet-100 transition hover:bg-violet-500/[0.2] sm:text-xs"
      >
        ✦ ORVIX AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-2xl rounded-[30px] border border-violet-300/20 bg-[#0a0a0a] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/55">ORVIX AI</p>
                <h2 className="mt-1 text-2xl font-black text-white">Ask your business</h2>
                <p className="mt-1 text-xs text-white/30">Uses live ORVIX admin data.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-white/45">Close</button>
            </div>

            <div className="mt-5 min-h-[120px] rounded-2xl border border-violet-300/10 bg-violet-500/[0.05] p-4 text-sm font-bold leading-6 text-violet-50">
              {answer}
            </div>

            {mode && (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                {mode === "ai" ? "AI + LIVE DATA" : "LIVE DATA FALLBACK"}
              </p>
            )}

            <form onSubmit={ask} className="mt-4 flex gap-2">
              <input
                autoFocus
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="كام ربحنا؟ الستوك كام؟ إيه الأوردرات اللي محتاجة action؟"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20"
              />
              <button disabled={loading} className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
                {loading ? "..." : "Ask"}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {["Profit today", "Stock status", "Delayed orders", "Top customer"].map((prompt) => (
                <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/45">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
