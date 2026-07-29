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

const featureGroups = [
  {
    title: "Tracking",
    features: [
      {
        title: "Detailed Motion Data",
        description:
          "Stores up to 7 days of minute-by-minute motion information.",
      },
      {
        title: "Daily Totals",
        description:
          "Keeps daily activity totals for up to 30 days.",
      },
      {
        title: "Heart Rate Data",
        description:
          "Stores heart-rate measurements at frequent intervals.",
      },
      {
        title: "Optical Heart Rate",
        description:
          "Continuously tracks heart rate during daily use.",
      },
    ],
  },
  {
    title: "Battery & Power",
    features: [
      {
        title: "Up to 7 Days",
        description:
          "Battery life can last up to 7 days depending on usage.",
      },
      {
        title: "Fast Charging",
        description:
          "Charges from 0% to 100% in approximately 90 minutes.",
      },
      {
        title: "USB-C Charging",
        description:
          "Includes a USB-C charging cable for convenient charging.",
      },
      {
        title: "Bluetooth 5.0",
        description:
          "Uses Bluetooth Low Energy for syncing with your phone.",
      },
    ],
  },
  {
    title: "Sensors",
    features: [
      {
        title: "Accelerometer",
        description:
          "Tracks motion, steps and daily activity.",
      },
      {
        title: "Gyroscope",
        description:
          "Supports movement and orientation tracking.",
      },
      {
        title: "Skin Temperature",
        description:
          "Measures changes in skin temperature during sleep.",
      },
      {
        title: "Vibration Motor",
        description:
          "Provides gentle alerts and notifications.",
      },
    ],
  },
  {
    title: "Build & Durability",
    features: [
      {
        title: "Recycled Materials",
        description:
          "Made with recycled polymer and premium stainless steel details.",
      },
      {
        title: "Lightweight Design",
        description:
          "Weighs approximately 12 g with the band.",
      },
      {
        title: "Water Resistance",
        description:
          "Water resistant up to 50 metres for daily wear and swimming.",
      },
      {
        title: "Easy Care",
        description:
          "Designed to be rinsed, dried and worn comfortably every day.",
      },
    ],
  },
  {
    title: "Band & Fit",
    features: [
      {
        title: "Adjustable Wristband",
        description:
          "Flexible band designed for comfortable everyday wear.",
      },
      {
        title: "Small Wrist Size",
        description:
          "Fits wrist sizes around 130–175 mm.",
      },
      {
        title: "Large Wrist Size",
        description:
          "Fits wrist sizes around 165–210 mm.",
      },
      {
        title: "Compact Tracker",
        description:
          "Slim body measuring around 34.9 × 17 × 8.3 mm.",
      },
    ],
  },
  {
    title: "Compatibility",
    features: [
      {
        title: "Google Health App",
        description:
          "Requires a Google Account and the Google Health app.",
      },
      {
        title: "Android Support",
        description:
          "Compatible with Android 11 or newer.",
      },
      {
        title: "iPhone Support",
        description:
          "Compatible with iOS 16.4 or newer.",
      },
      {
        title: "Wireless Syncing",
        description:
          "Syncs through Bluetooth with an internet connection.",
      },
    ],
  },
];

export default function GoogleFitbitAirPage() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="ORVIX"
              width={42}
              height={42}
              className="rounded-full object-cover"
            />

            <span className="font-bold tracking-[0.3em]">
              ORVIX
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-gray-300"
          >
            ← Our Products
          </Link>
        </div>
      </header>

      {/* Product */}
      <section className="py-14 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Image */}
          <div className="rounded-[40px] bg-white p-6 sm:sticky sm:top-8 sm:p-8">
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

          {/* Information */}
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Screen-Free Fitness Tracker
            </p>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              Google Fitbit Air
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              A lightweight screen-free tracker designed to monitor your
              daily activity, heart rate, sleep and recovery.
            </p>

            {/* Colour selector */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid gap-3">
              {colours.map((colour) => {
                const selected = selectedColour.name === colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    className={`flex items-center justify-between rounded-2xl border p-5 font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`h-6 w-6 rounded-full border border-black/20 ${colour.dot}`}
                      />

                      <span>{colour.name}</span>
                    </span>

                    <span>{selected ? "Selected" : "Choose"}</span>
                  </button>
                );
              })}
            </div>

            {/* Price */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between text-xl">
                <span className="font-bold">Product price</span>
                <strong>7,900 EGP</strong>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Delivery fees will be calculated at checkout after
                selecting your governorate.
              </p>
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

      {/* Features */}
      <section className="border-t border-white/10 bg-[#0b0b0b] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Google Fitbit Air
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              Features at a glance
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              The most important technical details, organised into simple
              cards.
            </p>
          </div>

          <div className="mt-16 space-y-16">
            {featureGroups.map((group) => (
              <section key={group.title}>
                <div className="flex items-center gap-5">
                  <h3 className="shrink-0 text-2xl font-black uppercase tracking-[0.15em] sm:text-3xl">
                    {group.title}
                  </h3>

                  <div className="h-px flex-1 bg-white/15" />
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {group.features.map((feature) => (
                    <article
                      key={feature.title}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
                    >
                      <h4 className="font-bold leading-6 text-white sm:text-lg">
                        {feature.title}
                      </h4>

                      <p className="mt-3 text-sm leading-6 text-gray-400">
                        {feature.description}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-black">What’s in the box</h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                "Google Fitbit Air tracker",
                "Wristband",
                "USB-C charging cable",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-6 text-gray-600">
            Battery life, tracking accuracy and feature availability may
            vary depending on usage, phone compatibility and software
            version.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:px-6 md:flex-row">
          <p>© 2026 ORVIX. All rights reserved.</p>

          <Link href="/" className="font-bold text-white">
            View all products
          </Link>
        </div>
      </footer>
    </main>
  );
}