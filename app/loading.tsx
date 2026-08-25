export default function Loading() {
  return (
    <main className="min-h-screen bg-[#07080a] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-36 rounded-2xl bg-white/[0.08]" />
          <div className="flex gap-2">
            <div className="h-10 w-20 rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-10 rounded-xl bg-white/[0.06]" />
          </div>
        </div>
        <section className="mt-8 overflow-hidden rounded-[34px] border border-white/8 bg-white/[0.025] p-5 sm:p-8">
          <div className="h-3 w-28 rounded-full bg-white/[0.07]" />
          <div className="mt-5 h-10 max-w-2xl rounded-2xl bg-white/[0.08]" />
          <div className="mt-3 h-4 max-w-xl rounded-full bg-white/[0.055]" />
          <div className="mt-2 h-4 max-w-md rounded-full bg-white/[0.045]" />
          <div className="mt-7 flex gap-2">
            <div className="h-11 w-32 rounded-xl bg-white/[0.09]" />
            <div className="h-11 w-28 rounded-xl bg-white/[0.055]" />
          </div>
        </section>
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-[26px] border border-white/8 bg-white/[0.025] p-5">
              <div className="h-3 w-20 rounded-full bg-white/[0.05]" />
              <div className="mt-4 h-8 w-28 rounded-xl bg-white/[0.075]" />
              <div className="mt-3 h-3 w-full rounded-full bg-white/[0.04]" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
