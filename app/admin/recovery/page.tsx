"use client";

import {useCallback,useEffect,useState} from "react";
type Session={session_key:string;product_slug?:string|null;variant_key?:string|null;stage:string;created_at:string;last_seen_at:string;inactive_seconds:number};
type Metrics={checkoutSessions24h:number;completed24h:number;abandoned24h:number;conversion24h:number};
const empty:Metrics={checkoutSessions24h:0,completed24h:0,abandoned24h:0,conversion24h:0};
const age=(s:number)=>s<3600?`${Math.max(1,Math.round(s/60))} min`:`${Math.round(s/3600)} hr`;
const dt=(v:string)=>new Date(v).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});

export default function CheckoutRecovery(){
 const [sessions,setSessions]=useState<Session[]>([]),[metrics,setMetrics]=useState<Metrics>(empty),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/admin/recovery",{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Could not load recovery data.");setSessions(Array.isArray(j.abandoned)?j.abandoned:[]);setMetrics(j.metrics||empty);}catch(e){setError(e instanceof Error?e.message:"Could not load recovery data.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load()},[load]);
 return <main className="min-h-screen bg-[#0b0c0e] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.3em] text-white/30">ORVIX GROWTH</p><h1 className="mt-3 text-4xl font-black">Checkout Recovery</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">Anonymous checkout sessions that stopped before an order was completed. Customer form details are not stored here.</p></div><button onClick={()=>void load()} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/65">Refresh</button></header>
  {error&&<p className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
  <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Sessions · 24h",metrics.checkoutSessions24h],["Completed · 24h",metrics.completed24h],["Abandoned · 24h",metrics.abandoned24h],["Conversion",`${metrics.conversion24h}%`]].map(([l,v])=><div key={String(l)} className="rounded-3xl border border-white/[.08] bg-white/[.035] p-5"><p className="text-xs font-bold text-white/35">{l}</p><p className="mt-3 text-3xl font-black">{v}</p></div>)}</section>
  <section className="mt-7 rounded-[30px] border border-white/[.08] bg-white/[.03] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-white/30">Inactive 15+ minutes</p><h2 className="mt-2 text-2xl font-black">Abandoned sessions</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/40">{sessions.length}</span></div>
   {loading?<div className="py-14 text-center text-white/35">Loading…</div>:sessions.length===0?<div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.06] p-8 text-center text-sm font-bold text-emerald-200">No abandoned checkout sessions right now.</div>:<div className="mt-5 space-y-3">{sessions.map(s=><article key={s.session_key} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{s.product_slug||"Unknown product"}{s.variant_key?` · ${s.variant_key}`:""}</p><p className="mt-1 text-xs text-white/35">Started {dt(s.created_at)} · Last active {dt(s.last_seen_at)}</p><p className="mt-2 text-xs text-white/25">Session {s.session_key.slice(0,18)}…</p></div><span className="shrink-0 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-black text-amber-200">Inactive {age(Number(s.inactive_seconds||0))}</span></div></article>)}</div>}
  </section>
 </div></main>;
}
