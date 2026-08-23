"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCustomerAccessToken, getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  governorate: string;
  area?: string | null;
  address: string;
  is_default: boolean;
};

type WishlistItem = {
  productId: string;
  name?: string;
  slug?: string;
  image?: string;
  price?: number;
  status?: string;
  stock_quantity?: number;
  allow_purchase?: boolean;
};

const emptyAddress = {
  id: "",
  label: "Home",
  fullName: "",
  phone: "",
  governorate: "",
  area: "",
  address: "",
  isDefault: false,
};

export default function SavedCustomerDetailsPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [form, setForm] = useState(emptyAddress);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getCustomerAccessToken();
      if (!token) {
        router.replace("/account/login");
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [addressResponse, wishlistResponse] = await Promise.all([
        fetch("/api/account/addresses", { headers, cache: "no-store" }),
        fetch("/api/account/wishlist", { headers, cache: "no-store" }),
      ]);
      const [addressResult, wishlistResult] = await Promise.all([addressResponse.json(), wishlistResponse.json()]);
      if (!addressResponse.ok) throw new Error(addressResult.message || "Could not load saved addresses.");
      if (!wishlistResponse.ok) throw new Error(wishlistResult.message || "Could not load your wishlist.");
      setAddresses(Array.isArray(addressResult.addresses) ? addressResult.addresses : []);
      setWishlist(Array.isArray(wishlistResult.items) ? wishlistResult.items : []);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your saved details.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("address");
    setError("");
    setMessage("");
    try {
      const token = await getCustomerAccessToken();
      if (!token) throw new Error("Please log in again.");
      const response = await fetch("/api/account/addresses", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save this address.");
      setForm(emptyAddress);
      setMessage(form.id ? "Address updated." : "Address saved.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this address.");
    } finally {
      setBusy("");
    }
  }

  function editAddress(address: Address) {
    setForm({
      id: address.id,
      label: address.label,
      fullName: address.full_name,
      phone: address.phone,
      governorate: address.governorate,
      area: address.area || "",
      address: address.address,
      isDefault: address.is_default,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeAddress(id: string) {
    setBusy(`address:${id}`);
    try {
      const token = await getCustomerAccessToken();
      const response = await fetch("/api/account/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not remove this address.");
      setMessage("Address removed.");
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove this address.");
    } finally {
      setBusy("");
    }
  }

  async function removeWishlistItem(productId: string) {
    setBusy(`wishlist:${productId}`);
    try {
      const token = await getCustomerAccessToken();
      const response = await fetch("/api/account/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error("Could not remove this product.");
      const local = JSON.parse(window.localStorage.getItem("orvixWishlist") || "[]");
      const next = Array.isArray(local) ? local.filter((item) => item.id !== productId) : [];
      window.localStorage.setItem("orvixWishlist", JSON.stringify(next));
      window.dispatchEvent(new Event("orvix-wishlist-updated"));
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove this product.");
    } finally {
      setBusy("");
    }
  }

  async function signOut() {
    await getCustomerSupabaseBrowser().auth.signOut();
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">MY ORVIX</p><h1 className="mt-2 text-3xl font-black">Saved details</h1><p className="mt-2 text-sm text-white/38">Delivery addresses and your account-synced wishlist.</p></div>
          <div className="flex gap-2"><Link href="/account" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/55">← Account</Link><button type="button" onClick={() => void signOut()} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/55">Log out</button></div>
        </header>

        {error ? <p className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/[0.07] p-4 text-xs font-bold text-red-100">{error}</p> : null}
        {message ? <p className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 text-xs font-bold text-emerald-100">{message}</p> : null}
        {loading ? <div className="mt-6 rounded-3xl border border-white/10 p-8 text-sm text-white/35">Loading saved details…</div> : null}

        {!loading ? <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-[28px] border border-white/10 bg-[#0d0e10] p-5 sm:p-6">
            <h2 className="text-xl font-black">Saved addresses</h2>
            <form onSubmit={saveAddress} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Label (Home, Work)" className="h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm outline-none" />
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" className="h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm outline-none" />
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" inputMode="tel" className="h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm outline-none" />
              <input value={form.governorate} onChange={(event) => setForm((current) => ({ ...current, governorate: event.target.value }))} placeholder="Governorate" className="h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm outline-none" />
              <input value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} placeholder="Area / district" className="h-12 rounded-2xl border border-white/10 bg-black/35 px-4 text-sm outline-none sm:col-span-2" />
              <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Full delivery address" rows={3} className="resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm outline-none sm:col-span-2" />
              <label className="flex items-center gap-2 text-xs font-bold text-white/50 sm:col-span-2"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} /> Use as default address</label>
              <button disabled={busy === "address"} className="h-12 rounded-2xl bg-white text-xs font-black text-black sm:col-span-2">{busy === "address" ? "Saving…" : form.id ? "Update address" : "Save address"}</button>
              {form.id ? <button type="button" onClick={() => setForm(emptyAddress)} className="text-xs font-black text-white/35 sm:col-span-2">Cancel editing</button> : null}
            </form>

            <div className="mt-6 space-y-3">{addresses.length ? addresses.map((address) => <article key={address.id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black">{address.label}{address.is_default ? " · Default" : ""}</p><p className="mt-2 text-xs leading-5 text-white/38">{address.full_name} · {address.phone}<br />{address.governorate}{address.area ? ` · ${address.area}` : ""}<br />{address.address}</p></div><div className="flex gap-1"><button type="button" onClick={() => editAddress(address)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-black">Edit</button><button type="button" disabled={busy === `address:${address.id}`} onClick={() => void removeAddress(address.id)} className="rounded-lg border border-red-300/15 px-2.5 py-1.5 text-[10px] font-black text-red-200/60">Remove</button></div></div></article>) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-white/30">No saved address yet.</p>}</div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#0d0e10] p-5 sm:p-6">
            <h2 className="text-xl font-black">Wishlist</h2>
            <p className="mt-2 text-xs leading-5 text-white/35">Products saved on this account stay available across devices after login.</p>
            <div className="mt-5 space-y-3">{wishlist.length ? wishlist.map((item) => <article key={item.productId} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3"><div className="h-16 w-16 overflow-hidden rounded-xl bg-white p-1"><Image src={item.image || "/black.png"} alt={item.name || "Saved product"} width={120} height={120} unoptimized className="h-full w-full object-contain" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.name || "ORVIX product"}</p><p className="mt-1 text-xs text-white/35">{Number(item.price || 0).toLocaleString("en-GB")} EGP</p><div className="mt-2 flex gap-3"><Link href={`/products/${encodeURIComponent(item.slug || "")}`} className="text-[10px] font-black text-white/55">View product →</Link><button type="button" onClick={() => void removeWishlistItem(item.productId)} className="text-[10px] font-black text-red-200/50">Remove</button></div></div></article>) : <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-white/30">Your wishlist is empty. Save products from the store and they will appear here.</p>}</div>
          </section>
        </div> : null}
      </div>
    </main>
  );
}
