import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Under Construction | ORVIX",
  description:
    "ORVIX is being updated and will be back soon.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function UnderConstructionPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
      </div>

      <section className="relative w-full max-w-3xl text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          We&apos;re updating
        </div>

        <p className="mt-10 text-sm font-black uppercase tracking-[0.48em] text-white/55 sm:text-base">
          ORVIX
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">
          Under construction
          <span className="text-red-500">
            .
          </span>
        </h1>

        <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-gray-300 sm:text-xl">
          We&apos;re preparing a better
          ORVIX experience. The store
          will be back online soon.
        </p>

        <p
          dir="rtl"
          className="mx-auto mt-3 max-w-xl text-base leading-8 text-gray-500"
        >
          بنجهزلكم تجربة أحسن. الموقع
          هيرجع يشتغل قريب.
        </p>

        <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent" />

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-gray-600">
          Thank you for your patience
        </p>
      </section>
    </main>
  );
}
