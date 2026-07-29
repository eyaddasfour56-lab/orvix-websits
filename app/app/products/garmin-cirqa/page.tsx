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

export default function GarminCirqaPage() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [selectedSize, setSelectedSize] = useState(sizes[0]);

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
              alt={`Garmin CIRQA - ${selectedColour.name}`}
              width={700}
              height={700}
              priority
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.25em]">
              Coming Soon
            </div>

            <h1 className="mt-6 text-5xl font-black sm:text-6xl">
              Garmin CIRQA
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-400">
              A new screen-free health and fitness experience is coming
              soon to ORVIX.
            </p>

            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name === colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => setSelectedColour(colour)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 font-bold ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full border border-black/20 ${colour.dot}`}
                    />
                    {colour.name}
                  </button>
                );
              })}
            </div>

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
                    className={`rounded-2xl border p-4 font-bold ${
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

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">Selected option</p>

              <p className="mt-3 text-xl font-bold">
                {selectedColour.name} · {selectedSize}
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
    </main>
  );
}