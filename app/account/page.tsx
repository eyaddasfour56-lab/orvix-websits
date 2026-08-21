"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

type Profile = {
  email?: string;
  full_name?: string;
  phone?: string | null;
};

type Order = {
  id: string;
  order_number?: string | null;
  product_name?: string | null;
  colour?: string | null;
  quantity?: number | null;
  total_price?: number | string | null;
  status?: string | null;
  journey_status?: string | null;
  bosta_tracking_number?: string | null;
  bosta_state_name?: string | null;
  created_at?: string | null;
};

type Overview = {
  success?: boolean;
  message?: string;
  account?: {
    email?: string;
    emailVerified?: boolean;
    profile?: Profile;
  };
  orders?: Order[];
  unreadMessages?: number;
  conversations?: Array<Record<string, unknown>>;
};

const journeyLabels: Record<string, string> = {
  new: "Pre-Ordered",
  international_transit: "In Transit to Egypt",
  arrived_egypt: "Arrived in Egypt",
  in_customs: "In Customs",
  customs_cleared: "Customs Cleared",
  received_at_orvix: "At ORVIX",
  ready_for_courier: "Ready for Courier",
};

function money(value: unknown) {
  const number = Number(value || 0);
  return `${(Number.isFinite(number) ? number : 0).toLocaleString("en-GB")} EGP`;
}

function date(value: unknown) {
  const parsed = new Date(String(value || ""));
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function orderStatus(order: Order) {
  if (order.status === "cancelled") return "Cancelled";
  if (order.status === "delivered") return "Delivered";
  if (order.bosta_tracking_number) return order.bosta_state_name || "With Courier";
  return journeyLabels[String(order.journey_status || "new")] || "Pre-Ordered";
}

export default function CustomerAccountPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const supabase = getCustomerSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || "";
    if (!token) {
      router.replace("/account/login");
      return;
    }

    try {
      const response = await fetch("/api/account/overview", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = (await response.json()) as Overview;
      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/account/login");
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load your account.");
      setOverview(result);
      setFullName(result.account?.profile?.full_name || "");
      setPhone(result.account?.profile?.phone || "");
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your account.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const supabase = getCustomerSupabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/account/login");
    });
    return () => data.subscription.unsubscribe();
  }, [load, router]);

  async function saveProfile() {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const supabase = getCustomerSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName, phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save your profile.");
      setMessage("Profile saved.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = getCustomerSupabaseBrowser();
    await supabase.auth.signOut();
    window.dispatchEvent(new Event("orvix-auth-changed"));
    router.replace("/");
  }

  if (loading) {
    return <main className="min-h-screen bg-black text-white"><Navbar /><div className="grid min-h-[60vh] place-items-center text-sm font-semibold text-white/35">Loading your account…</div></main>;
  }

  const orders = overview?.orders || [];
  const profile = overview?.account?.profile;
  const unread = Number(overview?.unreadMessages || 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">MY ORVIX</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">My Account</h1>
            <p className="mt-2 text-sm font-medium text-white/38">Orders, customer service replies and your details in one place.</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-white/60 hover:bg-white/[0.08]">Log Out</button>
        </header>

        {error ? <p className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[0.06] p-3 text-xs font-bold text-red-100">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs font-bold text-emerald-100">{message}</p> : null}

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Orders</p>
            <p className="mt-2 text-3xl font-black">{orders.length}</p>
            <p className="mt-1 text-xs font-medium text-white/35">Orders connected to your account</p>
          </article>
          <Link href="/account/messages" className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.055]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Messages</p><p className="mt-2 text-3xl font-black">{unread}</p><p className="mt-1 text-xs font-medium text-white/35">Unread Customer Service replies</p></div>
              {unread > 0 ? <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-2 text-[10px] font-black text-black">{unread > 99 ? "99+" : unread}</span> : null}
            </div>
          </Link>
          <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">Email</p>
            <p className="mt-2 truncate text-sm font-black">{overview?.account?.email || "—"}</p>
            <p className={`mt-2 text-xs font-bold ${overview?.account?.emailVerified ? "text-emerald-200/70" : "text-amber-200/70"}`}>{overview?.account?.emailVerified ? "Verified" : "Confirmation pending"}</p>
          </article>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="rounded-[26px] border border-white/10 bg-[#0d0e10] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">MY ORDERS</p><h2 className="mt-1 text-xl font-black">Order history</h2></div>
              <Link href="/track-order" className="text-xs font-black text-white/45 hover:text-white">Track another order →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {orders.length ? orders.map((order) => (
                <article key={order.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm font-black">{order.order_number || "Order"}</p><p className="mt-1 text-[10px] font-semibold text-white/28">{date(order.created_at)} · {order.product_name || "ORVIX order"}{order.colour ? ` · ${order.colour}` : ""}</p></div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-white/65">{orderStatus(order)}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/7 pt-3"><p className="text-sm font-black">{money(order.total_price)}</p>{order.order_number ? <Link href={`/track-order/${encodeURIComponent(order.order_number)}`} className="text-[10px] font-black text-white/45 hover:text-white">View tracking →</Link> : null}</div>
                </article>
              )) : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-black text-white/55">No account-linked orders yet.</p><p className="mt-2 text-xs leading-5 text-white/28">Orders placed while you are logged in will appear here automatically.</p></div>}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-[26px] border border-white/10 bg-[#0d0e10] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">CUSTOMER SERVICE</p>
              <h2 className="mt-2 text-xl font-black">Your support inbox</h2>
              <p className="mt-2 text-xs font-medium leading-5 text-white/35">Message Customer Service and keep every reply inside your account.</p>
              <Link href="/account/messages" className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-4 text-xs font-black text-black">Open Messages{unread ? ` · ${unread} new` : ""}</Link>
            </section>

            <section className="rounded-[26px] border border-white/10 bg-[#0d0e10] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/28">PROFILE</p>
              <div className="mt-4 space-y-3">
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-semibold outline-none focus:border-white/25" />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" inputMode="tel" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-semibold outline-none focus:border-white/25" />
                <input value={overview?.account?.email || profile?.email || ""} disabled className="h-11 w-full rounded-xl border border-white/7 bg-white/[0.025] px-3 text-sm font-semibold text-white/35" />
                <button type="button" onClick={() => void saveProfile()} disabled={saving} className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] text-xs font-black hover:bg-white/[0.1] disabled:opacity-40">{saving ? "Saving…" : "Save Profile"}</button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
