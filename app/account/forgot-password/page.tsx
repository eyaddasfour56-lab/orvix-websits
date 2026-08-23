"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import Navbar from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/account/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not send the reset email.");
      setMessage(result.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send the reset email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl place-items-center px-4 py-12">
        <form onSubmit={submit} className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0d0e10] p-6 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">SECURE ACCOUNT RECOVERY</p>
          <h1 className="mt-3 text-3xl font-black">Reset your password.</h1>
          <p className="mt-2 text-sm leading-6 text-white/38">Enter your account email and we will send a personal, time-limited reset link.</p>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="Email address" required className="mt-6 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none" />
          {error ? <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[0.07] p-3 text-xs font-bold text-red-100">{error}</p> : null}
          {message ? <p className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] p-3 text-xs font-bold text-emerald-100">{message}</p> : null}
          <button disabled={busy || !email.trim()} className="mt-4 h-12 w-full rounded-2xl bg-white text-sm font-black text-black disabled:opacity-40">{busy ? "Sending…" : "Email me a reset link"}</button>
          <Link href="/account/login" className="mt-5 block text-center text-xs font-bold text-white/35">← Back to login</Link>
        </form>
      </section>
    </main>
  );
}
