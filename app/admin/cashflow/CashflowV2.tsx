"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Person = "me" | "ahmed_samy";
type EntryType = "expense" | "income" | "capital" | "settlement";

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
  receipt_path?: string | null;
  receipt_name?: string | null;
  entry_date: string;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  unit_cost: number | string;
};

type MonthlyReport = {
  key: string;
  label: string;
  revenue: number;
  orderRevenue: number;
  extraIncome: number;
  cogs: number;
  expenses: number;
  operatingExpenses: number;
  stockPurchases: number;
  capital: number;
  profit: number;
  deliveredOrders: number;
  highestExpense: { category: string; amount: number } | null;
};

type SuggestedSettlement = {
  from: Person;
  to: Person;
  amount: number;
} | null;

type Summary = {
  deliveredSales: number;
  manualIncome: number;
  totalCashIn: number;
  capital: number;
  expenses: number;
  operatingExpenses: number;
  stockPurchases: number;
  cogs: number;
  realProfit: number;
  profitShareMe: number;
  profitShareAhmedSamy: number;
  netCash: number;
  expectedSales: number;
  deliveredOrders: number;
  activeOrders: number;
  expensesFromMe: number;
  expensesFromAhmedSamy: number;
  incomeToMe: number;
  incomeToAhmedSamy: number;
  capitalFromMe: number;
  capitalFromAhmedSamy: number;
  partnerPositionMe: number;
  partnerPositionAhmed: number;
  suggestedSettlement: SuggestedSettlement;
  unassignedExpenses: number;
  unassignedIncome: number;
  topExpenseCategories: Array<{ category: string; amount: number }>;
  monthlyReports: MonthlyReport[];
  missingCostProducts: Array<{ slug: string; name: string }>;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  entries?: Entry[];
  products?: Product[];
  summary?: Summary;
  entry?: Entry | null;
  product?: Product | null;
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

const incomeCategories = ["Extra Sale", "Deposit", "Refund Received", "Other Income"];

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
  return `${safe.toLocaleString("en-GB", { maximumFractionDigits: 2 })} EGP`;
}

function personLabel(value: Person | null | undefined) {
  if (value === "me") return "Me";
  if (value === "ahmed_samy") return "Ahmed Samy";
  return "Unassigned";
}

function typeLabel(value: EntryType) {
  if (value === "expense") return "Expense";
  if (value === "income") return "Income";
  if (value === "capital") return "Capital";
  return "Settlement";
}

function entryPeople(entry: Entry) {
  if (entry.entry_type === "expense" || entry.entry_type === "capital") {
    return entry.paid_by ? [entry.paid_by] : [];
  }
  if (entry.entry_type === "income") {
    return entry.received_by ? [entry.received_by] : [];
  }
  return [entry.from_person, entry.to_person].filter(Boolean) as Person[];
}

function entryPersonText(entry: Entry) {
  if (entry.entry_type === "expense") return `Paid by ${personLabel(entry.paid_by)}`;
  if (entry.entry_type === "income") return `Received by ${personLabel(entry.received_by)}`;
  if (entry.entry_type === "capital") return `Invested by ${personLabel(entry.paid_by)}`;
  return `${personLabel(entry.from_person)} → ${personLabel(entry.to_person)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(content: BlobPart[], type: string, filename: string) {
  const blob = new Blob(content, { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  tone?: "neutral" | "green" | "red" | "blue" | "amber" | "violet";
}) {
  const classes = {
    neutral: "border-white/10 bg-white/[0.045]",
    green: "border-emerald-400/20 bg-emerald-500/[0.08]",
    red: "border-red-400/20 bg-red-500/[0.07]",
    blue: "border-blue-400/20 bg-blue-500/[0.07]",
    amber: "border-amber-400/20 bg-amber-500/[0.07]",
    violet: "border-violet-400/20 bg-violet-500/[0.07]",
  }[tone];

  return (
    <article className={`rounded-[26px] border p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/45">{helper}</p>
    </article>
  );
}

