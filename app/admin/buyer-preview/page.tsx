import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Read-only Admin Demo",
  description: "A non-interactive buyer demonstration of the ORVIX commerce operating system using synthetic data only.",
  alternates: { canonical: "/admin/buyer-preview" },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const kpis = [
  { label: "Orders today", value: "18", change: "+12% vs. yesterday", tone: "text-blue-200" },
  { label: "Order value", value: "42,750 EGP", change: "Synthetic demo total", tone: "text-emerald-200" },
  { label: "Ready to ship", value: "7", change: "3 priority orders", tone: "text-amber-200" },
  { label: "Support queue", value: "4", change: "Median reply 6 min", tone: "text-violet-200" },
];

const sampleOrders = [
  { id: "DEMO-1042", customer: "Sample Customer A", product: "Wearable Tracker · Black", total: "7,900 EGP", status: "Confirmed", statusClass: "border-blue-300/20 bg-blue-400/10 text-blue-100" },
  { id: "DEMO-1041", customer: "Sample Customer B", product: "Wearable Tracker · Lavender", total: "7,900 EGP", status: "Ready to ship", statusClass: "border-amber-300/20 bg-amber-400/10 text-amber-100" },
  { id: "DEMO-1040", customer: "Sample Customer C", product: "Wearable Tracker · Berry", total: "7,900 EGP", status: "Delivered", statusClass: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" },
  { id: "DEMO-1039", customer: "Sample Customer D", product: "Smart Band · Black", total: "6,700 EGP", status: "Pre-order", statusClass: "border-violet-300/20 bg-violet-400/10 text-violet-100" },
];

const operations = [
  { title: "Orders & fulfillment", detail: "Journeys, labels, courier preparation and customer updates", signal: "7 ready" },
  { title: "Products & inventory", detail: "Variants, stock states, pricing, availability and low-stock signals", signal: "2 low stock" },
  { title: "Customers & support", detail: "Accounts, order history, verified reviews and support conversations", signal: "4 waiting" },
  { title: "Cash flow", detail: "Income, expenses, capital, settlements and profit visibility", signal: "Live ledger" },
  { title: "Growth analytics", detail: "Attribution, funnel steps, recovery and promotion performance", signal: "8.4% CVR" },
  { title: "Brand & commerce", detail: "Identity, SEO, delivery pricing, discounts and feature controls", signal: "Configured" },
];

const fulfillment = [
  { label: "Pre-order", count: 6, width: "38%", colour: "bg-violet-300" },
  { label: "Confirmed", count: 8, width: "54%", colour: "bg-blue-300" },
  { label: "Ready to ship", count: 7, width: "47%", colour: "bg-amber-300" },
  { label: "Delivered", count: 21, width: "82%", colour: "bg-emerald-300" },
];

const activity = [
  "Order DEMO-1042 moved to Confirmed",
  "Inventory threshold reached for Black / S–M",
  "Review from Sample Customer approved",
  "FREEDELIVERY promotion reached 12 uses",
];

export default function AdminBuyerPreviewPage() {
  return (
    <main className="pointer-events-none min-h-screen bg-[#07080a] px-4 py-5 text-white sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-5 shadow-2xl shadow-black/30 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">ORVIX Admin OS</span>
                <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-100">Read-only buyer demo</span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">Commerce command centre</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/42">A safe visual demonstration of the operating system. Every record below is synthetic and every write action is disconnected.</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 py-3 text-xs font-black text-emerald-100">
              ● DEMO ENVIRONMENT · NO LIVE ACCESS
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Synthetic performance summary">
          {kpis.map((item) => (
            <article key={item.label} className="rounded-[24px] border border-white/9 bg-white/[0.032] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">{item.label}</p>
              <p className={`mt-3 text-2xl font-black tracking-[-0.035em] ${item.tone}`}>{item.value}</p>
              <p className="mt-2 text-[11px] font-bold text-white/27">{item.change}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1.38fr_0.62fr]">
          <article className="overflow-hidden rounded-[28px] border border-white/9 bg-white/[0.028]">
            <div className="flex flex-col gap-3 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/45">Daily operations</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Order pipeline</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-white/30">Controls disabled</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-black/20 text-[9px] font-black uppercase tracking-[0.16em] text-white/25">
                  <tr>
                    <th className="px-5 py-4">Order</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Value</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleOrders.map((order) => (
                    <tr key={order.id} className="border-t border-white/[0.055] text-xs font-bold text-white/58">
                      <td className="px-5 py-4 font-black text-white/82">{order.id}</td>
                      <td className="px-5 py-4">{order.customer}</td>
                      <td className="px-5 py-4 text-white/40">{order.product}</td>
                      <td className="px-5 py-4">{order.total}</td>
                      <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${order.statusClass}`}>{order.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/45">System activity</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Audit preview</h2>
            <div className="mt-5 space-y-3">
              {activity.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-[10px] font-black text-violet-200">{index + 1}</span>
                  <div><p className="text-xs font-black leading-5 text-white/67">{item}</p><p className="mt-1 text-[10px] font-bold text-white/23">Synthetic audit event</p></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/45">Fulfillment</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Journey overview</h2>
            <div className="mt-6 space-y-5">
              {fulfillment.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs font-black"><span className="text-white/55">{item.label}</span><span className="text-white/78">{item.count}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${item.colour}`} style={{ width: item.width }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/45">Platform coverage</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">One operating layer</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {operations.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-black text-white/78">{item.title}</h3><span className="shrink-0 rounded-full bg-white/[0.055] px-2 py-1 text-[9px] font-black text-white/28">{item.signal}</span></div>
                  <p className="mt-2 text-[11px] font-semibold leading-5 text-white/30">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className="mt-4 grid gap-3 rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.045] p-5 sm:grid-cols-3 sm:p-6">
          {["No production customer data", "No admin API connection", "No write or maintenance controls"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-emerald-200/10 bg-black/15 px-4 py-3 text-xs font-black text-emerald-50/70"><span className="text-emerald-300">✓</span>{item}</div>
          ))}
        </footer>
      </div>
    </main>
  );
}
