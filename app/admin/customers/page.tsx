"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  created_at: string;
};

type Result = {
  success?: boolean;
  message?: string;
  summary?: { total: number; withPhone: number; newLast7Days: number };
  customers?: Customer[];
  phoneDelivery?: { provider: string; configured: boolean };
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState({ total: 0, withPhone: 0, newLast7Days: 0 });
  const [phoneConfigured, setPhoneConfigured] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json()) as Result;
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load customers.");
      setCustomers(result.customers || []);
      if (result.summary) setSummary(result.summary);
      setPhoneConfigured(Boolean(result.phoneDelivery?.configured));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => [customer.full_name, customer.email, customer.phone, customer.phone_normalized].join(" ").toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#0b0c0e] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/25">CUSTOMERS</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Customer Accounts</h1>
            <p className="mt-2 text-sm font-medium text-white/35">Everyone who created an ORVIX account with email and phone.</p>
          </div>
          <button onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-2.5 text-[10px] font-black text-white/50">Refresh</button>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-bold text-red-100">{error}</p> : null}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Registered", summary.total],
            ["With phone", summary.withPhone],
            ["New last 7 days", summary.newLast7Days],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-4 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/25">{label}</p>
              <p className="mt-2 text-2xl font-black">{loading ? "—" : Number(value).toLocaleString("en-GB")}</p>
            </article>
          ))}
          <article className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-4 sm:p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/25">Phone reply delivery</p>
            <p className={`mt-2 text-sm font-black ${phoneConfigured ? "text-emerald-200" : "text-amber-200"}`}>{phoneConfigured ? "Configured" : "Needs Sent setup"}</p>
          </article>
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or phone" className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none placeholder:text-white/20" />
          <Link href="/admin/chats" className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black">Open Messages</Link>
        </div>

        <section className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_0.7fr] gap-3 border-b border-white/[0.07] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white/25 md:grid">
            <span>Customer</span><span>Email</span><span>Phone</span><span>Joined</span>
          </div>
          {loading ? <p className="p-5 text-sm text-white/35">Loading customers…</p> : null}
          {!loading && !filtered.length ? <p className="p-5 text-sm text-white/35">No customer accounts found.</p> : null}
          {filtered.map((customer) => (
            <div key={customer.id} className="grid gap-2 border-b border-white/[0.055] px-4 py-4 last:border-0 md:grid-cols-[1.4fr_1.4fr_1fr_0.7fr] md:items-center md:gap-3">
              <div><p className="text-sm font-black">{customer.full_name || "Customer"}</p><p className="mt-1 text-[10px] text-white/25">Account</p></div>
              <p className="break-all text-xs font-semibold text-white/55">{customer.email}</p>
              <p className="text-xs font-semibold text-white/55">{customer.phone_normalized || customer.phone || "No phone"}</p>
              <p className="text-[11px] font-semibold text-white/35">{new Date(customer.created_at).toLocaleDateString("en-GB")}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
