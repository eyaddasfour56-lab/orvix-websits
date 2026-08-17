"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type TrackedOrder = {
  orderNumber?: string;
  status?: string;
  trackingNumber?: string | null;
};

type TrackingSnapshot = {
  orderNumber: string;
  phone: string;
  order: TrackedOrder;
};

const reasons = [
  "Ordered by mistake",
  "Changed my mind",
  "Wrong order details",
  "Duplicate order",
  "No longer need the product",
  "Other",
];

function normalizeStatus(value: string | undefined) {
  const status = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  return status === "pending" ? "new" : status;
}

export default function CustomerOrderCancellation() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (pathname !== "/track-order") {
      setSnapshot(null);
      setOpen(false);
      return;
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const isTracking =
        url.pathname === "/api/track-order" &&
        String(init?.method || "GET").toUpperCase() === "POST";

      let submitted: { orderNumber?: string; phone?: string } | null = null;
      if (isTracking && typeof init?.body === "string") {
        try {
          submitted = JSON.parse(init.body);
        } catch {}
      }

      const response = await originalFetch(input, init);

      if (isTracking && submitted) {
        try {
          const result = await response.clone().json();
          if (response.ok && result?.success && result?.order) {
            setSnapshot({
              orderNumber: String(submitted.orderNumber || result.order.orderNumber || "").trim(),
              phone: String(submitted.phone || "").trim(),
              order: result.order as TrackedOrder,
            });
            setCancelled(normalizeStatus(result.order.status) === "cancelled");
            setError("");
          } else {
            setSnapshot(null);
            setCancelled(false);
          }
        } catch {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pathname]);

  const canAttemptCancel = useMemo(() => {
    if (!snapshot || cancelled) return false;
    const status = normalizeStatus(snapshot.order.status);
    return (status === "new" || status === "confirmed") && !snapshot.order.trackingNumber;
  }, [snapshot, cancelled]);

  if (pathname !== "/track-order" || !snapshot) return null;

  async function cancelOrder() {
    if (!snapshot || submitting) return;
    const finalReason = reason === "Other" ? otherReason.trim() : reason.trim();
    if (!finalReason) {
      setError("Please choose a cancellation reason.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: snapshot.orderNumber,
          phone: snapshot.phone,
          reason: finalReason,
        }),
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Could not cancel this order.");
      }

      setCancelled(true);
      setOpen(false);
      setSnapshot((current) =>
        current
          ? { ...current, order: { ...current.order, status: "cancelled" } }
          : current
      );
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel this order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-[180] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl print:hidden">
        {cancelled ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.07] px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">✓</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">Order cancelled</p>
              <p className="mt-0.5 text-xs text-white/45">{snapshot.orderNumber} has been cancelled successfully.</p>
            </div>
          </div>
        ) : canAttemptCancel ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 pl-1">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-white/45">Need to change your mind?</p>
              <p className="mt-1 truncate text-sm font-bold text-white">Cancel before shipping starts</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setError("");
              }}
              className="shrink-0 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/15"
            >
              Cancel Order
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 pl-1">
              <p className="text-sm font-black text-white">Need help with this order?</p>
              <p className="mt-1 text-xs text-white/40">Online cancellation is no longer available.</p>
            </div>
            <Link
              href="/chat"
              className="shrink-0 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-200"
            >
              Customer Service
            </Link>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[260] grid place-items-end bg-black/75 p-3 backdrop-blur-sm sm:place-items-center sm:p-5 print:hidden">
          <div className="w-full max-w-lg rounded-[26px] border border-white/10 bg-[#0b0b0b] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300/70">Cancel Order</p>
                <h2 className="mt-2 text-2xl font-black text-white">Are you sure?</h2>
                <p className="mt-2 text-sm leading-6 text-white/45">Choose why you want to cancel {snapshot.orderNumber}. This action cannot be undone from the website.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/55"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-2">
              {reasons.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setReason(item);
                    setError("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                    reason === item
                      ? "border-red-400/35 bg-red-500/10 text-white"
                      : "border-white/10 bg-[#121212] text-white/60 hover:bg-[#171717]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {reason === "Other" && (
              <textarea
                value={otherReason}
                onChange={(event) => setOtherReason(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Tell us the reason…"
                className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-[#121212] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-red-400/35"
              />
            )}

            {error && (
              <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-100">{error}</p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-xl border border-white/10 bg-[#141414] px-4 py-3.5 text-sm font-black text-white/70"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={() => void cancelOrder()}
                disabled={submitting || !reason || (reason === "Other" && !otherReason.trim())}
                className="rounded-xl bg-red-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Cancelling…" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
