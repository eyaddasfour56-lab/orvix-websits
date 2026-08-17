"use client";

const exports=[
  ["orders","Orders","Orders, totals, shipping, risk and status data."],
  ["products","Products","Catalog, prices, costs, stock and availability."],
  ["inventory","Inventory","Current product inventory and low-stock thresholds."],
  ["customers","Customers","Customer order counts, delivery history and lifetime value."],
  ["cashflow","Cash Flow","Income, expenses, partner movements and categories."],
  ["audit","Audit Log","Administrative changes and operational history."],
] as const;

export default function ExportCenter(){
  return <main className="min-h-screen bg-[#0b0c0e] px-4 py-8 text-white sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
    <p className="text-[11px] font-black uppercase tracking-[.3em] text-white/30">ORVIX OPERATIONS</p>
    <h1 className="mt-3 text-4xl font-black">Export Center</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">Download clean CSV files for reporting, backups, finance work and offline analysis.</p>
    <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{exports.map(([type,title,description])=><article key={type} className="rounded-[28px] border border-white/[.08] bg-white/[.03] p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-black">CSV</div><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-white/40">{description}</p><a href={`/api/admin/export?type=${type}`} className="mt-5 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm font-black transition hover:bg-white hover:text-black">Download {title}</a></article>)}</section>
    <div className="mt-7 rounded-2xl border border-blue-400/15 bg-blue-500/[.06] p-5 text-sm leading-6 text-blue-100/65">Exports are generated from live admin data. Sensitive finance and audit exports follow your admin role permissions.</div>
  </div></main>;
}
