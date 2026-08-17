"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Person = "me" | "ahmed_samy";
type QuickType = "expense" | "income" | "capital";
type EntryType = QuickType | "settlement";

type Entry = {
  id: string;
  entry_type: EntryType;
  category: string;
  amount: number | string;
  description?: string | null;
  paid_by?: Person | null;
  received_by?: Person | null;
  from_person?: Person | null;
  to_person?: Person | null;
  entry_date: string;
};

type Settlement = {
  from: Person;
  to: Person;
  amount: number;
} | null;

type Summary = {
  totalCashIn: number;
  expenses: number;
  netCash: number;
  realProfit: number;
  expectedSales: number;
  expensesFromMe: number;
  expensesFromAhmedSamy: number;
  incomeToMe: number;
  incomeToAhmedSamy: number;
  capitalFromMe: number;
  capitalFromAhmedSamy: number;
  suggestedSettlement: Settlement;
  missingCostProducts: Array<{ slug: string; name: string }>;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  entries?: Entry[];
  summary?: Summary;
};

const expenseCategories = ["Stock", "Packaging", "Ads & Marketing", "Courier", "Transport / Uber", "Tools", "Other"];
const incomeCategories = ["Extra Sale", "Deposit", "Refund Received", "Other Income"];

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `${safe.toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function personLabel(person: Person | null | undefined) {
  return person === "ahmed_samy" ? "Ahmed Samy" : "Me";
}

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function entryIcon(entry: Entry) {
  if (entry.entry_type === "expense") return "−";
  if (entry.entry_type === "income") return "+";
  if (entry.entry_type === "capital") return "↥";
  return "↔";
}

function entryPeople(entry: Entry) {
  if (entry.entry_type === "expense") return `Paid by ${personLabel(entry.paid_by)}`;
  if (entry.entry_type === "income") return `To ${personLabel(entry.received_by)}`;
  if (entry.entry_type === "capital") return `From ${personLabel(entry.paid_by)}`;
  return `${personLabel(entry.from_person)} → ${personLabel(entry.to_person)}`;
}

function StatCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: "green" | "red" | "blue" | "white" }) {
  const classes = {
    green: "border-emerald-400/20 bg-emerald-500/[0.08]",
    red: "border-red-400/20 bg-red-500/[0.07]",
    blue: "border-blue-400/20 bg-blue-500/[0.07]",
    white: "border-white/10 bg-white/[0.045]",
  }[tone];

  return (
    <article className={`rounded-[26px] border p-5 ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs font-bold text-white/35">{helper}</p>
    </article>
  );
}

