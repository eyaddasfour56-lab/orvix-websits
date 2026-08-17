"use client";

import { useCallback, useEffect, useState } from "react";

type Flag = {
  flag_key: string;
  enabled: boolean;
  rollout_percent: number;
  description?: string | null;
  updated_at?: string;
};

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/features", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load feature flags.");
      setFlags(Array.isArray(result.flags) ? result.flags : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load feature flags.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchLocal(key: string, patch: Partial<Flag>) {
    setFlags((current) => current.map((flag) => flag.flag_key === key ? { ...flag, ...patch } : flag));
  }

  async function save(flag: Flag) {
    setBusy(flag.flag_key);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: flag.flag_key,
          enabled: flag.enabled,
          rolloutPercent: flag.rollout_percent,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update feature flag.");
      setFlags(Array.isArray(result.flags) ? result.flags : flags);
      setMessage(result.message || "Feature flag updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update feature flag.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0c0e] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/30">ORVIX ADMIN</p>
            <h1 className="mt-3 text-4xl font-black">Feature Flags</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
              Turn major commerce capabilities on or off independently and control rollout percentage without redeploying the site.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/65">Refresh</button>
        </header>

        {(message || error) && (
          <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold ${error ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"}`}>
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="mt-12 text-center text-white/35">Loading feature flags...</div>
        ) : (
          <section className="mt-7 space-y-4">
            {flags.map((flag) => (
              <article key={flag.flag_key} className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-black">{flag.flag_key}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${flag.enabled ? "bg-emerald-500/15 text-emerald-200" : "bg-white/[0.06] text-white/35"}`}>
                        {flag.enabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/40">{flag.description || "No description."}</p>
                  </div>

                  <label className="flex shrink-0 items-center gap-3 text-sm font-black">
                    Enabled
                    <input type="checkbox" checked={flag.enabled} onChange={(event) => patchLocal(flag.flag_key, { enabled: event.target.checked })} className="h-5 w-5" />
                  </label>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="text-xs font-bold uppercase tracking-[0.13em] text-white/30">
                    Rollout · {flag.rollout_percent}%
                    <input type="range" min="0" max="100" step="5" value={flag.rollout_percent} onChange={(event) => patchLocal(flag.flag_key, { rollout_percent: Number(event.target.value) })} className="mt-3 w-full" />
                  </label>
                  <button type="button" disabled={busy === flag.flag_key} onClick={() => void save(flag)} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-40">
                    {busy === flag.flag_key ? "Saving..." : "Save Flag"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
