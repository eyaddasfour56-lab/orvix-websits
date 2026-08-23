"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import Navbar from "@/components/Navbar";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getCustomerSupabaseBrowser();
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const supabase = getCustomerSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl place-items-center px-4 py-12">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0d0e10] p-6 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">SECURE ACCOUNT RECOVERY</p>
          <h1 className="mt-3 text-3xl font-black">Choose a new password.</h1>
          {complete ? <><p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 text-sm font-bold text-emerald-100">Your password was updated. Log in with the new password.</p><Link href="/account/login" className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-black">Go to login</Link></> : ready ? <form onSubmit={submit} className="mt-6 space-y-3"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="New password" required className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none" /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" placeholder="Confirm new password" required className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none" />{error ? <p className="rounded-xl border border-red-300/15 bg-red-400/[0.07] p-3 text-xs font-bold text-red-100">{error}</p> : null}<button disabled={busy} className="h-12 w-full rounded-2xl bg-white text-sm font-black text-black disabled:opacity-40">{busy ? "Updating…" : "Update password"}</button></form> : <><p className="mt-4 text-sm leading-6 text-white/38">This reset link is invalid or expired. Request a new secure link.</p><Link href="/account/forgot-password" className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-black">Request another link</Link></>}
        </div>
      </section>
    </main>
  );
}
