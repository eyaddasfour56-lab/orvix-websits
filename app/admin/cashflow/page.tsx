"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PaidBy = "me" | "ahmed_samy";

type Entry = {
  id: string;
  entry_type: "income" | "expense";
  category: string;
  amount: number | string;
  description?: string | null;
  paid_by?: PaidBy | null;
  entry_date: string;
  created_at: string;
};

type Summary = {
  deliveredSales: number;
  manualIncome: number;
  totalCashIn: number;
  expenses: number;
  expensesFromMe: number;
  expensesFromAhmedSamy: number;
  unassignedExpenses: number;
  netCash: number;
  expectedSales: number;
  deliveredOrders: number;
  activeOrders: number;
  monthCashIn: number;
  monthExpenses: number;
  monthExpensesFromMe: number;
  monthExpensesFromAhmedSamy: number;
  monthNetCash: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
  }>;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  entries?: Entry[];
  summary?: Summary;
};

const expenseCategories = [
  "Stock",
  "Packaging",
  "Ads & Marketing",
  "Courier",
  "Transport / Uber",
  "Tools",
  "Refund",
  "Other",
];

const incomeCategories = [
  "Extra Sale",
  "Deposit",
  "Refund Received",
  "Other Income",
];

const payerOptions: Array<{ value: PaidBy; label: string }> = [
  { value: "me", label: "Me" },
  { value: "ahmed_samy", label: "Ahmed Samy" },
];

function localDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  const safe = Number.isFinite(parsed) ? parsed : 0;
  return `${safe.toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  })} EGP`;
}

