"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const colours = [
  {
    name: "Black",
    image: "/black.jpeg",
    dot: "bg-black",
  },
  {
    name: "French Gray",
    image: "/french gray.jpeg",
    dot: "bg-gray-400",
  },
  {
    name: "Mauve",
    image: "/mauve.jpeg",
    dot: "bg-purple-300",
  },
  {
    name: "Captain Blue",
    image: "/captain blue.jpeg",
    dot: "bg-blue-500",
  },
];

const sizes = ["S-M", "L-XL"];

const featureGroups = [
  {
    title: "Health",
    features: [
      {
        title: "24/7 Heart Rate",
        description:
          "Continuous heart-rate tracking with high and low heart-rate alerts.",
      },
      {
        title: "Body Battery",
        description:
          "Track your energy levels to find the best times for activity and rest.",
      },
      {
        title: "Pulse Ox",
        description:
          "Monitor your blood oxygen saturation while you are awake or asleep.",
      },
      {
        title: "Stress Tracking",
        description:
          "See whether your day is calm, balanced or stressful.",
      },
      {
        title: "Health Status",
        description:
          "Discover changes in your health data and usual wellness range.",
      },
      {
        title: "Skin Temperature",
        description:
          "Track overnight changes in your average skin temperature.",
      },
    ],
  },
  {
    title: "Sleep",
    features: [
      {
        title: "Advanced Sleep Monitoring",
        description:
          "View your sleep stages, sleep score and a detailed sleep breakdown.",
      },
      {
        title: "Sleep Coach",
        description:
          "Get personalised guidance for how much sleep you need.",
      },
      {
        title: "Sleep Alignment",
        description:
          "Understand your sleep consistency and circadian rhythm.",
      },
      {
        title: "Breathing Variations",
        description:
          "Understand changes in your breathing patterns while sleeping.",
      },
      {
        title: "Nap Detection",
        description:
          "Automatically track naps and see their effect on your recovery.",
      },
      {
        title: "Smart Wake Alarm",
        description:
          "Wake up with a gentle vibration at a suitable time.",
      },
    ],
  },
  {
    title: "Fitness",
    features: [
      {
        title: "Automatic Activity Detection",
        description:
          "Automatically detects activities such as walking and running.",
      },
      {
        title: "80+ Activities",
        description:
          "Track running, yoga, cycling and many other activities.",
      },
      {
        title: "Training Readiness",
        description:
          "Get a readiness score based on sleep, recovery and other health data.",
      },
      {
        title: "Training Status",
        description:
          "Understand whether your training is productive, peaking or strained.",
      },
      {
        title: "Steps & Calories",
        description:
          "Track your daily steps, calories burned and activity levels.",
      },
      {
        title: "Intensity Minutes",
        description:
          "Track your moderate and vigorous activity minutes.",
      },
    ],
  },
  {
    title: "Garmin Connect",
    features: [
      {
        title: "Sync Across Devices",
        description:
          "Keep your health and fitness data synced across Garmin devices.",
      },
      {
        title: "Lifestyle Logging",
        description:
          "Log lifestyle habits and understand how they affect your wellness.",
      },
      {
        title: "Mindful Breathing",
        description:
          "Start guided breathing activities and track respiration and stress.",
      },
      {
        title: "Meditation",
        description:
          "Access guided meditation practices through Garmin Connect+.",
      },
      {
        title: "Garmin Coach",
        description:
          "Follow selected coaching and fitness plans through Garmin Connect.",
      },
      {
        title: "Broadcast Heart Rate",
        description:
          "Share live heart-rate data with compatible Garmin devices.",
      },
    ],
  },
];

export default function GarminCirqaPage() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[0]);

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
          {/* Product image */}
          <div className="rounded-[40px] bg-white p-6 sm:sticky sm:top-8 sm:p-8">
            <Image
              key={selectedColour.name}
              src={selectedColour.image}
              alt={`Garmin CIRQA - ${selectedColour.name}`}
              width={700}
              height={700}
              priority
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          {/* Product information */}
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.25em] text-gray-300">
              Coming Soon
            </span>

            <p className="mt-7 text-sm uppercase tracking-[0.4em] text-gray-500">
              Screen-Free Smart Band
            </p>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              Garmin CIRQA
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              A screen-free smart band designed to track your health,
              sleep, recovery and daily activity through Garmin Connect.
            </p>

            {/* Colour selector */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {colours.map((colour) => {
                const selected = selectedColour.name === colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border border-black/20 ${colour.dot}`}
                    />

                    <span>{colour.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Size selector */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your size
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {sizes.map((size) => {
                const selected = selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl border p-4 text-center font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Selection summary */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                Selected option
              </p>

              <p className="mt-3 text-xl font-bold">
                {selectedColour.name} · {selectedSize}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Price and launch date will be announced soon.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-8 flex w-full cursor-not-allowed justify-center rounded-full border border-white/15 bg-white/5 px-8 py-5 text-lg font-bold text-gray-500"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-[#0b0b0b] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Garmin CIRQA
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              Features at a glance
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              The most important health, sleep and fitness features,
              organised into simple cards.
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

                <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
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

          <p className="mx-auto mt-16 max-w-3xl text-center text-xs leading-6 text-gray-600">
            Feature availability may depend on your country, compatible
            device, Garmin Connect version or a Garmin Connect+
            subscription.
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