"use client";

import {useCallback,useEffect,useState} from "react";
type Order={id:string;order_number:string;created_at:string;customer_name:string;phone:string;product_name:string;quantity:number;total_price:number|string;status:string;risk_score:number;risk_flags?:string[]};
type Metrics={flagged24h:number;highRisk24h:number;critical24h:number};
const empty:Metrics={flagged24h:0,highRisk24h:0,critical24h:0};
const dt=(v:string)=>new Date(v).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const label=(flag:string)=>flag.replaceAll("_"," ");

export default function RiskCenter(){
 const [orders,setOrders]=useState<Order[]>([]),[metrics,setMetrics]=useState<Metrics>(empty),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/admin/risk",{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Could not load risk signals.");setOrders(Array.isArray(j.orders)?j.orders:[]);setMetrics(j.metrics||empty);}catch(e){setError(e instanceof Error?e.message:"Could not load risk signals.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load()},[load]);
 return <main className="min-h-screen bg-[#0b0c0e] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.3em] text-white/30">ORVIX SAFETY</p><h1 className="mt-3 text-4xl font-black">Order Risk Center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">Non-blocking signals for unusual order patterns. Flags help review an order; they do not automatically accuse or cancel a customer.</p></div><button onClick={()=>void load()} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white/65">Refresh</button></header>
  {error&&<p className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
  <section className="mt-7 grid gap-3 sm:grid-cols-3">{[["Flagged · 24h",metrics.flagged24h],["High risk · 24h",metrics.highRisk24h],["Critical · 24h",metrics.critical24h]].map(([l,v])=><div key={String(l)} className="rounded-3xl border border-white/[.08] bg-white/[.035] p-5"><p className="text-xs font-bold text-white/35">{l}</p><p className="mt-3 text-3xl font-black">{v}</p></div>)}</section>
  <section className="mt-7 rounded-[30px] border border-white/[.08] bg-white/[.03] p-5 sm:p-6"><h2 className="text-2xl font-black">Flagged orders</h2>{loading?<div className="py-14 text-center text-white/35">Loading…</div>:orders.length===0?<div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.06] p-8 text-center text-sm font-bold text-emerald-200">No flagged orders.</div>:<div className="mt-5 space-y-3">{orders.map(o=>{const score=Number(o.risk_score||0);return <article key={o.id} className={`rounded-2xl border p-4 ${score>=80?"border-red-400/20 bg-red-500/[.06]":score>=50?"border-amber-400/20 bg-amber-500/[.05]":"border-white/[.07] bg-black/20"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">{o.order_number} · {o.customer_name}</p><p className="mt-1 text-xs text-white/35">{o.product_name} × {o.quantity} · {Number(o.total_price||0).toLocaleString("en-GB")} EGP · {dt(o.created_at)}</p><div className="mt-3 flex flex-wrap gap-2">{(o.risk_flags||[]).map(f=><span key={f} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/45">{label(f)}</span>)}</div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${score>=80?"bg-red-500/15 text-red-200":score>=50?"bg-amber-500/15 text-amber-200":"bg-white/[.07] text-white/55"}`}>RISK {score}/100</span></div></article>})}</div>}</section>
 </div></main>;
}
