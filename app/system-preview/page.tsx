import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Commerce System Buyer Preview",
  description: "Private buyer overview of the production-deployed ORVIX white-label commerce and operations platform.",
  alternates: { canonical: "/system-preview" },
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const proofPoints = [
  ["50+", "storefront, customer and admin screens"],
  ["90+", "server and API route handlers"],
  ["20+", "ordered database migrations"],
  ["2", "customer languages: English and Arabic"],
];

const modules = [
  {
    label: "01 · Sell",
    title: "Storefront and conversion",
    copy: "Products, variants, stock states, pricing, cart, wishlist, discount codes, promotional banners, delivery pricing and a clear checkout journey.",
    items: ["Bilingual customer experience", "Live price and inventory checks", "COD and InstaPay-on-delivery flows", "SEO and social sharing metadata"],
  },
  {
    label: "02 · Retain",
    title: "Customer account",
    copy: "A complete post-purchase layer with authentication, saved addresses, synced wishlist, order history, reorder, cancellation, returns and verified reviews.",
    items: ["Registration and password recovery", "Saved addresses and wishlist", "Order history and reorder", "Photo reviews and return requests"],
  },
  {
    label: "03 · Operate",
    title: "Orders and fulfillment",
    copy: "Secure order tracking, fulfillment journeys, pre-orders, labels, courier-ready actions and customer notifications built around Egyptian commerce operations.",
    items: ["Identity-protected order tracking", "Configurable order journeys", "Bosta-ready dispatch workflow", "Email and SMS OTP-ready integrations"],
  },
  {
    label: "04 · Control",
    title: "Admin operating system",
    copy: "One command centre for daily operations and advanced controls without exposing customer-facing screens to internal complexity.",
    items: ["Orders, products and inventory", "Customers, cashflow and analytics", "Discounts, reviews and waitlists", "Brand, SEO, risk, recovery and exports"],
  },
];

const demoLinks = [
  { href: "/", label: "Live storefront", detail: "Brand, catalogue and conversion experience" },
  { href: "/products/google-fitbit-air", label: "Product experience", detail: "Variants, fit guide, reviews and purchase actions" },
  { href: "/checkout?colour=Black&quantity=1&discount=ORVIX15", label: "Secure checkout", detail: "Delivery, payment, pricing and discounts" },
  { href: "/track-order", label: "Order tracking", detail: "Identity-protected customer journey" },
  { href: "/account/login", label: "Customer account", detail: "Authentication and post-purchase operations" },
  { href: "/admin", label: "Admin entry", detail: "Protected operating system and role gates" },
];

export default function SystemPreviewPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080a] text-white">
      <section className="relative border-b border-white/10 px-5 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(37,99,235,0.22),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(96,165,250,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/75">
            Private buyer preview · Production deployed
          </div>
          <div className="mt-8 grid items-end gap-10 lg:grid-cols-[1fr_0.55fr]">
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-[-0.055em] sm:text-7xl">
                A ready-to-brand commerce operating system.
              </h1>
              <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-white/52 sm:text-lg">
                The live ORVIX store is the production proof. The underlying platform can be deployed for a buyer-controlled retail brand with configurable identity, commerce, customer and operations tooling.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/" className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-black transition hover:bg-blue-50">
                  Open live store ↗
                </Link>
                <Link href="/admin" className="rounded-2xl border border-white/13 bg-white/[0.045] px-6 py-3.5 text-sm font-black text-white/76 transition hover:bg-white/[0.08]">
                  View protected admin entry
                </Link>
              </div>
            </div>
            <aside className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-blue-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">White-label advantage</p>
              <p className="mt-4 text-2xl font-black leading-tight">Rebrand without rebuilding.</p>
              <p className="mt-3 text-sm leading-6 text-white/45">Name, logo, colours, official contacts, SEO and live promotions are editable from the Brand & SEO control centre.</p>
              <div className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-xs font-bold leading-5 text-emerald-100/75">
                Buyer deployment uses clean buyer-owned infrastructure. ORVIX customer data and production secrets are not included.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <p className="text-3xl font-black tracking-[-0.04em]">{value}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/38">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/50">System coverage</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">One platform from first visit to fulfillment.</h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {modules.map((module) => (
              <article key={module.title} className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200/42">{module.label}</p>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.03em]">{module.title}</h3>
                <p className="mt-4 text-sm font-medium leading-7 text-white/43">{module.copy}</p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {module.items.map((item) => (
                    <li key={item} className="rounded-xl border border-white/7 bg-black/20 px-3 py-3 text-xs font-bold text-white/58">
                      <span className="mr-2 text-emerald-300">✓</span>{item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.62fr_1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/50">Test the proof</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">Follow the working journey.</h2>
              <p className="mt-5 text-sm font-medium leading-7 text-white/42">These links open real production surfaces. Admin data remains protected; a guided technical review can be provided during buyer due diligence.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {demoLinks.map((item) => (
                <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/9 bg-black/20 p-5 transition hover:border-blue-300/25 hover:bg-blue-300/[0.045]">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-black">{item.label}</p>
                    <span className="text-white/25 transition group-hover:translate-x-1 group-hover:text-blue-200">→</span>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-white/32">{item.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl rounded-[36px] border border-blue-300/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.13),rgba(255,255,255,0.025))] p-7 sm:p-10">
          <div className="grid gap-9 lg:grid-cols-[1fr_0.7fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/55">Clean commercial handover</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Deploy into accounts the buyer owns.</h2>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-white/45">The recommended package includes a licensed source snapshot, database migrations, one buyer-controlled deployment, initial rebranding, configuration support and an agreed handover period.</p>
            </div>
            <div className="space-y-3 text-xs font-bold text-white/62">
              {["Next.js 16 source snapshot", "Supabase schema and migrations", "Environment-variable template", "Brand and SEO configuration", "Deployment and acceptance checklist"].map((item) => (
                <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"><span className="mr-2 text-blue-200">◆</span>{item}</div>
              ))}
            </div>
          </div>
          <div className="mt-8 border-t border-white/9 pt-6 text-[11px] font-semibold leading-5 text-white/31">
            Transactional email, SMS, courier and AI integrations require buyer-owned provider accounts and approvals. No provider delivery, KYC or geographic availability is implied by integration-ready code.
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[36px] border border-emerald-300/15 bg-emerald-300/[0.045] p-7 sm:p-10 lg:grid-cols-[0.72fr_1fr] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">Commercial package</p>
            <p className="mt-4 text-5xl font-black tracking-[-0.055em]">95,000 EGP</p>
            <p className="mt-3 text-xs font-bold leading-5 text-white/35">Opening price · scope-based offers considered</p>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Launch one buyer-owned retail brand.</h2>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-white/45">Includes the licensed source snapshot, clean database setup, initial rebrand, one production deployment, technical walkthrough and 30 calendar days of handover support.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="https://www.instagram.com/orvix_tech/" target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black text-black transition hover:bg-emerald-50">
                Message ORVIX about the licence ↗
              </a>
              <span className="text-[11px] font-semibold leading-5 text-white/30">Final inclusions and rights are confirmed in the signed commercial agreement.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