export default function CashflowV2() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [savingCostId, setSavingCostId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [category, setCategory] = useState(expenseCategories[0]);
  const [otherCategory, setOtherCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidBy, setPaidBy] = useState<Person>("me");
  const [receivedBy, setReceivedBy] = useState<Person>("me");
  const [fromPerson, setFromPerson] = useState<Person>("me");
  const [toPerson, setToPerson] = useState<Person>("ahmed_samy");
  const [entryDate, setEntryDate] = useState(localDateInputValue());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState("");

  const [filterType, setFilterType] = useState<"all" | EntryType>("all");
  const [filterPerson, setFilterPerson] = useState<"all" | Person>("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [costDrafts, setCostDrafts] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

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
      setProducts(result.products || []);
      setSummary(result.summary);
      setCostDrafts(
        Object.fromEntries((result.products || []).map((product) => [product.id, String(Number(product.unit_cost || 0))]))
      );
      setSelectedMonth((current) =>
        current && result.summary?.monthlyReports.some((report) => report.key === current)
          ? current
          : result.summary?.monthlyReports[0]?.key || ""
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load cash flow.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function changeType(next: EntryType) {
    setEntryType(next);
    setOtherCategory("");
    if (next === "expense") setCategory(expenseCategories[0]);
    if (next === "income") setCategory(incomeCategories[0]);
    if (next === "capital") setCategory("Owner Capital");
    if (next === "settlement") setCategory("Settlement");
  }

  function resetForm() {
    setEditingId("");
    setEntryType("expense");
    setCategory(expenseCategories[0]);
    setOtherCategory("");
    setAmount("");
    setDescription("");
    setPaidBy("me");
    setReceivedBy("me");
    setFromPerson("me");
    setToPerson("ahmed_samy");
    setEntryDate(localDateInputValue());
    setReceiptFile(null);
    const input = document.getElementById("cashflow-receipt-input") as HTMLInputElement | null;
    if (input) input.value = "";
  }

  function resolvedCategory() {
    const needsOther =
      (entryType === "expense" && category === "Other") ||
      (entryType === "income" && category === "Other Income");
    if (!needsOther) return category;
    const custom = otherCategory.trim();
    if (!custom) return "";
    return `Other: ${custom.slice(0, 70)}`;
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const savedCategory = resolvedCategory();
    if (!savedCategory) {
      setError("Tell us what the Other entry is.");
      return;
    }
    if (entryType === "settlement" && fromPerson === toPerson) {
      setError("Settlement sender and recipient must be different.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/cashflow", {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          entryType,
          category: savedCategory,
          amount,
          description,
          paidBy: entryType === "expense" || entryType === "capital" ? paidBy : null,
          receivedBy: entryType === "income" ? receivedBy : null,
          fromPerson: entryType === "settlement" ? fromPerson : null,
          toPerson: entryType === "settlement" ? toPerson : null,
          entryDate,
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success || !result.entry) {
        throw new Error(result.message || "Could not save entry.");
      }

      if (receiptFile) {
        const form = new FormData();
        form.append("entryId", result.entry.id);
        form.append("file", receiptFile);
        const upload = await fetch("/api/admin/cashflow/receipt", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const uploadResult = (await upload.json()) as ApiResult;
        if (!upload.ok || !uploadResult.success) {
          throw new Error(uploadResult.message || "Entry saved, but receipt upload failed.");
        }
      }

      setNotice(editingId ? "Entry updated." : `${typeLabel(entryType)} saved.`);
      resetForm();
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  function editEntry(entry: Entry) {
    setEditingId(entry.id);
    setEntryType(entry.entry_type);
    setAmount(String(Number(entry.amount || 0)));
    setDescription(entry.description || "");
    setPaidBy(entry.paid_by || "me");
    setReceivedBy(entry.received_by || "me");
    setFromPerson(entry.from_person || "me");
    setToPerson(entry.to_person || "ahmed_samy");
    setEntryDate(entry.entry_date);
    setReceiptFile(null);

    if (entry.category.startsWith("Other: ")) {
      setCategory(entry.entry_type === "income" ? "Other Income" : "Other");
      setOtherCategory(entry.category.slice(7));
    } else {
      setCategory(entry.category);
      setOtherCategory("");
    }

    setNotice("Editing entry. Save changes when you are done.");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this cash flow entry?")) return;
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/cashflow?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not delete entry.");
      }
      if (editingId === id) resetForm();
      setNotice("Entry deleted.");
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete entry.");
    } finally {
      setDeletingId("");
    }
  }

  async function saveProductCost(product: Product) {
    const unitCost = Number(costDrafts[product.id]);
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError("Enter a valid product cost.");
      return;
    }
    setSavingCostId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/cashflow", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "product_cost", productId: product.id, unitCost }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save product cost.");
      }
      setNotice(`${product.name} cost updated.`);
      await load();
    } catch (costError) {
      setError(costError instanceof Error ? costError.message : "Could not save product cost.");
    } finally {
      setSavingCostId("");
    }
  }

  function prepareSettlement() {
    if (!summary?.suggestedSettlement) return;
    const settlement = summary.suggestedSettlement;
    setEditingId("");
    setEntryType("settlement");
    setCategory("Settlement");
    setOtherCategory("");
    setFromPerson(settlement.from);
    setToPerson(settlement.to);
    setAmount(String(settlement.amount));
    setDescription("Partner balance settlement");
    setEntryDate(localDateInputValue());
    setNotice("Settlement prepared. Record it only after the transfer has actually been made.");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filteredEntries = useMemo(() => {
    const categoryNeedle = filterCategory.trim().toLowerCase();
    const searchNeedle = filterSearch.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filterType !== "all" && entry.entry_type !== filterType) return false;
      if (filterPerson !== "all" && !entryPeople(entry).includes(filterPerson)) return false;
      if (categoryNeedle && !entry.category.toLowerCase().includes(categoryNeedle)) return false;
      if (filterFrom && entry.entry_date < filterFrom) return false;
      if (filterTo && entry.entry_date > filterTo) return false;
      if (searchNeedle) {
        const haystack = [
          entry.category,
          entry.description || "",
          entryPersonText(entry),
          typeLabel(entry.entry_type),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchNeedle)) return false;
      }
      return true;
    });
  }, [entries, filterType, filterPerson, filterCategory, filterSearch, filterFrom, filterTo]);

  const selectedReportIndex = summary?.monthlyReports.findIndex((report) => report.key === selectedMonth) ?? -1;
  const selectedReport = selectedReportIndex >= 0 ? summary?.monthlyReports[selectedReportIndex] || null : null;
  const previousReport = selectedReportIndex >= 0 ? summary?.monthlyReports[selectedReportIndex + 1] || null : null;
  const maxExpense = Math.max(...(summary?.topExpenseCategories.map((item) => item.amount) || [0]), 1);

  function clearFilters() {
    setFilterType("all");
    setFilterPerson("all");
    setFilterCategory("");
    setFilterSearch("");
    setFilterFrom("");
    setFilterTo("");
  }

  function exportExcel() {
    const report = selectedReport;
    const rows = filteredEntries
      .map(
        (entry) => `<tr><td>${escapeHtml(entry.entry_date)}</td><td>${escapeHtml(typeLabel(entry.entry_type))}</td><td>${escapeHtml(entryPersonText(entry))}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description || "")}</td><td>${Number(entry.amount || 0)}</td></tr>`
      )
      .join("");
    const reportRows = report
      ? `<tr><td colspan="5"><b>${escapeHtml(report.label)} Revenue</b></td><td>${report.revenue}</td></tr>
         <tr><td colspan="5"><b>COGS</b></td><td>${report.cogs}</td></tr>
         <tr><td colspan="5"><b>Expenses</b></td><td>${report.expenses}</td></tr>
         <tr><td colspan="5"><b>Real Profit</b></td><td>${report.profit}</td></tr>`
      : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><tr><th colspan="6">ORVIX Cash Flow</th></tr>${reportRows}<tr><th>Date</th><th>Type</th><th>Person</th><th>Category</th><th>Note</th><th>Amount EGP</th></tr>${rows}</table></body></html>`;
    downloadBlob(["\ufeff", html], "application/vnd.ms-excel;charset=utf-8", `orvix-cashflow-${localDateInputValue()}.xls`);
  }

  function exportPdf() {
    const popup = window.open("", "_blank");
    if (!popup) {
      setError("Your browser blocked the PDF window. Allow pop-ups and try again.");
      return;
    }
    const report = selectedReport;
    const rows = filteredEntries
      .map(
        (entry) => `<tr><td>${escapeHtml(entry.entry_date)}</td><td>${escapeHtml(typeLabel(entry.entry_type))}</td><td>${escapeHtml(entryPersonText(entry))}</td><td>${escapeHtml(entry.category)}</td><td>${escapeHtml(entry.description || "—")}</td><td>${escapeHtml(money(entry.amount))}</td></tr>`
      )
      .join("");
    popup.document.write(`<!doctype html><html><head><title>ORVIX Cash Flow</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{margin:0 0 8px}.muted{color:#666}section{margin:24px 0}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid #ddd;border-radius:12px;padding:12px}.card b{display:block;font-size:18px;margin-top:6px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f3f3f3}@media print{button{display:none}}</style></head><body><h1>ORVIX Cash Flow Report</h1><div class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</div><section class="cards"><div class="card">Cash In<b>${escapeHtml(money(summary?.totalCashIn))}</b></div><div class="card">Cash Out<b>${escapeHtml(money(summary?.expenses))}</b></div><div class="card">Net Cash<b>${escapeHtml(money(summary?.netCash))}</b></div><div class="card">Real Profit<b>${escapeHtml(money(summary?.realProfit))}</b></div></section>${report ? `<section><h2>${escapeHtml(report.label)}</h2><p>Revenue: <b>${escapeHtml(money(report.revenue))}</b> · COGS: <b>${escapeHtml(money(report.cogs))}</b> · Expenses: <b>${escapeHtml(money(report.expenses))}</b> · Profit: <b>${escapeHtml(money(report.profit))}</b></p></section>` : ""}<section><h2>Filtered Cash Flow Log</h2><table><thead><tr><th>Date</th><th>Type</th><th>Person</th><th>Category</th><th>Note</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></section><script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`);
    popup.document.close();
  }

  const needsOtherField =
    (entryType === "expense" && category === "Other") ||
    (entryType === "income" && category === "Other Income");
  const selectableCategories = entryType === "expense" ? expenseCategories : incomeCategories;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/70">ORVIX ADMIN</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-6xl">Cash Flow v2</h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/45 sm:text-base">
              Revenue, real profit, partner balances, capital, settlements, receipts, monthly reporting and exports in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportExcel} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-100">Export Excel</button>
            <button type="button" onClick={exportPdf} className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">Export PDF</button>
            <button type="button" onClick={() => void load()} className="rounded-full border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-black">Refresh</button>
            <Link href="/admin" className="rounded-full bg-white px-5 py-3 text-sm font-black text-black">Back to Admin</Link>
          </div>
        </header>

        {error && <div className="mt-6 rounded-[22px] border border-red-400/20 bg-red-500/[0.08] p-5 text-sm font-bold text-red-100">{error}</div>}
        {notice && <div className="mt-6 rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.08] p-5 text-sm font-bold text-emerald-100">{notice}</div>}

        {summary && summary.missingCostProducts.length > 0 && (
          <div className="mt-6 rounded-[22px] border border-amber-400/20 bg-amber-500/[0.08] p-5 text-sm leading-6 text-amber-100">
            <strong>Profit setup needed:</strong> add the unit cost for {summary.missingCostProducts.map((item) => item.name).join(", ")} below. Until then, real profit can be overstated.
          </div>
        )}

        {summary && (summary.unassignedExpenses > 0 || summary.unassignedIncome > 0) && (
          <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-6 text-white/60">
            Older unassigned data: {money(summary.unassignedExpenses)} expenses and {money(summary.unassignedIncome)} income. Edit those entries to assign them to Me or Ahmed Samy.
          </div>
        )}

        {loading && !summary ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center text-white/55">Loading cash flow…</div>
        ) : summary ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Cash In" value={money(summary.totalCashIn)} helper={`${money(summary.deliveredSales)} sales + ${money(summary.manualIncome)} extra income + ${money(summary.capital)} capital`} tone="green" />
              <MetricCard label="Cash Out" value={money(summary.expenses)} helper={`${money(summary.stockPurchases)} stock purchases included`} tone="red" />
              <MetricCard label="Net Cash" value={money(summary.netCash)} helper="Cash in minus recorded expenses" tone={summary.netCash >= 0 ? "green" : "red"} />
              <MetricCard label="Real Profit" value={money(summary.realProfit)} helper="Revenue − COGS − operating expenses" tone={summary.realProfit >= 0 ? "green" : "red"} />
              <MetricCard label="COGS" value={money(summary.cogs)} helper="Delivered units × product unit cost" tone="amber" />
              <MetricCard label="Operating Expenses" value={money(summary.operatingExpenses)} helper="Stock purchases excluded to avoid double-counting COGS" tone="red" />
              <MetricCard label="Expected Sales" value={money(summary.expectedSales)} helper={`${summary.activeOrders} active orders not delivered yet`} tone="blue" />
              <MetricCard label="Profit Split" value={`${money(summary.profitShareMe)} each`} helper="Current split: 50% Me / 50% Ahmed Samy" tone="violet" />
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-3">
              <article className="rounded-[30px] border border-amber-400/15 bg-amber-500/[0.06] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/60">ME</p>
                <p className="mt-2 text-3xl font-black">{money(summary.partnerPositionMe)}</p>
                <p className="mt-1 text-sm text-white/45">Partner cash position</p>
                <div className="mt-5 space-y-2 text-sm text-white/60">
                  <div className="flex justify-between"><span>Expenses paid</span><strong>{money(summary.expensesFromMe)}</strong></div>
                  <div className="flex justify-between"><span>Income received</span><strong>{money(summary.incomeToMe)}</strong></div>
                  <div className="flex justify-between"><span>Capital invested</span><strong>{money(summary.capitalFromMe)}</strong></div>
                  <div className="flex justify-between border-t border-white/10 pt-2"><span>Profit share</span><strong>{money(summary.profitShareMe)}</strong></div>
                </div>
              </article>

              <article className="rounded-[30px] border border-blue-400/15 bg-blue-500/[0.06] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200/60">AHMED SAMY</p>
                <p className="mt-2 text-3xl font-black">{money(summary.partnerPositionAhmed)}</p>
                <p className="mt-1 text-sm text-white/45">Partner cash position</p>
                <div className="mt-5 space-y-2 text-sm text-white/60">
                  <div className="flex justify-between"><span>Expenses paid</span><strong>{money(summary.expensesFromAhmedSamy)}</strong></div>
                  <div className="flex justify-between"><span>Income received</span><strong>{money(summary.incomeToAhmedSamy)}</strong></div>
                  <div className="flex justify-between"><span>Capital invested</span><strong>{money(summary.capitalFromAhmedSamy)}</strong></div>
                  <div className="flex justify-between border-t border-white/10 pt-2"><span>Profit share</span><strong>{money(summary.profitShareAhmedSamy)}</strong></div>
                </div>
              </article>

              <article className="rounded-[30px] border border-violet-400/15 bg-violet-500/[0.06] p-6">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200/60">PARTNER SETTLEMENT</p>
                {summary.suggestedSettlement ? (
                  <>
                    <p className="mt-3 text-xl font-black">{personLabel(summary.suggestedSettlement.from)} → {personLabel(summary.suggestedSettlement.to)}</p>
                    <p className="mt-2 text-3xl font-black">{money(summary.suggestedSettlement.amount)}</p>
                    <p className="mt-3 text-sm leading-6 text-white/50">Suggested transfer to equalize recorded partner cash movements. Record it only after the transfer is actually made.</p>
                    <button type="button" onClick={prepareSettlement} className="mt-5 w-full rounded-2xl bg-violet-300 px-4 py-3 text-sm font-black text-black">Prepare Settlement</button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-3xl font-black text-emerald-200">Balanced</p>
                    <p className="mt-3 text-sm leading-6 text-white/50">No partner settlement is currently needed from the recorded personal movements.</p>
                  </>
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <form ref={formRef} onSubmit={saveEntry} className="scroll-mt-6 rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">{editingId ? "EDIT ENTRY" : "NEW ENTRY"}</p>
                    <h2 className="mt-2 text-2xl font-black">{editingId ? "Update cash flow entry" : "Record money movement"}</h2>
                  </div>
                  {editingId && <button type="button" onClick={resetForm} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-white/60">Cancel edit</button>}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-1.5 sm:grid-cols-4">
                  {(["expense", "income", "capital", "settlement"] as EntryType[]).map((type) => (
                    <button key={type} type="button" onClick={() => changeType(type)} className={`rounded-xl px-3 py-3 text-xs font-black transition sm:text-sm ${entryType === type ? "bg-white text-black" : "text-white/45 hover:text-white"}`}>{typeLabel(type)}</button>
                  ))}
                </div>

                {(entryType === "expense" || entryType === "capital") && (
                  <label className="mt-5 block text-sm font-bold text-white/65">
                    {entryType === "expense" ? "Paid by" : "Capital from"}
                    <select value={paidBy} onChange={(event) => setPaidBy(event.target.value as Person)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none">
                      <option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option>
                    </select>
                  </label>
                )}

                {entryType === "income" && (
                  <label className="mt-5 block text-sm font-bold text-white/65">Received by
                    <select value={receivedBy} onChange={(event) => setReceivedBy(event.target.value as Person)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none">
                      <option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option>
                    </select>
                  </label>
                )}

                {entryType === "settlement" && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-white/65">From
                      <select value={fromPerson} onChange={(event) => setFromPerson(event.target.value as Person)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none"><option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option></select>
                    </label>
                    <label className="text-sm font-bold text-white/65">To
                      <select value={toPerson} onChange={(event) => setToPerson(event.target.value as Person)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none"><option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option></select>
                    </label>
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {(entryType === "expense" || entryType === "income") ? (
                    <label className="text-sm font-bold text-white/65">Category
                      <select value={category} onChange={(event) => { setCategory(event.target.value); setOtherCategory(""); }} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none">
                        {selectableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                  ) : (
                    <label className="text-sm font-bold text-white/65">Category
                      <input value={entryType === "capital" ? "Owner Capital" : "Settlement"} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white/55 outline-none" />
                    </label>
                  )}
                  <label className="text-sm font-bold text-white/65">Amount (EGP)
                    <input type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 300" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20" />
                  </label>
                </div>

                {needsOtherField && (
                  <label className="mt-4 block text-sm font-bold text-white/65">What is the other {entryType === "expense" ? "expense" : "income"}?
                    <input required value={otherCategory} onChange={(event) => setOtherCategory(event.target.value)} placeholder={entryType === "expense" ? "e.g. Customs fee" : "e.g. Cashback"} className="mt-2 w-full rounded-2xl border border-amber-400/20 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20" />
                  </label>
                )}

                <label className="mt-4 block text-sm font-bold text-white/65">Date
                  <input type="date" required value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none" />
                </label>

                <label className="mt-4 block text-sm font-bold text-white/65">Note
                  <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful details" className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white outline-none placeholder:text-white/20" />
                </label>

                <label className="mt-4 block text-sm font-bold text-white/65">Receipt / proof <span className="font-normal text-white/30">(optional, JPG/PNG/WEBP/PDF up to 5 MB)</span>
                  <input id="cashflow-receipt-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/60 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-black file:text-black" />
                </label>

                <button type="submit" disabled={saving} className="mt-5 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-gray-200 disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save Changes" : `Add ${typeLabel(entryType)}`}</button>
              </form>

              <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">MONTHLY REPORT</p><h2 className="mt-2 text-2xl font-black">Performance by month</h2></div>
                  <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm font-bold text-white outline-none">
                    {summary.monthlyReports.map((report) => <option key={report.key} value={report.key}>{report.label}</option>)}
                  </select>
                </div>
                {selectedReport && (
                  <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <MetricCard label="Revenue" value={money(selectedReport.revenue)} helper={`${money(selectedReport.orderRevenue)} orders + ${money(selectedReport.extraIncome)} extra`} tone="green" />
                      <MetricCard label="Real Profit" value={money(selectedReport.profit)} helper={`${selectedReport.deliveredOrders} delivered orders`} tone={selectedReport.profit >= 0 ? "green" : "red"} />
                      <MetricCard label="COGS" value={money(selectedReport.cogs)} helper="Cost of delivered units" tone="amber" />
                      <MetricCard label="Expenses" value={money(selectedReport.expenses)} helper={`${money(selectedReport.operatingExpenses)} operating · ${money(selectedReport.stockPurchases)} stock`} tone="red" />
                    </div>
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-5 text-sm text-white/55">
                      <div className="flex flex-wrap items-center justify-between gap-3"><span>Compared with {previousReport?.label || "previous month"}</span><strong className={previousReport && selectedReport.profit - previousReport.profit >= 0 ? "text-emerald-300" : "text-red-300"}>{previousReport ? `${selectedReport.profit - previousReport.profit >= 0 ? "+" : ""}${money(selectedReport.profit - previousReport.profit)}` : "No comparison yet"}</strong></div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><span>Highest expense</span><strong>{selectedReport.highestExpense ? `${selectedReport.highestExpense.category} · ${money(selectedReport.highestExpense.amount)}` : "No expenses"}</strong></div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><span>Capital added</span><strong>{money(selectedReport.capital)}</strong></div>
                    </div>
                  </>
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-2">
              <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">PRODUCT COST SETUP</p>
                <h2 className="mt-2 text-2xl font-black">Cost per unit</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">These costs power real profit. New delivered orders freeze the current cost so later changes do not rewrite future history.</p>
                <div className="mt-6 space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="font-black">{product.name}</p><p className="mt-1 text-xs text-white/35">Selling price: {money(product.price)}</p></div>
                        <div className="flex gap-2">
                          <input type="number" min="0" step="0.01" value={costDrafts[product.id] ?? "0"} onChange={(event) => setCostDrafts((current) => ({ ...current, [product.id]: event.target.value }))} className="w-36 rounded-xl border border-white/10 bg-[#111] px-3 py-2 text-sm text-white outline-none" />
                          <button type="button" disabled={savingCostId === product.id} onClick={() => void saveProductCost(product)} className="rounded-xl bg-white px-4 py-2 text-xs font-black text-black disabled:opacity-50">{savingCostId === product.id ? "Saving…" : "Save"}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">EXPENSE BREAKDOWN</p>
                <h2 className="mt-2 text-2xl font-black">Where the money is going</h2>
                {summary.topExpenseCategories.length === 0 ? (
                  <div className="mt-8 rounded-[22px] border border-dashed border-white/10 p-7 text-center text-sm text-white/35">No expenses yet.</div>
                ) : (
                  <div className="mt-7 space-y-5">
                    {summary.topExpenseCategories.map((item) => (
                      <div key={item.category}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="font-bold text-white/65">{item.category}</span><strong>{money(item.amount)}</strong></div>
                        <div className="h-3 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-white/60" style={{ width: `${Math.max((item.amount / maxExpense) * 100, 4)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">FILTERS</p><h2 className="mt-2 text-2xl font-black">Find any cash movement</h2></div><button type="button" onClick={clearFilters} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/55">Clear filters</button></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <select value={filterType} onChange={(event) => setFilterType(event.target.value as "all" | EntryType)} className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white"><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="capital">Capital</option><option value="settlement">Settlements</option></select>
                <select value={filterPerson} onChange={(event) => setFilterPerson(event.target.value as "all" | Person)} className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white"><option value="all">Everyone</option><option value="me">Me</option><option value="ahmed_samy">Ahmed Samy</option></select>
                <input value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} placeholder="Category" className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white placeholder:text-white/25" />
                <input value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} placeholder="Search notes" className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white placeholder:text-white/25" />
                <input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white" />
                <input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} className="rounded-xl border border-white/10 bg-[#111] px-3 py-3 text-sm text-white" />
              </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.035]">
              <div className="flex flex-col gap-2 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">CASH FLOW LOG</p><h2 className="mt-2 text-2xl font-black">Entries</h2></div><p className="text-sm text-white/35">{filteredEntries.length} shown · {entries.length} total</p></div>
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-sm text-white/35">No entries match these filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="bg-black/20 text-xs uppercase tracking-[0.14em] text-white/35"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Person</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Note</th><th className="px-6 py-4">Receipt</th><th className="px-6 py-4 text-right">Amount</th><th className="px-6 py-4 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-white/[0.07]">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-white/[0.025]">
                          <td className="px-6 py-4 font-bold text-white/60">{entry.entry_date}</td>
                          <td className="px-6 py-4"><span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-black">{typeLabel(entry.entry_type)}</span></td>
                          <td className="px-6 py-4 font-bold text-white/60">{entryPersonText(entry)}</td>
                          <td className="px-6 py-4 font-bold">{entry.category}</td>
                          <td className="max-w-[300px] px-6 py-4 text-white/45">{entry.description || "—"}</td>
                          <td className="px-6 py-4">{entry.receipt_path ? <a href={`/api/admin/cashflow/receipt?path=${encodeURIComponent(entry.receipt_path)}&name=${encodeURIComponent(entry.receipt_name || "receipt")}`} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200">View</a> : <span className="text-white/25">—</span>}</td>
                          <td className={`px-6 py-4 text-right font-black ${entry.entry_type === "expense" ? "text-red-300" : entry.entry_type === "income" || entry.entry_type === "capital" ? "text-emerald-300" : "text-violet-300"}`}>{entry.entry_type === "expense" ? "−" : entry.entry_type === "settlement" ? "↔ " : "+"}{money(entry.amount)}</td>
                          <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => editEntry(entry)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10">Edit</button><button type="button" onClick={() => void deleteEntry(entry.id)} disabled={deletingId === entry.id} className="rounded-xl border border-red-400/15 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:opacity-50">{deletingId === entry.id ? "Deleting…" : "Delete"}</button></div></td>
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
