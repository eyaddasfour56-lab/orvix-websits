import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07080a] px-4 py-10 text-white">
      <div className="w-full max-w-2xl overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
        <span className="inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">404 · Page not found</span>
        <p className="mt-7 text-7xl font-black tracking-[-0.08em] text-white/10 sm:text-8xl">ORVIX</p>
        <h1 className="-mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">This page is not available.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 text-white/40">The link may be outdated, the page may have moved, or the address may be incomplete. Your cart and account are unaffected.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-xl bg-white px-5 py-3 text-xs font-black text-black">Back to store</Link>
          <Link href="/track-order" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-white/65">Track an order</Link>
          <Link href="/account" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-white/65">My account</Link>
        </div>
      </div>
    </main>
  );
}
