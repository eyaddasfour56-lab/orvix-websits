import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acquire ORVIX — Full Sale or Commercial License",
  description:
    "Private buyer page for the ORVIX bilingual ecommerce system: full acquisition or non-exclusive commercial license.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const included = [
  "Next.js bilingual storefront",
  "Admin operating system and command center",
  "Products, inventory, discounts and order management",
  "Customer accounts, wishlist, reviews and returns",
  "Secure order tracking with identity verification",
  "Analytics, exports and operational controls",
  "Supabase schema and ordered database migrations",
  "English / Arabic commerce foundation",
  "Brand, SEO and rebranding controls",
  "Deployment and technical handover documentation",
];

const proofLinks = [
  { href: "/", title: "Live storefront", copy: "Open the customer-facing ORVIX website." },
  {
    href: "/admin/buyer-preview",
    title: "Safe admin demo",
    copy: "Read-only synthetic admin preview with no production write access.",
  },
  {
    href: "/track-order",
    title: "Secure tracking",
    copy: "Review the customer verification and order-tracking flow.",
  },
];

export default function BuyOrvixPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.25),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/75">
              Private buyer offer
            </span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">
              Ready for immediate handover
            </span>
          </div>

          <div className="mt-8 max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/35">
              ORVIX ECOMMERCE SYSTEM
            </p>
            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">
              A ready bilingual commerce system your agency can deploy now.
            </h1>
            <p className="mt-7 max-w-3xl text-base font-medium leading-8 text-white/52 sm:text-lg">
              Choose a complete acquisition or a non-exclusive commercial license. Inspect the working storefront, admin preview and secure tracking flow before committing.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[30px] border border-emerald-300/15 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(255,255,255,0.025))] p-7 shadow-2xl shadow-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/45">
                Full acquisition
              </p>
              <p className="mt-3 text-5xl font-black tracking-[-0.055em]">
                25,000 <span className="text-2xl text-white/45">EGP</span>
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-white/58">
                Complete agreed source snapshot, storefront, admin system, migrations, documentation and transfer package.
              </p>
              <div className="mt-6 grid gap-2 text-xs font-bold text-white/58">
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  12,500 EGP to reserve and begin handover
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  12,500 EGP after agreed acceptance, before final control transfer
                </div>
              </div>
            </article>

            <article className="rounded-[30px] border border-blue-300/15 bg-[linear-gradient(145deg,rgba(37,99,235,0.12),rgba(255,255,255,0.025))] p-7 shadow-2xl shadow-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/45">
                Non-exclusive commercial license
              </p>
              <p className="mt-3 text-5xl font-black tracking-[-0.055em]">
                9,000 <span className="text-2xl text-white/45">EGP</span>
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-white/58">
                License the system for one branded production deployment. Rebrand and operate it for your business or client without acquiring ORVIX ownership.
              </p>
              <div className="mt-6 grid gap-2 text-xs font-bold text-white/58">
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  One branded production deployment
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  No source redistribution or resale unless separately agreed
                </div>
                <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                  License payment due before licensed source package delivery
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/50">What is included</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">A working commerce stack, not a mockup.</h2>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {included.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-4 text-xs font-bold leading-5 text-white/62">
                <span className="mr-2 text-emerald-300">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/50">Verify before buying</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Inspect the working system.</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {proofLinks.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-[24px] border border-white/9 bg-black/20 p-5 transition hover:border-blue-300/25 hover:bg-blue-300/[0.045]">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-black">{item.title}</h3>
                  <span className="text-white/25 transition group-hover:translate-x-1 group-hover:text-blue-200">→</span>
                </div>
                <p className="mt-3 text-xs font-medium leading-5 text-white/35">{item.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-7 sm:p-9">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/50">Clean transfer</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Buyer-controlled setup.</h2>
            <p className="mt-5 text-sm font-medium leading-7 text-white/45">
              Production customer records, passwords, OTPs, private provider credentials, message credits and seller-owned third-party accounts are excluded unless separately agreed and legally transferable. Demonstrations use synthetic data.
            </p>
          </article>

          <article className="rounded-[30px] border border-emerald-300/15 bg-emerald-300/[0.045] p-7 sm:p-9">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">Fast close</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Ready to proceed?</h2>
            <p className="mt-4 text-sm font-medium leading-7 text-white/45">
              Reply through the same email or message where you received this private link. Scope, license rights and payment milestones are confirmed in writing before source delivery or ownership transfer.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/admin/buyer-preview" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black">Open admin demo</Link>
              <Link href="/" className="rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-black text-white/70">Open live website</Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
