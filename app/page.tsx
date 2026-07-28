"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const colours = [
  {
    name: "Black",
    image: "/black.pnj",
    dot: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    dot: "bg-violet-300",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    dot: "bg-pink-600",
  },
];

const features = [
  {
    title: "24/7 Heart Rate",
    description:
      "Continuous heart-rate monitoring throughout your day.",
  },
  {
    title: "Sleep & SpO₂",
    description:
      "Track your sleep and monitor blood oxygen levels.",
  },
  {
    title: "Up to 7 Days",
    description:
      "Long-lasting battery life for everyday use.",
  },
  {
    title: "5 m Water Resistance",
    description:
      "Built to handle everyday splashes and water exposure.",
  },
  {
    title: "Fast Charging",
    description:
      "Charge from 0% to 100% in approximately 90 minutes.",
  },
  {
    title: "iOS & Android",
    description:
      "Compatible with both iPhone and Android devices.",
  },
];

export default function Home() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
    }).catch(() => {
      // The website still works if view tracking fails.
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="ORVIX"
              width={42}
              height={42}
              className="rounded-full object-cover"
            />

            <span className="text-lg font-bold tracking-[0.35em]">
              ORVIX
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#product" className="text-sm text-gray-300">
              Product
            </a>

            <a href="#features" className="text-sm text-gray-300">
              Features
            </a>

            <a href="#faq" className="text-sm text-gray-300">
              FAQ
            </a>

            <Link
              href="/checkout"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black"
            >
              Buy Now
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 md:hidden"
            aria-label="Open menu"
          >
            <span className="text-2xl">☰</span>
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-white/10 bg-black px-4 py-5 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <a
                href="#product"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-gray-300 hover:bg-white/10"
              >
                Product
              </a>

              <a
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-gray-300 hover:bg-white/10"
              >
                Features
              </a>

              <a
                href="#faq"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-gray-300 hover:bg-white/10"
              >
                FAQ
              </a>

              <Link
                href="/checkout"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-full bg-white px-6 py-4 text-center font-bold text-black"
              >
                Buy Now
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="pb-20 pt-32 sm:pt-36 lg:pb-28 lg:pt-40">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Product image: first on mobile */}
          <div className="order-1 flex justify-center rounded-[40px] bg-white p-6 lg:order-2 lg:p-8">
            <Image
              key={selectedColour.name}
              src={selectedColour.image}
              alt={`Google Fitbit Air - ${selectedColour.name}`}
              width={700}
              height={700}
              priority
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          {/* Product details: second on mobile */}
          <div className="order-2 lg:order-1">
            <p className="text-sm uppercase tracking-[0.45em] text-gray-500">
              Fitness Tracker
            </p>

            <h1 className="mt-6 text-5xl font-black leading-none sm:text-6xl lg:text-8xl">
              GOOGLE
              <br />
              FITBIT AIR
            </h1>

            <div
              id="features"
              className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <h2 className="font-bold">{feature.title}</h2>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/checkout"
                className="rounded-full bg-white px-8 py-4 font-bold text-black"
              >
                Buy Now
              </Link>

              <a
                href="#product"
                className="rounded-full border border-white/20 px-8 py-4 font-medium"
              >
                Learn More
              </a>
            </div>

            <div className="mt-12 flex items-end gap-12">
              <div>
                <p className="text-3xl font-bold">7,900 EGP</p>
                <p className="mt-1 text-sm text-gray-600 line-through">
                  8,500 EGP
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Cash on delivery
                </p>
              </div>

              <div>
                <p className="text-3xl font-bold">3</p>
                <p className="mt-1 text-sm text-gray-500">
                  Colours
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product section */}
      <section
        id="product"
        className="border-y border-white/10 bg-[#0b0b0b] py-24"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Image first */}
          <div className="order-1 rounded-[40px] bg-white p-6 sm:p-8">
            <Image
              key={`product-${selectedColour.name}`}
              src={selectedColour.image}
              alt={selectedColour.name}
              width={700}
              height={700}
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          {/* Details second */}
          <div className="order-2">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Choose your colour
            </p>

            <h2 className="mt-6 text-5xl font-black">
              Google Fitbit Air
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              Select the colour you love before placing your order.
              The displayed product image changes automatically.
            </p>

            <div className="mt-10 grid gap-4">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name === colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`h-6 w-6 rounded-full border border-black/20 ${colour.dot}`}
                      />

                      <span className="font-bold">
                        {colour.name}
                      </span>
                    </span>

                    <span>{selected ? "Selected" : "Choose"}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between gap-5">
                <span className="text-gray-400">Price</span>
                <strong>7,900 EGP</strong>
              </div>

              <div className="mt-4 flex justify-between gap-5">
                <span className="text-gray-400">Delivery</span>
                <strong>70 EGP</strong>
              </div>

              <div className="my-5 h-px bg-white/10" />

              <div className="flex justify-between gap-5 text-xl">
                <span className="font-bold">Final total</span>
                <strong>7,970 EGP</strong>
              </div>
            </div>

            <Link
              href={`/checkout?colour=${encodeURIComponent(
                selectedColour.name
              )}`}
              className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black"
            >
              Order {selectedColour.name}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
            FAQ
          </p>

          <h2 className="mt-5 text-5xl font-black">
            Frequently asked questions
          </h2>

          <div className="mt-12 space-y-4">
            <details className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <summary className="cursor-pointer font-bold">
                How do I place an order?
              </summary>

              <p className="mt-4 leading-7 text-gray-400">
                Select your preferred colour, press the order
                button, then complete your delivery details.
              </p>
            </details>

            <details className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <summary className="cursor-pointer font-bold">
                What payment method is available?
              </summary>

              <p className="mt-4 leading-7 text-gray-400">
                Payment is made in cash when your order is
                delivered.
              </p>
            </details>

            <details className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <summary className="cursor-pointer font-bold">
                Which devices are compatible?
              </summary>

              <p className="mt-4 leading-7 text-gray-400">
                Google Fitbit Air is compatible with both iPhone
                and Android devices.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm text-gray-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 ORVIX. All rights reserved.</p>

          <Link href="/checkout" className="text-white">
            Order Google Fitbit Air
          </Link>
        </div>
      </footer>
    </main>
  );
}
