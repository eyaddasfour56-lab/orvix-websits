"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="m-0 bg-[#07080a] font-sans text-white">
        <main className="grid min-h-screen place-items-center px-4 py-10">
          <div className="w-full max-w-2xl overflow-hidden rounded-[34px] border border-red-300/15 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.15),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-7 text-center shadow-2xl shadow-black/30 sm:p-10">
            <span className="inline-flex rounded-full border border-red-300/20 bg-red-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-100">Temporary error</span>
            <h1 className="mt-6 text-3xl font-black tracking-[-0.045em] sm:text-4xl">ORVIX hit a temporary problem.</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 text-white/40">Your order is not automatically duplicated by retrying this page. Try once more, or return to the storefront if the problem continues.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => reset()} className="rounded-xl bg-white px-5 py-3 text-xs font-black text-black">Try again</button>
              <a href="/" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-white/65">Return to store</a>
              <a href="/track-order" className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-white/65">Track an order</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
