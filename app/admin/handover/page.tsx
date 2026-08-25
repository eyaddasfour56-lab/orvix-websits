import Link from "next/link";

const transferLayers = [
  {
    title: "Source code",
    owner: "Buyer repository / licensed snapshot",
    detail: "Transfer the agreed source snapshot with the full migration set, documentation and no production secrets.",
  },
  {
    title: "Vercel",
    owner: "Buyer-owned project",
    detail: "The buyer imports the repository, sets environment variables and controls domains, deployments and rollbacks.",
  },
  {
    title: "Supabase",
    owner: "Buyer-owned project",
    detail: "Apply the committed migrations to a fresh buyer database. Never transfer ORVIX production customer or order data.",
  },
  {
    title: "Providers",
    owner: "Buyer-owned accounts",
    detail: "Email, SMS, courier and AI integrations activate only after the buyer provides verified provider credentials and approvals.",
  },
];

const packageItems = [
  "Next.js source code and committed dependency lockfile",
  "Supabase migrations and database setup path",
  ".env.example mapping without production credentials",
  "White-label brand, SEO and promotion controls",
  "Buyer-safe synthetic admin demo",
  "Storefront, account, checkout, tracking and fulfillment flows",
  "Acceptance checklist and deployment verification steps",
  "Documented provider activation requirements",
];

const acceptance = [
  "Storefront loads correctly on desktop and mobile.",
  "English / Arabic switching and RTL presentation work.",
  "Buyer branding, logo, colours, contacts and SEO are correct.",
  "Products, variants, stock states and discount validation work.",
  "A synthetic test order completes with the expected totals.",
  "Admin can view and update the synthetic order journey.",
  "Order tracking identity verification works with the enabled method.",
  "Account registration, recovery, wishlist, returns and reviews are tested.",
  "Private/admin routes are not indexed and secrets are not exposed client-side.",
  "Lint, TypeScript and production build checks pass before final handoff.",
];

const providerRows = [
  ["Core database, auth, storage", "Supabase", "Required", "Buyer creates project and applies migrations"],
  ["Hosting, preview and production", "Vercel", "Required", "Buyer imports repository and configures environment"],
  ["Transactional email", "Resend", "Optional", "Verify buyer domain and sender"],
  ["SMS / phone OTP", "Sent", "Optional", "Complete buyer onboarding and enable approved sender"],
  ["Courier dispatch / tracking", "Bosta", "Optional", "Buyer provides merchant API credentials"],
  ["AI assistance", "AI Gateway / OpenAI", "Optional", "Buyer selects provider and controls spend"],
];

export default function HandoverCenterPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] px-3 py-5 text-white sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">Buyer handover</span>
                <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">Production-safe transfer</span>
              </div>
              <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">Handover & acceptance center</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/42">
                Everything a serious buyer needs to understand how the platform transfers, what they own, which integrations require their accounts and how final acceptance is verified.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/setup" className="rounded-xl bg-white px-4 py-2.5 text-[11px] font-black text-black">Setup wizard</Link>
              <Link href="/admin/buyer-preview" target="_blank" className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-[11px] font-black text-white/60">Safe buyer demo ↗</Link>
            </div>
          </div>
        </header>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {transferLayers.map((item) => (
            <article key={item.title} className="rounded-[26px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-black tracking-[-0.025em]">{item.title}</h2>
                <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-1 text-[9px] font-black text-emerald-100">{item.owner}</span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-white/36">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-[28px] border border-blue-300/15 bg-blue-400/[0.045] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/55">Transfer package</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">What the buyer receives</h2>
            <div className="mt-5 space-y-2.5">
              {packageItems.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-blue-200/10 bg-black/15 px-4 py-3 text-xs font-bold leading-5 text-blue-50/70">
                  <span className="text-blue-200">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-[28px] border border-white/9 bg-white/[0.028]">
            <div className="border-b border-white/8 p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/45">Provider ownership</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Activation matrix</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/32">The platform ships integration-ready. Regulated or paid providers stay under the buyer&apos;s own account and approval process.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-black/20 text-[9px] font-black uppercase tracking-[0.14em] text-white/25">
                  <tr>
                    <th className="px-5 py-4">Capability</th>
                    <th className="px-5 py-4">Provider</th>
                    <th className="px-5 py-4">Core status</th>
                    <th className="px-5 py-4">Buyer action</th>
                  </tr>
                </thead>
                <tbody>
                  {providerRows.map(([capability, provider, status, action]) => (
                    <tr key={capability} className="border-t border-white/[0.055] text-xs font-bold text-white/55">
                      <td className="px-5 py-4 text-white/78">{capability}</td>
                      <td className="px-5 py-4">{provider}</td>
                      <td className="px-5 py-4"><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black text-white/45">{status}</span></td>
                      <td className="px-5 py-4 text-white/35">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="mt-4 rounded-[28px] border border-emerald-300/15 bg-emerald-400/[0.045] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/55">Acceptance test</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">Definition of done</h2>
            </div>
            <Link href="/" target="_blank" className="rounded-xl border border-emerald-200/15 bg-black/20 px-4 py-2.5 text-[11px] font-black text-emerald-50/70">Open production storefront ↗</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {acceptance.map((item, index) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-emerald-200/10 bg-black/15 p-4 text-xs font-bold leading-5 text-emerald-50/70">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-300 text-[9px] font-black text-black">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-[28px] border border-red-300/15 bg-red-400/[0.04] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-200/55">Never transfer</p>
            <h2 className="mt-2 text-xl font-black">Production secrets or customer data</h2>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/35">Do not send production service keys, passwords, OTPs, real customer exports, live order records or provider balances. The buyer enters credentials directly into buyer-controlled dashboards.</p>
          </article>
          <article className="rounded-[28px] border border-white/9 bg-white/[0.028] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/28">Repository documentation</p>
            <h2 className="mt-2 text-xl font-black">Built for due diligence</h2>
            <p className="mt-3 text-xs font-semibold leading-5 text-white/35">The repository includes README setup instructions, a white-label handover guide, buyer due-diligence notes, migrations and environment-variable examples so a technical buyer can inspect the system without relying on private production access.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
