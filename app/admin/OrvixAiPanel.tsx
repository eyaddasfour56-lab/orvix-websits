"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AssistantAction = {
  type?:
    | "order_status_update"
    | "commerce_update"
    | "cashflow_entry_created"
    | "admin_action"
    | "confirmation_required";
  command?: string;
  section?: string;
  href?: string;
};

type AssistantResult = {
  success?: boolean;
  answer?: string;
  message?: string;
  ai?: boolean;
  action?: AssistantAction;
};

type Props = {
  onActionComplete?: () => void | Promise<void>;
};

export default function OrvixAiPanel({ onActionComplete }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "اكتب أي أمر بطريقتك — عربي، English أو Franco. أنا متوصل بكل الـAdmin وممكن أنفذ أو أقرأ البيانات Live."
  );
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"ai" | "fallback" | "action" | "">("");
  const [lastAction, setLastAction] = useState<AssistantAction | null>(null);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = question.trim();
    if (!value || loading) return;

    setLoading(true);
    setLastAction(null);

    try {
      const response = await fetch("/api/admin/os/copilot", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });

      const result = (await response.json()) as AssistantResult;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not answer.");
      }

      setAnswer(result.answer || "Done.");
      setLastAction(result.action || null);

      const actionCompleted =
        result.action?.type === "order_status_update" ||
        result.action?.type === "commerce_update" ||
        result.action?.type === "cashflow_entry_created" ||
        result.action?.type === "admin_action";

      if (actionCompleted) {
        setMode("action");
        window.dispatchEvent(
          new CustomEvent("orvix-admin-action-updated", {
            detail: result.action,
          })
        );
        await onActionComplete?.();
      } else {
        setMode(result.ai === false ? "fallback" : "ai");
      }

      setQuestion("");
    } catch (error) {
      setAnswer(
        error instanceof Error
          ? error.message
          : "ORVIX AI could not answer right now."
      );
      setMode("");
      setLastAction(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[30px] border border-violet-300/20 bg-gradient-to-br from-violet-500/[0.10] via-[#101013] to-[#09090a] shadow-2xl shadow-violet-950/20">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/20 bg-violet-500/[0.14] text-xl text-violet-100">✦</span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100">ORVIX AI — Full Admin Copilot</p>
            <p className="mt-1 text-[11px] font-semibold text-white/35">
              Orders · Bosta · Products · Inventory · Cash Flow · Discounts · Reviews · Waitlist · Chats · Analytics · Store Controls
            </p>
          </div>
        </div>

        <Link
          href="/admin/ai"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-white/60 transition hover:bg-white/[0.08] hover:text-white"
        >
          Full AI View
        </Link>
      </div>

      <div className="p-4 sm:p-6">
        <div
          className={`min-h-[120px] whitespace-pre-wrap rounded-[22px] border p-4 text-sm font-bold leading-7 sm:p-5 ${
            mode === "action"
              ? "border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-50"
              : "border-violet-300/10 bg-black/25 text-violet-50"
          }`}
        >
          {answer}
        </div>

        {lastAction?.type === "confirmation_required" && lastAction.command && (
          <button
            type="button"
            onClick={() => setQuestion(lastAction.command || "")}
            className="mt-3 rounded-full border border-amber-300/20 bg-amber-500/[0.10] px-4 py-2 text-[11px] font-black text-amber-100"
          >
            Load confirmed command
          </button>
        )}

        {mode && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
              {mode === "action"
                ? "Action complete · Dashboard refreshed"
                : mode === "ai"
                  ? "AI + live admin data"
                  : "Live data / safe action"}
            </span>

            {lastAction?.href && (
              <Link
                href={lastAction.href}
                className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100"
              >
                Open {lastAction.section || "changed section"}
              </Link>
            )}
          </div>
        )}

        <form onSubmit={ask} className="mt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label
                htmlFor="main-admin-orvix-ai"
                className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/30"
              >
                Tell ORVIX AI what to do
              </label>
              <textarea
                id="main-admin-orvix-ai"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="مثال: 5aly order ORVIX-123 confirmed / 7ot 120 tools expenses 3alaya / make fitbit 7400"
                rows={3}
                className="w-full resize-none rounded-[20px] border border-white/10 bg-black/45 px-4 py-3.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-violet-300/35 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="h-12 rounded-2xl bg-violet-300 px-7 text-sm font-black text-black transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {loading ? "Working..." : "Execute"}
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "profit today",
            "show low stock",
            "add 120 tools expenses paid by me",
            "approve latest review",
            "turn ORVIX15 off",
            "close website",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuestion(prompt)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-white/45 transition hover:bg-white/[0.08] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[10px] font-semibold leading-5 text-white/25">
          Clear admin actions execute immediately. Irreversible delete/reset actions still ask for one explicit confirmation.
        </p>
      </div>
    </section>
  );
}
