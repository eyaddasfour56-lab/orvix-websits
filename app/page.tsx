"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CirqaComingSoon from "./components/CirqaComingSoon";

const colours = [
  {
    name: "Black",
    image: "/black.png",
    color: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    color: "bg-violet-300",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    color: "bg-pink-600",
  },
];

export default function Home() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">

      {/* Header */}

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <Link href="/" className="flex items-center gap-3">

            <Image
              src="/logo.jpeg"
              alt="ORVIX"
              width={46}
              height={46}
              className="rounded-xl"
            />

            <span className="tracking-[0.35em] font-bold">
              ORVIX
            </span>

          </Link>

          <nav className="hidden md:flex items-center gap-8 text-gray-400">

            <a href="#product">Product</a>

            <a href="#features">Features</a>

            <a href="#reviews">Reviews</a>

            <a href="#faq">FAQ</a>

          </nav>

          <Link
            href="/checkout"
            className="rounded-full bg-white px-7 py-3 font-bold text-black hover:bg-gray-200 transition"
          >
            Buy Now
          </Link>

        </div>

      </header>

      {/* Hero */}

      <section className="pt-40 pb-28">

        <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 lg:grid-cols-2">

          <div>

            <p className="uppercase tracking-[0.45em] text-sm text-gray-500">
              Fitness Tracker
            </p>

            <h1 className="mt-8 text-6xl font-black leading-none lg:text-8xl">

              GOOGLE

              <br />

              FITBIT AIR

            </h1>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {[
    {
      title: "24/7 Heart Rate",
      description: "Continuous heart-rate monitoring throughout your day.",
    },
    {
      title: "Sleep & SpO₂",
      description: "Track your sleep and monitor blood oxygen levels.",
    },
    {
      title: "Up to 7 Days",
      description: "Long-lasting battery life for everyday use.",
    },
    {
      title: "5 m Water Resistance",
      description: "Built to handle everyday splashes and water exposure.",
    },
    {
      title: "Fast Charging",
      description: "Charge from 0% to 100% in approximately 90 minutes.",
    },
    {
      title: "iOS & Android",
      description: "Compatible with both iPhone and Android devices.",
    },
  ].map((feature) => (
    <div
      key={feature.title}
      className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.08]"
    >
      <h3 className="text-lg font-bold text-white">
        {feature.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {feature.description}
      </p>
    </div>
  ))}
</div>
            <div className="mt-12 flex gap-5">

              <Link
                href="/checkout"
                className="rounded-full bg-white px-8 py-4 font-bold text-black hover:bg-gray-200 transition"
              >
                Buy Now
              </Link>

              <a
                href="#product"
                className="rounded-full border border-white/20 px-8 py-4 hover:bg-white hover:text-black transition"
              >
                Learn More
              </a>

            </div>

            <div className="mt-14 flex gap-12">

              <div>

              <div>
  <h3 className="text-3xl font-bold">
    7,900 EGP
  </h3>

  <p className="mt-1 text-sm text-gray-500 line-through">
    8,500 EGP
  </p>
</div>

                <p className="text-gray-500">
                  Cash on delivery
                </p>

              </div>

              <div>

                <h3 className="text-3xl font-bold">
                  3
                </h3>

                <p className="text-gray-500">
                  Colours
                </p>

              </div>

            </div>

          </div>

          <div className="flex justify-center">

        <img
  key={selectedColour.name}
  src={
    selectedColour.name === "Black"
      ? "/black.png?v=100"
      : selectedColour.image
  }
  alt="Google Fitbit Air"
  className="block h-auto w-full rounded-[40px] object-contain"
/>

          </div>

        </div>

      </section>
      {/* Product */}

      <section
        id="product"
        className="border-y border-white/10 bg-[#0b0b0b] py-28"
      >

        <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 lg:grid-cols-2">

          <div className="rounded-[40px] bg-white p-8">

            <Image
              src={selectedColour.image}
              alt={selectedColour.name}
              width={700}
              height={700}
              className="w-full h-auto"
            />

          </div>

          <div>

            <p className="uppercase tracking-[0.4em] text-sm text-gray-500">
              Choose your colour
            </p>

            <h2 className="mt-6 text-5xl font-black">
              Google fitbit air
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-400">
              Select the colour you love before placing your order.
            </p>

            <div className="mt-10 flex gap-5">

              {colours.map((colour) => (

                <button
                  key={colour.name}
                  type="button"
                  onClick={() => setSelectedColour(colour)}
                  className={`h-14 w-14 rounded-full border-4 transition ${
                    selectedColour.name === colour.name
                      ? "border-white scale-110"
                      : "border-gray-700"
                  } ${colour.color}`}
                />

              ))}

            </div>

            <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-8">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-gray-400">
                    pre-order 
                  </p>

                  <div className="mt-2">
  <h3 className="text-4xl font-bold">
    7,900 EGP
  </h3>

  <p className="mt-1 text-sm text-gray-400 line-through">
    8,500 EGP
  </p>
</div>

                </div>

                <Link
                  href="/checkout"
                  className="rounded-full bg-white px-8 py-4 font-bold text-black hover:bg-gray-200 transition"
                >
                  Buy Now
                </Link>

              </div>

            </div>

          </div>

        </div>

      </section>
<CirqaComingSoon />
    </main>

  );

}