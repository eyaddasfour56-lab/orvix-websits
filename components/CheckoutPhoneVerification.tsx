"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  phone: string;
  onTokenChange: (token: string) => void;
  language?: "en" | "ar";
  disabled?: boolean;
};

export default function CheckoutPhoneVerification({
  phone,
  onTokenChange,
  language = "en",
  disabled = false,
}: Props) {
  const ar = language === "ar";
  const previousPhone = useRef(phone);
  const [required, setRequired] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/checkout/phone-verification", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active) setRequired(Boolean(result?.required));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (previousPhone.current === phone) return;
    previousPhone.current = phone;
    setChallengeId("");
    setOtp("");
    setMessage("");
    setError("");
    setVerified(false);
    onTokenChange("");
  }, [onTokenChange, phone]);

  async function requestCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/checkout/phone-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not send the code.");
      if (!result.required) {
        setRequired(false);
        return;
      }
      setChallengeId(String(result.challengeId || ""));
      setOtp("");
      setMessage(ar ? `تم إرسال الكود إلى ${result.maskedPhone || "رقمك"}.` : `Code sent to ${result.maskedPhone || "your phone"}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout/phone-verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, otp }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.verified) throw new Error(result.message || "Could not verify the code.");
      onTokenChange(String(result.token || ""));
      setVerified(true);
      setMessage(ar ? "تم تأكيد رقم الموبايل." : "Phone number verified.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  if (!required) return null;

  return (
    <div className={`rounded-2xl border p-4 ${verified ? "border-emerald-300/20 bg-emerald-400/[0.06]" : "border-blue-300/15 bg-blue-400/[0.05]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">{ar ? "تأكيد رقم الموبايل" : "Secure phone verification"}</p>
          <p className="mt-1 text-xs leading-5 text-white/40">
            {verified
              ? ar ? "تم تأكيد الرقم لهذا الطلب." : "This number is verified for checkout."
              : ar ? "نرسل كودًا من 6 أرقام لحماية الطلبات عند الاستلام." : "We send a 6-digit SMS code to protect pay-on-delivery orders."}
          </p>
        </div>
        {!challengeId && !verified ? (
          <button type="button" disabled={disabled || busy || !phone.trim()} onClick={() => void requestCode()} className="rounded-full bg-white px-4 py-2.5 text-xs font-black text-black disabled:opacity-35">
            {busy ? "…" : ar ? "إرسال الكود" : "Send code"}
          </button>
        ) : null}
      </div>

      {challengeId && !verified ? (
        <div className="mt-4 flex gap-2">
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center font-black tracking-[0.35em] outline-none"
          />
          <button type="button" disabled={disabled || busy || otp.length !== 6} onClick={() => void verifyCode()} className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black disabled:opacity-35">
            {busy ? "…" : ar ? "تأكيد" : "Verify"}
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-xs font-bold text-emerald-200/75">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-bold text-red-200/80">{error}</p> : null}
    </div>
  );
}
