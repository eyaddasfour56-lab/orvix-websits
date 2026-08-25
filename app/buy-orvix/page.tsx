import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ORVIX Full Website & System Sale",
  description: "Private buyer page for the complete ORVIX ecommerce website, source code, admin system and technical handover.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

type PageProps = {
  searchParams: Promise<{ offer?: string | string[] }>;
};

function resolveOffer(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "800") return 800;
  if (raw === "1100") return 1100;
  return null;
}

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
  { href: "/", title: "Live website", copy: "Open the customer-facing ORVIX storefront." },
  { href: "/admin/buyer-preview", title: "Safe admin demo", copy: "Read-only synthetic admin preview with no production write access." },
  { href: "/track-order", title: "Secure tracking", copy: "See the customer order-verification and tracking experience." },
];

export default async function BuyOrvixPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const offer = resolveOffer(params.offer);

  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10 px-5 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(37,99,235,0.25),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(16,185,129,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/75">Private buyer page</span>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/75">Full project handover</span>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.48fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/35">ORVIX ECOMMERCE SYSTEM</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-7xl">
                Full website. Full system. Ready for handover.
              </h1>
              <p className="mt-7 max-w-3xl text-base font-medium leading-8 text-white/52 sm:text-lg">
                This is a sale of the complete ORVIX website and operating system package — storefront, admin, source code, database migrations and technical handover. It is not a template-only or limited single-brand licence offer.
              </p>
            </div>

            <aside className="rounded-[30px] border border-emerald-300/15 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(255,255,255,0.025))] p-6 shadow-2xl shadow-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/45">Private offer</p>
              {offer ? (
                <>
                  <p className="mt-3 text-5xl font-black tracking-[-0.055em]">${offer.toLocaleString("en-US")}</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-white/35">Complete website + system package</p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-3xl font-black tracking-[-0.04em]">Full-system acquisition</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-white/35">Offer confirmed directly with the buyer</p>
                </>
              )}
              <p className="mt-5 text-sm leading-6 text-white/45">Final payment schedule, transfer scope and acceptance are confirmed in writing before the source handover.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/50">What is included</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">The complete commerce project.</h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {included.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-xs font-bold leading-5 text-white/62">
                    <span className="mr-2 text-emerald-300">✓</span>{item}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[30px] border border-white/9 bg-white/[0.025] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/50">Clean transfer</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Buyer-controlled setup.</h2>
              <p className="mt-5 text-sm font-medium leading-7 text-white/45">
                The project is handed over into buyer-controlled infrastructure. Production customer records, private credentials, personal provider accounts, message credits and courier balances are not transferred unless separately agreed and legally transferable.
              </p>
              <div className="mt-6 space-y-3 text-xs font-bold text-white/58">
                {["Source-code handover", "Database migration set", "Environment-variable map", "Rebranding workflow", "Launch and acceptance checklist"].map((item) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"><span className="mr-2 text-violet-200">◆</span>{item}</div>
                ))}
              </div>
            </article>
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
                <div className="flex items-center justify-between gap-4"><h3 className="text-sm font-black">{item.title}</h3><span className="text-white/25 transition group-hover:translate-x-1 group-hover:text-blue-200">→</span></div>
                <p className="mt-3 text-xs font-medium leading-5 text-white/35">{item.copy}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl rounded-[34px] border border-emerald-300/15 bg-emerald-300/[0.045] p-7 sm:p-10">
          <div className="grid gap-7 lg:grid-cols-[1fr_0.55fr] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/55">Next step</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Ready to proceed?</h2>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-white/45">Reply to the message or email where you received this private link. The final scope, payment schedule and handover date can then be confirmed before transfer.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/admin/buyer-preview" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black">Admin demo</Link>
              <Link href="/" className="rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-black text-white/70">Live website</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
