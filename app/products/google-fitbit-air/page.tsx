"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_PRICE = 7900;
const CART_STORAGE_KEY = "orvixCart";

type CartItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  quantity: number;
  slug: string;
};

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

function readCart(): CartItem[] {
  try {
    const savedCart = window.localStorage.getItem(
      CART_STORAGE_KEY
    );

    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch {
    return [];
  }
}

export default function GoogleFitbitAirPage() {
  const [selectedColour, setSelectedColour] =
    useState(colours[0]);

  const [quantity, setQuantity] = useState(1);

  const [showAddedMessage, setShowAddedMessage] =
    useState(false);

  function openCartDrawer() {
    window.setTimeout(() => {
      const cartButton =
        document.querySelector<HTMLButtonElement>(
          'button[aria-label^="Open cart with"]'
        );

      cartButton?.click();
    }, 100);
  }

  function addToCart() {
    const currentCart = readCart();

    const itemId = `google-fitbit-air-${selectedColour.name.toLowerCase()}`;

    const existingItemIndex =
      currentCart.findIndex(
        (item) => item.id === itemId
      );

    let updatedCart: CartItem[];

    if (existingItemIndex >= 0) {
      updatedCart = currentCart.map(
        (item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                image: selectedColour.image,
                quantity: Math.min(
                  item.quantity + quantity,
                  10
                ),
              }
            : item
      );
    } else {
      const newItem: CartItem = {
        id: itemId,
        name: "Google Fitbit Air",
        colour: selectedColour.name,
        image: selectedColour.image,
        price: PRODUCT_PRICE,
        quantity,
        slug: "google-fitbit-air",
      };

      updatedCart = [...currentCart, newItem];
    }

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(updatedCart)
    );

    window.dispatchEvent(
      new Event("orvix-cart-updated")
    );

    setShowAddedMessage(true);

    window.setTimeout(() => {
      setShowAddedMessage(false);
    }, 2500);

    openCartDrawer();
  }

  return (
    <main className="min-h-screen bg-[#070707] pb-32 text-white md:pb-0">
      <Navbar />

      {/* Added-to-cart notification */}
      <div
        role="status"
        className={`fixed left-1/2 top-24 z-[100] -translate-x-1/2 transition duration-300 ${
          showAddedMessage
            ? "translate-y-0 opacity-100"
            : "-translate-y-4 pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/15 bg-white px-5 py-3 font-black text-black shadow-2xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-sm text-white">
            ✓
          </span>

          Added to your cart
        </div>
      </div>

      {/* Product */}
      <section className="py-14 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Product image */}
          <div className="rounded-[40px] bg-white p-6 sm:sticky sm:top-28 sm:p-8">
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

          {/* Product information */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                Screen-Free Fitness Tracker
              </p>

              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-400">
                Available Now
              </span>
            </div>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              Google Fitbit Air
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              A lightweight screen-free tracker
              designed to monitor your daily
              activity, heart rate, sleep and
              recovery.
            </p>

            {/* Colour selector */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name ===
                  colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() =>
                      setSelectedColour(colour)
                    }
                    className={`flex items-center justify-between rounded-2xl border p-5 font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`h-6 w-6 rounded-full border ${
                          selected
                            ? "border-black/20"
                            : "border-white/20"
                        } ${colour.dot}`}
                      />

                      <span>{colour.name}</span>
                    </span>

                    <span>
                      {selected
                        ? "Selected"
                        : "Choose"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quantity selector */}
            <div className="mt-8">
              <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
                Quantity
              </p>

              <div className="mt-5 flex w-fit items-center rounded-full border border-white/15 bg-white/5 p-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-2xl transition hover:bg-white/10"
                >
                  −
                </button>

                <span className="min-w-14 text-center text-xl font-black">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(10, current + 1)
                    )
                  }
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-black transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-gray-300">
                  Product price
                </span>

                <strong className="text-2xl">
                  {PRODUCT_PRICE.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </strong>
              </div>

              {quantity > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <span className="text-sm text-gray-400">
                    Total for {quantity} items
                  </span>

                  <strong>
                    {(
                      PRODUCT_PRICE * quantity
                    ).toLocaleString("en-GB")}{" "}
                    EGP
                  </strong>
                </div>
              )}

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Delivery fees will be calculated
                during checkout after selecting
                your governorate.
              </p>
            </div>

            {/* Desktop Add to Cart */}
            <button
              type="button"
              onClick={addToCart}
              className="mt-8 hidden w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 active:scale-[0.99] md:flex"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M3 4H5L7.2 14.2C7.4 15.2 8.3 16 9.4 16H17.7C18.7 16 19.6 15.3 19.9 14.3L21 8H6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M12 8V13M9.5 10.5H14.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              Add to Cart
            </button>

            {/* Trust information */}
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                "InstaPay on delivery",
                "Order tracking",
                "Official support",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center text-xs font-bold leading-5 text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
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
              The most important technical details,
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

                <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {group.features.map(
                    (feature) => (
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
                    )
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-black">
              What’s in the box
            </h3>

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
            Battery life, tracking accuracy and
            feature availability may vary depending
            on usage, phone compatibility and
            software version.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:px-6 md:flex-row">
          <p>
            © 2026 ORVIX. All rights reserved.
          </p>

          <Link
            href="/#products"
            className="font-bold text-white"
          >
            View all products
          </Link>
        </div>
      </footer>

      {/* Sticky Add to Cart - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-400">
              {selectedColour.name} · Qty{" "}
              {quantity}
            </p>

            <p className="mt-1 text-lg font-black">
              {(
                PRODUCT_PRICE * quantity
              ).toLocaleString("en-GB")}{" "}
              EGP
            </p>
          </div>

          <button
            type="button"
            onClick={addToCart}
            className="shrink-0 rounded-full bg-white px-6 py-4 font-black text-black transition active:scale-95"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  );
}