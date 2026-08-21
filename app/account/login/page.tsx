"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = getCustomerSupabaseBrowser();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/account");
    });
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    const supabase = getCustomerSupabaseBrowser();
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "signup") {
        if (fullName.trim().length < 2) throw new Error("Enter your full name.");
        if (phone.replace(/\D/g, "").length < 10) throw new Error("Enter a valid phone number.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          window.dispatchEvent(new Event("orvix-auth-changed"));
          router.replace("/account");
          return;
        }

        setMessage("Account created. Check your email to confirm it, then sign in.");
        setMode("login");
        setPassword("");
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (loginError) throw loginError;
        window.dispatchEvent(new Event("orvix-auth-changed"));
        router.replace("/account");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl place-items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0d0e10] p-5 shadow-2xl sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">ORVIX ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/38">
            Your orders, customer service conversations and replies stay together in one place.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black p-1">
            <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} className={`rounded-xl px-3 py-3 text-xs font-black ${mode === "login" ? "bg-white text-black" : "text-white/45"}`}>Log In</button>
            <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} className={`rounded-xl px-3 py-3 text-xs font-black ${mode === "signup" ? "bg-white text-black" : "text-white/45"}`}>Create Account</button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === "signup" ? (
              <>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" autoComplete="name" className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none placeholder:text-white/22 focus:border-white/25" />
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" inputMode="tel" autoComplete="tel" className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none placeholder:text-white/22 focus:border-white/25" />
              </>
            ) : null}
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" autoComplete="email" required className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none placeholder:text-white/22 focus:border-white/25" />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold outline-none placeholder:text-white/22 focus:border-white/25" />

            {error ? <p className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-xs font-bold text-red-100">{error}</p> : null}
            {message ? <p className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 py-3 text-xs font-bold text-emerald-100">{message}</p> : null}

            <button disabled={busy || !email.trim() || !password} className="h-12 w-full rounded-2xl bg-white text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-40">
              {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/8 pt-4 text-center">
            <Link href="/" className="text-xs font-bold text-white/35 hover:text-white/70">← Back to store</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
