import Link from "next/link";

export const metadata = {
  title: "ORVIX White-Label Ecommerce Licence",
  description: "Production-ready ecommerce and operations platform available as a one-brand white-label source licence.",
  robots: { index: false, follow: false },
};

const included = [
  "One production-brand source licence",
  "Initial rebranding for the buyer's brand",
  "Buyer-owned Vercel + Supabase deployment",
  "Storefront, checkout, accounts and order tracking",
  "Admin operations, inventory, discounts and analytics",
  "Bilingual English / Arabic foundation",
  "Technical walkthrough and handover documentation",
  "30 days of handover support",
];

export default function LicencePage() {
  return (
    <main className="min-h-screen bg-[#050806] text-white">
      <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-6 inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          White-label source licence
        </div>

        <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
          Launch a production-ready ecommerce operating system under your own brand.
        </h1>

        <p className="mt-6 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
          ORVIX is available as a non-exclusive, one-brand white-label source licence for agencies, retailers and operators that want a ready commerce foundation without rebuilding the same operational stack from scratch.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Licence price</div>
            <div className="mt-2 text-3xl font-black">24,900 EGP</div>
            <div className="mt-1 text-sm text-white/45">US$499 international</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">To reserve</div>
            <div className="mt-2 text-3xl font-black">50%</div>
            <div className="mt-1 text-sm text-white/45">12,450 EGP deposit</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Final balance</div>
            <div className="mt-2 text-3xl font-black">50%</div>
            <div className="mt-1 text-sm text-white/45">Before final source/deployment handover</div>
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Included</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/75">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Licence boundaries</h2>
            <p className="mt-4 text-sm leading-6 text-white/65">
              The buyer may operate and customize one production brand. The master code remains owned by the seller. Redistribution, sublicensing, template resale and use for additional brands are not included.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/65">
              No ORVIX customer data, credentials, third-party accounts or provider balances are transferred. Any formal agreement and payment must be completed by an authorized adult or company representative where required.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <a
            href="mailto:asfoureyad6@gmail.com?subject=ORVIX%20white-label%20licence%20-%2024%2C900%20EGP"
            className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-200"
          >
            Request the licence
          </a>
          <Link
            href="/system-preview"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
          >
            View buyer preview
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/60 transition hover:text-white"
          >
            Live storefront
          </Link>
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-5 text-white/35">
          This is a software licence offer, not a representation of an established revenue-generating business. Commercial terms are subject to written agreement and technical due diligence.
        </p>
      </section>
    </main>
  );
}
