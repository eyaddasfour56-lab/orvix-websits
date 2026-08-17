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
  orderNumber?: string;
  previousStatus?: string;
  status?: string;
  statusLabel?: string;
  changed?: boolean;
  target?: string;
  productSlug?: string;
  variantKey?: string;
  value?: string | number | boolean;
  command?: string;
  section?: string;
  href?: string;
  entryType?: "expense" | "income" | "capital" | "settlement";
  category?: string;
  amount?: number;
  paidBy?: "me" | "ahmed_samy" | null;
  receivedBy?: "me" | "ahmed_samy" | null;
  fromPerson?: "me" | "ahmed_samy" | null;
  toPerson?: "me" | "ahmed_samy" | null;
  entryDate?: string;
};

type AssistantResult = {
  success?: boolean;
  answer?: string;
  message?: string;
  ai?: boolean;
  action?: AssistantAction;
};

export default function OrvixAiPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    "اكتب أي حاجة بطريقتك — عربي، English أو Franco. مثال: make google fitbit air price 7400"
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

      setAnswer(result.answer || "No answer available.");
      setLastAction(result.action || null);

      if (
        result.action?.type === "order_status_update" ||
        result.action?.type === "commerce_update" ||
        result.action?.type === "cashflow_entry_created" ||
        result.action?.type === "admin_action"
      ) {
        setMode("action");
        window.dispatchEvent(
          new CustomEvent("orvix-admin-action-updated", {
            detail: result.action,
          })
        );
      } else {
        setMode(result.ai === false ? "fallback" : "ai");
      }

      setQuestion("");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "ORVIX AI could not answer right now.");
      setMode("");
      setLastAction(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-violet-200/50">ORVIX ADMIN</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">ORVIX AI</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/38 sm:text-base">
            Full Admin Copilot. Talk naturally in Arabic, English or Franco and ORVIX AI can read live dashboard data or execute supported actions across the admin.
          </p>
        </div>

        <Link
          href="/admin/command-center"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-xs font-black text-white/65 transition hover:bg-white/[0.07] hover:text-white"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-[30px] border border-violet-300/15 bg-[#101013] shadow-2xl shadow-black/30">
        <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-300/20 bg-violet-500/[0.12] text-lg text-violet-100">✦</span>
            <div>
              <p className="text-xs font-black text-white">FULL ADMIN COPILOT + LIVE ORVIX DATA</p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/28">
                Orders · Products · Inventory · Cash Flow · Discounts · Reviews · Waitlist · Chats · Bosta · Commerce · Analytics · Features · Maintenance
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-7">
          <div
            className={`min-h-[190px] whitespace-pre-wrap rounded-[24px] border p-5 text-sm font-bold leading-7 sm:min-h-[230px] sm:p-6 sm:text-base ${
              mode === "action"
                ? "border-emerald-300/15 bg-emerald-500/[0.07] text-emerald-50"
                : "border-violet-300/10 bg-violet-500/[0.05] text-violet-50"
            }`}
          >
            {answer}
          </div>

          {lastAction?.type === "confirmation_required" && lastAction.command && (
            <button
              type="button"
              onClick={() => setQuestion(lastAction.command || "")}
              className="mt-3 rounded-full border border-amber-300/20 bg-amber-500/[0.08] px-4 py-2 text-[11px] font-black text-amber-100"
            >
              Load confirmed command
            </button>
          )}

          {mode && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
                {mode === "action" ? "Action complete" : mode === "ai" ? "AI + live data" : "Live data / safe action"}
              </span>

              {lastAction?.type === "order_status_update" && (
                <Link href="/admin/orders" className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100">
                  View Orders
                </Link>
              )}

              {lastAction?.type === "commerce_update" && (
                <Link href="/admin/commerce" className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100">
                  Open Commerce Control
                </Link>
              )}

              {lastAction?.type === "cashflow_entry_created" && (
                <Link href="/admin/cashflow" className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100">
                  Open Cash Flow
                </Link>
              )}

              {lastAction?.type === "admin_action" && lastAction.href && (
                <Link href={lastAction.href} className="rounded-full border border-emerald-300/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-black text-emerald-100">
                  Open {lastAction.section || "Admin"}
                </Link>
              )}
            </div>
          )}

          <form onSubmit={ask} className="mt-5">
            <label htmlFor="orvix-ai-question" className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-white/28">
              Message ORVIX AI
            </label>
            <textarea
              id="orvix-ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="اكتب اللي عايزه بطريقتك... مثال: 5aly google fitbit air 7400"
              rows={4}
              className="w-full resize-none rounded-[22px] border border-white/10 bg-[#09090a] px-4 py-4 text-base font-semibold text-white outline-none transition placeholder:text-white/20 focus:border-violet-300/30 focus:ring-2 focus:ring-violet-500/10"
            />

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="mt-3 h-12 w-full rounded-2xl bg-violet-300 px-5 text-sm font-black text-black transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:min-w-[150px]"
            >
              {loading ? "Working..." : "Send"}
            </button>
          </form>

          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/25">Try anything</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "add to expenses 120 tools paid by me",
                "make google fitbit air price 7400",
                "approve latest review",
                "turn ORVIX15 off",
                "close the website",
                "show me all low stock products",
                "how much did i spend this month?",
                "reply to latest waiting customer tell him his order is confirmed",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[11px] font-black text-white/52 transition hover:bg-white/[0.07] hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-[10px] font-semibold leading-5 text-white/25">
            Normal admin actions execute immediately when the intent and target are clear. Delete/reset actions require one explicit confirmation before ORVIX AI executes them.
          </p>
        </div>
      </section>
    </main>
  );
}
