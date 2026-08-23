"use client";

import Image from "next/image";
import { useState } from "react";

const colours = [
  {
    name: "Black",
    image: "/black.jpeg",
    buttonStyle: "bg-neutral-950",
  },
  {
    name: "Captain Blue",
    image: "/captain blue.jpeg",
    buttonStyle: "bg-slate-800",
  },
  {
    name: "Mauve",
    image: "/mauve.jpeg",
    buttonStyle: "bg-rose-300",
  },
  {
    name: "French Gray",
    image: "/french gray.jpeg",
    buttonStyle: "bg-stone-300",
  },
];

const sizes = ["S–M", "L–XL"];

const features = [
  {
    title: "Advanced Health Tracking",
    description:
      "Monitor wrist-based heart rate, Body Battery, Pulse Ox, stress, skin temperature and important health trends.",
  },
  {
    title: "Advanced Sleep Insights",
    description:
      "Track sleep score, sleep stages, naps, HRV, breathing variations and receive personalised sleep coaching.",
  },
  {
    title: "Fitness and Recovery",
    description:
      "Automatically detect activities, track more than 80 activities and monitor training readiness and recovery.",
  },
  {
    title: "Garmin Connect",
    description:
      "Sync your health, sleep and fitness information seamlessly through the Garmin Connect app.",
  },
];

export default function CirqaComingSoon() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[0]);

  return (
    <section
      id="cirqa"
      className="border-y border-white/10 bg-white/[0.03] px-6 py-20 md:px-10 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">
            Coming Soon
          </p>

          <h2 className="mt-4 text-4xl font-bold md:text-6xl">
            Garmin CIRQA
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            A discreet, screen-free smart band designed for continuous health,
            sleep and fitness tracking throughout your day and night.
          </p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <div className="overflow-hidden rounded-[40px] bg-white p-6 md:p-10">
              <Image
                key={selectedColour.image}
                src={selectedColour.image}
                alt={`Garmin CIRQA in ${selectedColour.name}`}
                width={900}
                height={900}
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm text-gray-500">
                Selected colour
              </p>

              <p className="mt-1 text-lg font-bold">
                {selectedColour.name}
              </p>

              <div className="mt-5 flex flex-wrap gap-4">
                {colours.map((colour) => (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    aria-label={`Select ${colour.name}`}
                    title={colour.name}
                    className={`h-12 w-12 rounded-full border-4 transition ${
                      colour.buttonStyle
                    } ${
                      selectedColour.name === colour.name
                        ? "scale-110 border-white"
                        : "border-white/20 hover:border-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em]">
              Coming Soon
            </span>

            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">
              Smart health band
            </p>

            <h3 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">
              Garmin CIRQA
            </h3>

            <p className="mt-6 text-lg leading-8 text-gray-400">
              Continuous health, recovery, sleep and fitness insights in a
              lightweight design made for comfortable all-day and overnight
              wear.
            </p>

            <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6">
              <p className="text-sm text-gray-500">
                Select size
              </p>

              <p className="mt-1 text-lg font-bold">
                {selectedSize}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl border px-5 py-4 font-bold transition ${
                      selectedSize === size
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Available in S–M and L–XL.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-black/30 p-5"
                >
                  <h4 className="text-lg font-bold">
                    {feature.title}
                  </h4>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                Availability
              </p>

              <p className="mt-3 text-3xl font-bold">
                Coming Soon
              </p>

              <p className="mt-3 leading-7 text-gray-400">
                Price and release date will be announced later.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-7 w-full cursor-not-allowed rounded-full bg-white/15 px-7 py-4 text-lg font-bold text-gray-400"
            >
              Coming Soon
            </button>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              Certain health and coaching features may require Garmin Connect+
              or another compatible service.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
