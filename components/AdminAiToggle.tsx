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
      setProvider(result.provider || "AI");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function toggle() {
    if (loading || !configured) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/ai-control", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const result = (await response.json()) as AiStatus;
      if (response.ok && result.success) {
        setEnabled(Boolean(result.enabled));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading || !configured}
      className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-black transition sm:text-xs ${
        configured && enabled
          ? "border-violet-400/25 bg-violet-500/[0.12] text-violet-100"
          : configured
            ? "border-white/10 bg-[#111] text-white/65 hover:bg-[#171717]"
            : "border-amber-400/20 bg-amber-500/[0.07] text-amber-200/70"
      } disabled:cursor-not-allowed`}
      title={configured ? provider : "AI provider unavailable"}
    >
      {loading
        ? "AI…"
        : configured
          ? `AI Auto Reply: ${enabled ? "ON" : "OFF"}`
          : "AI Unavailable"}
    </button>
  );
}
