"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

export default function AccountConfirmationPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Confirming your email…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getCustomerSupabaseBrowser();
    let active = true;

    async function finish() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setFailed(true);
        setStatus(error.message || "Could not confirm your email.");
        return;
      }

      if (data.session) {
        window.dispatchEvent(new Event("orvix-auth-changed"));
        setStatus("Email confirmed. Opening your account…");
        router.replace("/account");
        return;
      }

      setFailed(true);
      setStatus("Your email link was opened, but no account session was created. Please log in again.");
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        window.dispatchEvent(new Event("orvix-auth-changed"));
        setStatus("Email confirmed. Opening your account…");
        router.replace("/account");
      }
    });

    const timer = window.setTimeout(() => void finish(), 900);

    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl place-items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0d0e10] p-6 text-center shadow-2xl sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">ORVIX ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">{failed ? "Confirmation issue" : "Confirming email"}</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-white/45">{status}</p>
          {failed ? (
            <Link href="/account/login" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-white px-5 text-sm font-black text-black">
              Go to Log In
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