function payerLabel(value: PaidBy | null | undefined) {
  if (value === "me") return "Me";
  if (value === "ahmed_samy") return "Ahmed Samy";
  return "Unassigned";
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "green" | "red" | "blue" | "amber";
}) {
  const toneClasses = {
    neutral: "border-white/10 bg-white/[0.045]",
    green: "border-emerald-400/20 bg-emerald-500/[0.08]",
    red: "border-red-400/20 bg-red-500/[0.07]",
    blue: "border-blue-400/20 bg-blue-500/[0.07]",
    amber: "border-amber-400/20 bg-amber-500/[0.07]",
  }[tone];

  return (
    <article
      className={`rounded-[26px] border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${toneClasses}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/45">{helper}</p>
    </article>
  );
}

export default function CashflowPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [otherExpense, setOtherExpense] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");
  const [entryDate, setEntryDate] = useState(localDateInputValue());

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
        throw new Error(result.message || "Could not load cash flow.");
      }

      setEntries(result.entries || []);
      setSummary(result.summary);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load cash flow."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setCategory(
      entryType === "expense" ? expenseCategories[0] : incomeCategories[0]
    );
    setOtherExpense("");
  }, [entryType]);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const isOtherExpense = entryType === "expense" && category === "Other";
    const otherExpenseName = otherExpense.trim();

    if (isOtherExpense && !otherExpenseName) {
      setError("Tell us what the Other expense is.");
      return;
    }

    const savedCategory = isOtherExpense
      ? `Other: ${otherExpenseName.slice(0, 70)}`
      : category;

    setSaving(true);

    try {
      const response = await fetch("/api/admin/cashflow", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType,
          category: savedCategory,
          amount,
          description,
          paidBy: entryType === "expense" ? paidBy : null,
          entryDate,
        }),
      });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save entry.");
      }

      setAmount("");
      setDescription("");
      setOtherExpense("");
      setNotice(
        entryType === "expense"
          ? `Expense saved under ${payerLabel(paidBy)}.`
          : "Income saved."
      );
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save entry."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this cash flow entry?")) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/cashflow?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete entry.");
      }

      setNotice("Entry deleted.");
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete entry."
      );
    } finally {
      setDeletingId("");
    }
  }

  const categories =
    entryType === "expense" ? expenseCategories : incomeCategories;

  const maxCategoryExpense = useMemo(
    () =>
      Math.max(
        ...(summary?.topExpenseCategories.map((item) => item.amount) || [0]),
        1
      ),
    [summary]
  );

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/70">
              ORVIX ADMIN
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-6xl">
              Cash Flow
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45 sm:text-base">
              Delivered order product totals count automatically as cash in. Record expenses and choose whether they were paid by you or Ahmed Samy.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
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

        {error && (
          <div className="mt-6 rounded-[22px] border border-red-400/20 bg-red-500/[0.08] p-5 text-sm font-bold text-red-100">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-6 rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.08] p-5 text-sm font-bold text-emerald-100">
            {notice}
          </div>
        )}

        {loading && !summary ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-white/55">
            Loading cash flow…
          </div>
        ) : summary ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Cash In"
                value={money(summary.totalCashIn)}
                helper={`${money(summary.deliveredSales)} from ${summary.deliveredOrders} delivered orders`}
                tone="green"
              />
              <MetricCard
                label="Cash Out"
                value={money(summary.expenses)}
                helper={
                  summary.unassignedExpenses > 0
                    ? `${money(summary.unassignedExpenses)} still unassigned`
                    : "All manually recorded business expenses"
                }
                tone="red"
              />
              <MetricCard
                label="Expenses from Me"
                value={money(summary.expensesFromMe)}
                helper={`${money(summary.monthExpensesFromMe)} this month`}
                tone="amber"
              />
              <MetricCard
                label="Expenses from Ahmed Samy"
                value={money(summary.expensesFromAhmedSamy)}
                helper={`${money(summary.monthExpensesFromAhmedSamy)} this month`}
                tone="blue"
              />
              <MetricCard
                label="Net Cash"
                value={money(summary.netCash)}
                helper="Cash in minus all recorded expenses"
                tone={summary.netCash >= 0 ? "green" : "red"}
              />
              <MetricCard
                label="Expected Sales"
                value={money(summary.expectedSales)}
                helper={`${summary.activeOrders} active orders not delivered yet`}
                tone="blue"
              />
              <MetricCard
                label="This Month"
                value={money(summary.monthNetCash)}
                helper={`${money(summary.monthCashIn)} in • ${money(summary.monthExpenses)} out`}
                tone="amber"
              />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <form
                onSubmit={addEntry}
                className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8"
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  NEW ENTRY
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Record money in or out
                </h2>

                <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1.5">
                  <button
                    type="button"
                    onClick={() => setEntryType("expense")}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                      entryType === "expense"
                        ? "bg-red-500 text-white"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType("income")}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                      entryType === "income"
                        ? "bg-emerald-500 text-black"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Extra Income
                  </button>
                </div>

                {entryType === "expense" && (
                  <label className="mt-5 block text-sm font-bold text-white/65">
                    Paid by
                    <select
                      value={paidBy}
                      onChange={(event) => setPaidBy(event.target.value as PaidBy)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      {payerOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-white/65">
                    Category
                    <select
                      value={category}
                      onChange={(event) => {
                        const nextCategory = event.target.value;
                        setCategory(nextCategory);
                        if (nextCategory !== "Other") setOtherExpense("");
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none focus:border-white/30"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-white/65">
                    Amount (EGP)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      required
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="e.g. 300"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                    />
                  </label>
                </div>

                {entryType === "expense" && category === "Other" && (
                  <label className="mt-4 block text-sm font-bold text-white/65">
                    What is the other expense?
                    <input
                      type="text"
                      required
                      maxLength={70}
                      value={otherExpense}
                      onChange={(event) => setOtherExpense(event.target.value)}
                      placeholder="e.g. Customs fee, printing, repair"
                      className="mt-2 w-full rounded-2xl border border-amber-300/20 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-amber-300/50"
                    />
                  </label>
                )}

                <label className="mt-4 block text-sm font-bold text-white/65">
                  Date
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(event) => setEntryDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none focus:border-white/30"
                  />
                </label>

                <label className="mt-4 block text-sm font-bold text-white/65">
                  Note
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Example: 10 boxes + delivery"
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className={`mt-5 w-full rounded-2xl px-5 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    entryType === "expense"
                      ? "bg-red-500 text-white hover:bg-red-400"
                      : "bg-emerald-400 text-black hover:bg-emerald-300"
                  }`}
                >
                  {saving
                    ? "Saving…"
                    : entryType === "expense"
                      ? "Add Expense"
                      : "Add Income"}
                </button>
              </form>

              <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                      EXPENSE BREAKDOWN
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Where the money is going
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-white/45">
                    All-time
                  </span>
                </div>

                {summary.topExpenseCategories.length === 0 ? (
                  <div className="mt-8 rounded-[22px] border border-dashed border-white/10 p-7 text-center text-sm text-white/35">
                    Add your first expense and the breakdown will appear here.
                  </div>
                ) : (
                  <div className="mt-8 space-y-6">
                    {summary.topExpenseCategories.map((item) => (
                      <div key={item.category}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <span className="font-bold text-white/65">
                            {item.category}
                          </span>
                          <strong>{money(item.amount)}</strong>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-300 to-red-500"
                            style={{
                              width: `${Math.max(
                                (item.amount / maxCategoryExpense) * 100,
                                4
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-amber-400/15 bg-amber-500/[0.06] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/60">
                      ME
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {money(summary.expensesFromMe)}
                    </p>
                    <p className="mt-1 text-sm text-white/45">Total paid by you</p>
                  </div>
                  <div className="rounded-[22px] border border-blue-400/15 bg-blue-500/[0.06] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200/60">
                      AHMED SAMY
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {money(summary.expensesFromAhmedSamy)}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Total paid by Ahmed Samy
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-emerald-400/15 bg-emerald-500/[0.06] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/60">
                    AUTOMATIC SALES
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    You do not need to add normal website sales manually. When an order becomes
                    <strong className="text-white"> Delivered</strong>, its products total is counted automatically. Delivery fees are excluded because the courier collects them separately.
                  </p>
                </div>
              </article>
            </section>

            <section className="mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035]">
              <div className="flex flex-col gap-2 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                    CASH FLOW LOG
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Manual entries</h2>
                </div>
                <p className="text-sm text-white/35">{entries.length} entries</p>
              </div>

              {entries.length === 0 ? (
                <div className="p-8 text-center text-sm text-white/35">
                  No manual cash flow entries yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-black/20 text-xs uppercase tracking-[0.14em] text-white/35">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Paid by</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Note</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.07]">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-white/[0.025]">
                          <td className="px-6 py-4 font-bold text-white/60">
                            {entry.entry_date}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black ${
                                entry.entry_type === "expense"
                                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                              }`}
                            >
                              {entry.entry_type === "expense" ? "Expense" : "Income"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-white/60">
                            {entry.entry_type === "expense"
                              ? payerLabel(entry.paid_by)
                              : "—"}
                          </td>
                          <td className="px-6 py-4 font-bold">{entry.category}</td>
                          <td className="max-w-[320px] px-6 py-4 text-white/45">
                            {entry.description || "—"}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-black ${
                              entry.entry_type === "expense"
                                ? "text-red-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {entry.entry_type === "expense" ? "−" : "+"}
                            {money(entry.amount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => void deleteEntry(entry.id)}
                              disabled={deletingId === entry.id}
                              className="rounded-xl border border-red-400/15 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {deletingId === entry.id ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
