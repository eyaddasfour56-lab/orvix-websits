"use client";

import { useEffect, useState } from "react";

type AiStatus = {
  success?: boolean;
  enabled?: boolean;
  configured?: boolean;
  provider?: string;
};

export default function AdminAiToggle() {
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [provider, setProvider] = useState("Checking AI…");
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    try {
      const response = await fetch("/api/admin/ai-control", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await response.json()) as AiStatus;
      if (!response.ok || !result.success) return;
      setEnabled(Boolean(result.enabled));
      setConfigured(Boolean(result.configured));
      setProvider(result.provider || "Vercel AI Gateway");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function toggle() {
    if (loading) return;
    const next = !enabled;
    setEnabled(next);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/ai-control", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const result = (await response.json()) as AiStatus;

      if (!response.ok || !result.success) {
        setEnabled(!next);
        return;
      }

      setEnabled(Boolean(result.enabled));
      setConfigured(Boolean(result.configured));
      setProvider(result.provider || "Vercel AI Gateway");
    } catch {
      setEnabled(!next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2 transition ${
        enabled
          ? "border-violet-400/30 bg-violet-500/[0.12]"
          : "border-white/10 bg-[#111]"
      }`}
      title={configured ? provider : "AI connection is being checked"}
    >
      <div className="min-w-0">
        <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.08em] text-white/80 sm:text-[11px]">
          AI Auto Reply
        </p>
        <p className={`mt-0.5 text-[9px] font-bold ${configured ? "text-white/35" : "text-amber-300/65"}`}>
          {loading ? "Checking…" : configured ? (enabled ? "ON" : "OFF") : "Connecting…"}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle AI auto reply"
        onClick={() => void toggle()}
        disabled={loading}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-all disabled:opacity-50 ${
          enabled ? "bg-violet-500" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