export default function CashflowSimple() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [quickType, setQuickType] = useState<QuickType | null>(null);
  const [person, setPerson] = useState<Person>("me");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [note, setNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cashflow", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.summary) {
        throw new Error(result.message || "Could not load cash flow.");
      }
      setSummary(result.summary);
      setEntries(result.entries || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load cash flow.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openQuick(type: QuickType) {
    setQuickType(type);
    setAmount("");
    setNote("");
    if (type === "expense") setCategory(expenseCategories[0]);
    if (type === "income") setCategory(incomeCategories[0]);
    if (type === "capital") setCategory("Owner Capital");
  }

  async function saveQuick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickType) return;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cashflow", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: quickType,
          category,
          amount: numericAmount,
          description: note.trim() || null,
          paidBy: quickType === "expense" || quickType === "capital" ? person : null,
          receivedBy: quickType === "income" ? person : null,
          entryDate: today(),
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save.");

      setNotice(`${quickType === "expense" ? "Expense" : quickType === "income" ? "Income" : "Capital"} saved.`);
      setQuickType(null);
      setAmount("");
      setNote("");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const recent = entries.slice(0, 7);
  const settlement = summary?.suggestedSettlement || null;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-7 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">ORVIX</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Cash Flow</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/cashflow/advanced" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/55">Advanced</Link>
            <button type="button" onClick={() => void load()} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black">Refresh</button>
          </div>
        </header>

        {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-100">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] px-4 py-3 text-sm font-bold text-emerald-100">{notice}</div>}

        {loading && !summary ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-white/50">Loading…</div>
        ) : summary ? (
          <>
            <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Money Now" value={money(summary.netCash)} helper="Current net cash" tone={summary.netCash >= 0 ? "green" : "red"} />
              <StatCard label="Profit" value={money(summary.realProfit)} helper="Real profit" tone={summary.realProfit >= 0 ? "green" : "red"} />
              <StatCard label="Money In" value={money(summary.totalCashIn)} helper="Sales + income + capital" tone="blue" />
              <StatCard label="Money Out" value={money(summary.expenses)} helper="All recorded expenses" tone="red" />
            </section>

            <section className="mt-4 rounded-[30px] border border-violet-400/20 bg-violet-500/[0.07] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200/55">BETWEEN YOU TWO</p>
                {settlement ? (
                  <>
                    <p className="mt-2 text-2xl font-black sm:text-3xl">{personLabel(settlement.from)} → {personLabel(settlement.to)}</p>
                    <p className="mt-1 text-4xl font-black text-violet-100">{money(settlement.amount)}</p>
                  </>
                ) : (
                  <p className="mt-2 text-3xl font-black text-emerald-200">Balanced ✓</p>
                )}
              </div>
              <Link href="/admin/cashflow/transfer" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-violet-300 px-6 py-4 text-sm font-black text-black sm:mt-0 sm:w-auto">Transfer</Link>
            </section>

            <section className="mt-4 grid gap-3 md:grid-cols-2">
              <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between"><h2 className="text-xl font-black">Me</h2><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/40">My money</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-red-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Paid</p><p className="mt-1 text-sm font-black">{money(summary.expensesFromMe)}</p></div>
                  <div className="rounded-2xl bg-emerald-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Received</p><p className="mt-1 text-sm font-black">{money(summary.incomeToMe)}</p></div>
                  <div className="rounded-2xl bg-blue-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Capital</p><p className="mt-1 text-sm font-black">{money(summary.capitalFromMe)}</p></div>
                </div>
              </article>

              <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between"><h2 className="text-xl font-black">Ahmed Samy</h2><span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/40">His money</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-red-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Paid</p><p className="mt-1 text-sm font-black">{money(summary.expensesFromAhmedSamy)}</p></div>
                  <div className="rounded-2xl bg-emerald-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Received</p><p className="mt-1 text-sm font-black">{money(summary.incomeToAhmedSamy)}</p></div>
                  <div className="rounded-2xl bg-blue-500/[0.06] p-3"><p className="text-[10px] font-black uppercase text-white/35">Capital</p><p className="mt-1 text-sm font-black">{money(summary.capitalFromAhmedSamy)}</p></div>
                </div>
              </article>
            </section>

            <section className="mt-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/35">QUICK ACTIONS</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button type="button" onClick={() => openQuick("expense")} className="rounded-[24px] border border-red-400/15 bg-red-500/[0.07] p-5 text-left transition hover:bg-red-500/[0.11]"><span className="text-2xl font-black">−</span><p className="mt-2 text-sm font-black">Add Expense</p></button>
                <button type="button" onClick={() => openQuick("income")} className="rounded-[24px] border border-emerald-400/15 bg-emerald-500/[0.07] p-5 text-left transition hover:bg-emerald-500/[0.11]"><span className="text-2xl font-black">+</span><p className="mt-2 text-sm font-black">Add Income</p></button>
                <button type="button" onClick={() => openQuick("capital")} className="rounded-[24px] border border-blue-400/15 bg-blue-500/[0.07] p-5 text-left transition hover:bg-blue-500/[0.11]"><span className="text-2xl font-black">↥</span><p className="mt-2 text-sm font-black">Add Capital</p></button>
                <Link href="/admin/cashflow/transfer" className="rounded-[24px] border border-violet-400/15 bg-violet-500/[0.07] p-5 text-left transition hover:bg-violet-500/[0.11]"><span className="text-2xl font-black">↔</span><p className="mt-2 text-sm font-black">Transfer</p></Link>
              </div>
            </section>

            {quickType && (
              <form onSubmit={saveQuick} className="mt-4 rounded-[30px] border border-white/10 bg-[#0d0d0d] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black">{quickType === "expense" ? "Add Expense" : quickType === "income" ? "Add Income" : "Add Capital"}</h2>
                  <button type="button" onClick={() => setQuickType(null)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-black text-white/50">Close</button>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Who?
                    <select value={person} onChange={(event) => setPerson(event.target.value as Person)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 py-4 text-base font-black text-white outline-none"><option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option></select>
                  </label>
                  <label className="text-xs font-black uppercase tracking-[0.12em] text-white/40">Amount
                    <input autoFocus type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0 EGP" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 py-4 text-xl font-black text-white outline-none placeholder:text-white/15" />
                  </label>
                </div>
                {quickType !== "capital" && (
                  <label className="mt-3 block text-xs font-black uppercase tracking-[0.12em] text-white/40">Category
                    <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 py-4 text-white outline-none">{(quickType === "expense" ? expenseCategories : incomeCategories).map((item) => <option key={item} value={item}>{item}</option>)}</select>
                  </label>
                )}
                <label className="mt-3 block text-xs font-black uppercase tracking-[0.12em] text-white/40">Note <span className="normal-case tracking-normal text-white/25">optional</span>
                  <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="Short note" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#151515] px-4 py-4 text-white outline-none placeholder:text-white/20" />
                </label>
                <button disabled={saving} className="mt-4 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
              </form>
            )}

            <section className="mt-7 rounded-[30px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Recent Activity</h2><Link href="/admin/cashflow/advanced" className="text-xs font-black text-white/35">See all →</Link></div>
              <div className="mt-4 divide-y divide-white/8">
                {recent.length === 0 ? <p className="py-6 text-center text-sm text-white/35">No activity yet.</p> : recent.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-lg font-black">{entryIcon(entry)}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{entry.category}</p><p className="mt-0.5 truncate text-xs text-white/35">{entryPeople(entry)} · {entry.entry_date}</p></div>
                    <p className={`shrink-0 text-sm font-black ${entry.entry_type === "expense" ? "text-red-200" : entry.entry_type === "income" ? "text-emerald-200" : "text-white"}`}>{entry.entry_type === "expense" ? "−" : entry.entry_type === "income" ? "+" : ""}{money(entry.amount)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.025] px-5 py-4">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-white/30">Expected Sales</p><p className="mt-1 text-lg font-black">{money(summary.expectedSales)}</p></div>
              {summary.missingCostProducts.length > 0 && <Link href="/admin/cashflow/advanced" className="rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-4 py-2 text-xs font-black text-amber-100">Set product cost →</Link>}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
