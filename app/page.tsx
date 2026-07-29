import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const products = [
  {
    name: "Google Fitbit Air",
    description:
      "Screen-free fitness tracking with heart rate, sleep, SpO₂ and up to 7 days battery life.",
    image: "/black.png",
    href: "/products/google-fitbit-air",
    price: "7,900 EGP",
    status: "Available now",
    available: true,
  },
  {
    name: "Garmin CIRQA",
    description:
      "A new screen-free health and fitness experience, coming soon to ORVIX.",
    image: "/black.jpeg",
    href: "/products/garmin-cirqa",
    price: "Coming soon",
    status: "Coming soon",
    available: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <section className="px-4 py-16 sm:px-6 sm:py-24">
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

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {products.map((product) => {
              const cardContent = (
                <>
                  <div className="relative overflow-hidden rounded-[32px] bg-white p-6">
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={700}
                      height={700}
                      priority={
                        product.name ===
                        "Google Fitbit Air"
                      }
                      className="h-auto w-full object-contain transition duration-500 group-hover:scale-105"
                    />

                    {!product.available && (
                      <span className="absolute right-4 top-4 rounded-full bg-black px-4 py-2 text-xs font-black uppercase tracking-wider text-white">
                        Coming Soon
                      </span>
                    )}
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

                      {product.available && (
                        <span className="text-3xl transition group-hover:translate-x-1">
                          →
                        </span>
                      )}
                    </div>

                    <p className="mt-5 leading-7 text-gray-400">
                      {product.description}
                    </p>

                    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <strong className="text-xl">
                        {product.price}
                      </strong>

                      <span
                        className={`rounded-full px-5 py-3 text-center font-bold ${
                          product.available
                            ? "border border-white/15"
                            : "cursor-not-allowed bg-white/10 text-gray-500"
                        }`}
                      >
                        {product.available
                          ? "View Product"
                          : "Not Available Yet"}
                      </span>
                    </div>
                  </div>
                </>
              );

              if (!product.available) {
                return (
                  <article
                    key={product.name}
                    aria-disabled="true"
                    className="group overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-5 opacity-80 sm:p-7"
                  >
                    {cardContent}
                  </article>
                );
              }

              return (
                <Link
                  key={product.name}
                  href={product.href}
                  className="group overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-white/25 sm:p-7"
                >
                  {cardContent}
                </Link>
              );
            })}
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
              number used during checkout to view
              the latest status of your order.
            </p>

            <Link
              href="/track-order"
              className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200"
            >
              Track Your Order
            </Link>
          </section>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-gray-600">
            © 2026 ORVIX. All rights reserved.
          </p>

          <div className="flex items-center gap-5 text-sm font-semibold text-gray-500">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Products
            </Link>

            <Link
              href="/track-order"
              className="transition hover:text-white"
            >
              Track Order
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

