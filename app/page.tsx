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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-3"
          >
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

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">
              Fitness Technology
            </span>

            <Link
              href="/track-order"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-gray-200 sm:px-5"
            >
              Track Your Order
            </Link>
          </div>
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
              Explore our screen-free fitness
              trackers and choose the product that
              fits your lifestyle.
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

                  <div className="mt-7 flex items-center justify-between gap-4">
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

          <section className="mt-16 overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-7 text-center sm:p-12">
            <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
              Already placed an order?
            </p>

            <h2 className="mt-4 text-3xl font-black sm:text-5xl">
              Track your ORVIX order
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              Enter your order number and the phone
              number used during checkout to see
              your current order status.
            </p>

            <Link
              href="/track-order"
              className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black transition hover:bg-gray-200"
            >
              Track Your Order
            </Link>
          </section>
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
