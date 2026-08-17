"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Person = "me" | "ahmed_samy";

type SuggestedSettlement = {
  from: Person;
  to: Person;
  amount: number;
} | null;

type Summary = {
  partnerPositionMe: number;
  partnerPositionAhmed: number;
  suggestedSettlement: SuggestedSettlement;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  summary?: Summary;
};

function personLabel(person: Person) {
  return person === "me" ? "Me" : "Ahmed Samy";
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `${safe.toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function QuickTransferPage() {
  const [fromPerson, setFromPerson] = useState<Person>("me");
  const [toPerson, setToPerson] = useState<Person>("ahmed_samy");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cashflow", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.summary) {
        throw new Error(result.message || "Could not load partner balances.");
      }
      setSummary(result.summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load partner balances.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function swapPeople() {
    setFromPerson(toPerson);
    setToPerson(fromPerson);
  }

  function useSuggestedTransfer() {
    const suggested = summary?.suggestedSettlement;
    if (!suggested) return;
    setFromPerson(suggested.from);
    setToPerson(suggested.to);
    setAmount(String(suggested.amount));
    setNote("Partner balance settlement");
  }

  async function transferNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid transfer amount.");
      return;
    }
    if (fromPerson === toPerson) {
      setError("Sender and recipient must be different.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/cashflow", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "settlement",
          category: "Quick Transfer",
          amount: numericAmount,
          description: note.trim() || "Instant partner transfer",
          fromPerson,
          toPerson,
          entryDate: today(),
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not record transfer.");
      }

      setNotice(`${money(numericAmount)} transferred from ${personLabel(fromPerson)} to ${personLabel(toPerson)} in Cash Flow.`);
      setAmount("");
      setNote("");
      await load();
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : "Could not record transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050505] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-violet-200/70">ORVIX CASH FLOW</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-6xl">Quick Transfer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
              Record a transfer between Me and Ahmed Samy instantly. This updates the ORVIX partner balances; it does not send money through a bank or wallet.
            </p>
          </div>
          <Link href="/admin/cashflow" className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black text-white">Full Cash Flow</Link>
        </div>

        {error && <div className="mt-6 rounded-[22px] border border-red-400/20 bg-red-500/[0.08] p-5 text-sm font-bold text-red-100">{error}</div>}
        {notice && <div className="mt-6 rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.08] p-5 text-sm font-bold text-emerald-100">{notice}</div>}

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-[28px] border border-amber-400/15 bg-amber-500/[0.06] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/60">ME POSITION</p>
            <p className="mt-3 text-3xl font-black">{loading ? "…" : money(summary?.partnerPositionMe)}</p>
          </article>
          <article className="rounded-[28px] border border-blue-400/15 bg-blue-500/[0.06] p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200/60">AHMED SAMY POSITION</p>
            <p className="mt-3 text-3xl font-black">{loading ? "…" : money(summary?.partnerPositionAhmed)}</p>
          </article>
        </section>

        {summary?.suggestedSettlement && (
          <section className="mt-4 flex flex-col gap-4 rounded-[26px] border border-violet-400/20 bg-violet-500/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200/60">SUGGESTED</p>
              <p className="mt-2 text-lg font-black">
                {personLabel(summary.suggestedSettlement.from)} → {personLabel(summary.suggestedSettlement.to)} · {money(summary.suggestedSettlement.amount)}
              </p>
            </div>
            <button type="button" onClick={useSuggestedTransfer} className="rounded-2xl bg-violet-300 px-5 py-3 text-sm font-black text-black">Use Suggested</button>
          </section>
        )}

        <form onSubmit={transferNow} className="mt-5 rounded-[34px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.24)] sm:p-8">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <label className="text-sm font-bold text-white/65">
              From
              <select value={fromPerson} onChange={(event) => {
                const next = event.target.value as Person;
                setFromPerson(next);
                if (next === toPerson) setToPerson(next === "me" ? "ahmed_samy" : "me");
              }} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-4 text-base font-black text-white outline-none">
                <option value="me">Me</option>
                <option value="ahmed_samy">Ahmed Samy</option>
              </select>
            </label>

            <button type="button" onClick={swapPeople} className="mb-0.5 h-14 rounded-2xl border border-white/10 bg-white/[0.06] px-5 text-xl font-black transition hover:bg-white/[0.1]" aria-label="Swap sender and recipient">⇄</button>

            <label className="text-sm font-bold text-white/65">
              To
              <select value={toPerson} onChange={(event) => {
                const next = event.target.value as Person;
                setToPerson(next);
                if (next === fromPerson) setFromPerson(next === "me" ? "ahmed_samy" : "me");
              }} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-4 text-base font-black text-white outline-none">
                <option value="me">Me</option>
                <option value="ahmed_samy">Ahmed Samy</option>
              </select>
            </label>
          </div>

          <label className="mt-6 block text-sm font-bold text-white/65">
            Amount (EGP)
            <input autoFocus inputMode="decimal" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="mt-2 w-full rounded-[22px] border border-white/10 bg-[#0d0d0d] px-5 py-5 text-3xl font-black tracking-tight text-white outline-none placeholder:text-white/15 focus:border-violet-300/40" />
          </label>

          <label className="mt-5 block text-sm font-bold text-white/65">
            Note <span className="font-normal text-white/30">(optional)</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Why are you transferring this?" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-4 text-white outline-none placeholder:text-white/25" />
          </label>

          <div className="mt-7 rounded-[22px] border border-white/10 bg-black/30 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">TRANSFER PREVIEW</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xl font-black sm:text-2xl">
              <span>{personLabel(fromPerson)}</span>
              <span className="text-violet-300">→</span>
              <span>{personLabel(toPerson)}</span>
              <span className="ml-auto text-violet-200">{money(amount)}</span>
            </div>
          </div>

          <button disabled={saving} type="submit" className="mt-5 w-full rounded-[22px] bg-violet-300 px-5 py-5 text-lg font-black text-black transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Transferring…" : "Transfer Now"}
          </button>
        </form>
      </div>
    </main>
  );
}
