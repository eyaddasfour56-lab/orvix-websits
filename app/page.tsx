import Image from "next/image";
import Link from "next/link";

const products = [
  {
    name: "Google Fitbit Air",
    description:
      "Screen-free fitness tracking with heart rate, sleep, SpO₂ and up to 7 days battery life.",
    image: "/black.png",
    href: "/products/google-fitbit-air",
    price: "7,900 EGP",
    status: "Available now",
  },
  {
    name: "Garmin CIRQA",
    description:
      "A new screen-free health and fitness experience, coming soon to ORVIX.",
    image: "/black.jpeg",
    href: "/products/garmin-cirqa",
    price: "Coming soon",
    status: "Coming soon",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="ORVIX"
              width={44}
              height={44}
              className="rounded-full object-cover"
            />

            <span className="text-lg font-bold tracking-[0.35em]">
              ORVIX
            </span>
          </Link>

          <span className="text-sm text-gray-500">
            Fitness Technology
          </span>
        </div>
      </header>

      <section className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.45em] text-gray-500">
              ORVIX COLLECTION
            </p>

            <h1 className="mt-5 text-5xl font-black sm:text-7xl">
              OUR PRODUCTS
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Explore our screen-free fitness trackers and choose the
              product that fits your lifestyle.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {products.map((product) => (
              <Link
                key={product.name}
                href={product.href}
                className="group overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/25 sm:p-7"
              >
                <div className="overflow-hidden rounded-[32px] bg-white p-6">
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={700}
                    height={700}
                    className="h-auto w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="px-2 pb-2 pt-7">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                        {product.status}
                      </p>

                      <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                        {product.name}
                      </h2>
                    </div>

                    <span className="text-3xl transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <p className="mt-5 leading-7 text-gray-400">
                    {product.description}
                  </p>

                  <div className="mt-7 flex items-center justify-between">
                    <strong className="text-xl">
                      {product.price}
                    </strong>

                    <span className="rounded-full border border-white/15 px-5 py-3 font-bold">
                      View product
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. All rights reserved.
        </p>
      </footer>
    </main>
  );
}