import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ORVIX Full Website & System Sale",
  description:
    "Private buyer page for the complete ORVIX ecommerce website, source code, admin system and technical handover.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const included = [
  "Complete Next.js storefront source code",
  "Full admin operating system and command center",
  "Products, inventory, discounts and order management",
  "Customer accounts, wishlist, reviews and returns",
  "Secure order tracking with identity verification",
  "Analytics, cashflow, risk, recovery and exports",
  "Supabase schema and ordered database migrations",
  "English / Arabic commerce foundation",
  "Brand, SEO and rebranding controls",
  "Deployment, setup and handover documentation",
];

const proofLinks = [
  {
    href: "/",
    title: "Live website",
    copy: "Open the customer-facing ORVIX storefront.",
  },
  {
    href: "/admin/buyer-preview",
    title: "Safe admin demo",
    copy: "Read-only synthetic admin preview with no production write access.",
  },
  {
    href: "/track-order",
    title: "Secure tracking",
    copy: "See the customer order-verification and tracking experience.",
  },
];

const transferSteps = [
  "Buyer confirms the written scope and transfer details.",
  "27,500 EGP is paid to begin the handover.",
  "Source, migrations, documentation and setup guidance are transferred.",
  "The remaining 27,500 EGP is paid after buyer acceptance of the agreed handover.",
];

export default function BuyOrvixPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.25),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/75">
              Private buyer page
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              Full project handover
            </span>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.5fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/35">
                ORVIX ECOMMERCE SYSTEM
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">
                Full website. Full system. Ready for handover.
              </h1>
              <p className="mt-7 max-w-3xl text-base font-medium leading-8 text-white/52 sm:text-lg">
                Acquire the complete ORVIX ecommerce project: customer storefront,
                admin operating system, source code, database migrations and a
                structured technical handover. This is the full project package,
                not a template-only or limited licence offer.
              </p>
            </div>

            <aside className="rounded-[30px] border border-emerald-300/15 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/45">
                Asking price
              </p>
              <p className="mt-3 text-5xl font-black tracking-[-0.055em]">
                55,000 <span className="text-2xl text-white/45">EGP</span>
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                Complete website + system package
              </p>
              <div className="mt-6 grid gap-2 text-xs font-bold text-white/58">
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  50% · 27,500 EGP to begin handover
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  50% · 27,500 EGP after agreed buyer acceptance
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/38">
                The final scope and acceptance criteria are confirmed in writing
                before source transfer begins.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/50">
                What is included
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                The complete commerce project.
              </h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-xs font-bold leading-5 text-white/62"
                  >
                    <span className="mr-2 text-emerald-300">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/50">
                Clean transfer
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Buyer-controlled setup.
              </h2>
              <p className="mt-5 text-sm font-medium leading-7 text-white/45">
                The project is handed over into buyer-controlled infrastructure.
                Production customer records, private credentials, personal provider
                accounts, message credits and courier balances are excluded unless
                separately agreed and legally transferable.
              </p>
              <div className="mt-6 space-y-3 text-xs font-bold text-white/58">
                {[
                  "Source-code handover",
                  "Database migration set",
                  "Environment-variable map",
                  "Rebranding workflow",
                  "Launch and acceptance checklist",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <span className="mr-2 text-violet-200">◆</span>
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/50">
            Verify before buying
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Inspect the working system.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {proofLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[24px] border border-white/9 bg-black/20 p-5 transition hover:border-blue-300/25 hover:bg-blue-300/[0.045]"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-black">{item.title}</h3>
                  <span className="text-white/25 transition group-hover:translate-x-1 group-hover:text-blue-200">
                    →
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium leading-5 text-white/35">
                  {item.copy}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/50">
              Handover sequence
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Clear payment. Clear acceptance.
            </h2>
            <div className="mt-6 space-y-3">
              {transferSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-300/10 text-[10px] font-black text-amber-100">
                    {index + 1}
                  </span>
                  <p className="text-xs font-bold leading-5 text-white/58">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-emerald-300/15 bg-emerald-300/[0.045] p-7 sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">
              Next step
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Ready to proceed?
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/45">
              Reply through the same message or email where you received this
              private link. The written scope and acceptance checklist are confirmed
              before any source-code handover begins.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/admin/buyer-preview"
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black"
              >
                Open admin demo
              </Link>
              <Link
                href="/"
                className="rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-black text-white/70"
              >
                Open live website
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
