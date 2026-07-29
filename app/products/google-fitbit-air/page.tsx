"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const colours = [
  {
    name: "Black",
    image: "/black.png",
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
  "24/7 Heart Rate",
  "Sleep & SpO₂",
  "Up to 7 Days Battery",
  "5 m Water Resistance",
  "Fast Charging",
  "iOS & Android",
];

export default function GoogleFitbitAirPage() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="font-bold tracking-[0.3em]">
            ORVIX
          </Link>

          <Link href="/" className="text-sm text-gray-400">
            ← Our Products
          </Link>
        </div>
      </header>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          <div className="rounded-[40px] bg-white p-6 sm:p-8">
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

          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Fitness Tracker
            </p>

            <h1 className="mt-5 text-5xl font-black sm:text-6xl">
              Google Fitbit Air
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-400">
              A screen-free fitness tracker designed to monitor your
              health, activity and recovery throughout the day.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 font-medium"
                >
                  {feature}
                </div>
              ))}
            </div>

            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name === colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    className={`flex items-center justify-between rounded-2xl border p-5 font-bold ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`h-6 w-6 rounded-full border border-black/20 ${colour.dot}`}
                      />
                      {colour.name}
                    </span>

                    <span>{selected ? "Selected" : "Choose"}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between">
                <span className="text-gray-400">Price</span>
                <strong>7,900 EGP</strong>
              </div>

              <div className="mt-4 flex justify-between">
                <span className="text-gray-400">Delivery</span>
                <strong>70 EGP</strong>
              </div>

              <div className="my-5 h-px bg-white/10" />

              <div className="flex justify-between text-xl">
                <strong>Final total</strong>
                <strong>7,970 EGP</strong>
              </div>
            </div>

            <Link
              href={`/checkout?product=Google%20Fitbit%20Air&colour=${encodeURIComponent(
                selectedColour.name
              )}`}
              className="mt-8 flex w-full justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}