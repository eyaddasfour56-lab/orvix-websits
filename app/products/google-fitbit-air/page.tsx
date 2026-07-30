"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductColour = {
  name: "Black" | "Lavender" | "Berry";
  image: string;
  dotColour: string;
};

const productColours: ProductColour[] = [
  {
    name: "Black",
    image: "/black.png",
    dotColour: "#000000",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    dotColour: "#aaa4d8",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    dotColour: "#cf4d77",
  },
];

const productFeatures = [
  "Heart-rate tracking",
  "Sleep tracking",
  "Blood oxygen monitoring",
  "Up to 7 days battery life",
  "Water resistant",
  "Compatible with iOS and Android",
  "Lightweight and comfortable",
  "Full charge in approximately 90 minutes",
];

export default function FitbitAirPage() {
  const router = useRouter();

  const [selectedColour, setSelectedColour] =
    useState<ProductColour>(productColours[0]);

  const [quantity, setQuantity] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);

  function decreaseQuantity() {
    setQuantity((currentQuantity) =>
      currentQuantity > 1 ? currentQuantity - 1 : 1
    );
  }

  function increaseQuantity() {
    setQuantity((currentQuantity) => currentQuantity + 1);
  }

  function handleBuyNow() {
    const checkoutProduct = {
      id: "google-fitbit-air",
      name: "Google Fitbit Air",
      colour: selectedColour.name,
      quantity,
      price: 7900,
      image: selectedColour.image,
    };

    localStorage.setItem(
      "orvixCheckoutProduct",
      JSON.stringify(checkoutProduct)
    );

    const checkoutParameters = new URLSearchParams({
      product: checkoutProduct.name,
      colour: checkoutProduct.colour,
      quantity: checkoutProduct.quantity.toString(),
      price: checkoutProduct.price.toString(),
      image: checkoutProduct.image,
    });

    router.push(`/checkout?${checkoutParameters.toString()}`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[92px] w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* Logo */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
            aria-label="Go to homepage"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#101010] sm:h-14 sm:w-14">
              <img
                src="/logo.png"
                alt="ORVIX logo"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>

            <span className="text-xl font-black tracking-[0.32em] sm:text-2xl">
              ORVIX
            </span>
          </button>

          {/* Header buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wishlist */}
            <button
              type="button"
              className="hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0d0d0d] transition hover:border-white/40 hover:bg-[#171717] sm:flex sm:h-14 sm:w-14"
              aria-label="Wishlist"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                />
              </svg>
            </button>

            {/* Cart */}
            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0d0d0d] transition hover:border-white/40 hover:bg-[#171717] sm:h-14 sm:w-14"
              aria-label="Shopping cart"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H7"
                />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </button>

            {/* Menu */}
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#0d0d0d] transition hover:border-white/40 hover:bg-[#171717] sm:h-14 sm:w-14"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    d="M6 6l12 12M18 6 6 18"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    d="M4 7h16M4 12h16M4 17h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#080808] px-5 py-5 sm:px-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl px-4 py-3 text-left font-semibold transition hover:bg-white/10"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => router.push("/#products")}
                className="rounded-xl px-4 py-3 text-left font-semibold transition hover:bg-white/10"
              >
                Our Products
              </button>

              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="rounded-xl px-4 py-3 text-left font-semibold transition hover:bg-white/10"
              >
                Checkout
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Back button */}
      <div className="mx-auto w-full max-w-7xl px-5 pt-7 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#101010] px-5 py-3 text-sm font-bold transition hover:border-white/40 hover:bg-[#171717]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15 18-6-6 6-6"
            />
          </svg>

          Back
        </button>
      </div>

      {/* Product section */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-14">
        {/* Product gallery */}
        <div>
          {/* Main image outer card */}
          <div className="rounded-[34px] border border-white/15 bg-[#111111] p-4 shadow-2xl shadow-black/40 sm:p-6">
            {/* Main white image box */}
            <div className="relative flex min-h-[410px] items-center justify-center overflow-hidden rounded-[28px] bg-white p-5 sm:min-h-[570px] sm:p-10">
              <span className="absolute right-4 top-4 rounded-full bg-[#18d86b] px-4 py-2 text-xs font-black tracking-wide text-black sm:right-6 sm:top-6 sm:px-5 sm:py-3 sm:text-sm">
                AVAILABLE NOW
              </span>

              <img
                key={selectedColour.image}
                src={selectedColour.image}
                alt={`Google Fitbit Air in ${selectedColour.name}`}
                className="h-auto max-h-[480px] w-full object-contain transition-all duration-300 sm:max-h-[520px]"
              />
            </div>
          </div>

          {/* Colour thumbnails */}
          <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
            {productColours.map((colour) => {
              const isSelected = selectedColour.name === colour.name;

              return (
                <button
                  type="button"
                  key={colour.name}
                  onClick={() => setSelectedColour(colour)}
                  className={`overflow-hidden rounded-[22px] border-2 p-2 transition duration-200 sm:p-3 ${
                    isSelected
                      ? "border-white bg-[#181818] shadow-lg shadow-white/5"
                      : "border-white/10 bg-[#101010] hover:border-white/35"
                  }`}
                  aria-label={`Select ${colour.name}`}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[16px] bg-white p-1">
                    <img
                      src={colour.image}
                      alt={`${colour.name} Fitbit Air`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 pb-1">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                      style={{ backgroundColor: colour.dotColour }}
                    />

                    <span className="truncate text-xs font-bold sm:text-sm">
                      {colour.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product details */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.38em] text-[#7f8290] sm:text-base">
            Fitness Tracker
          </p>

          <h1 className="mt-5 text-4xl font-black uppercase leading-[0.95] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Google
            <br />
            Fitbit Air
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#a4a6b1] sm:text-lg sm:leading-8">
            Track your fitness, sleep, heart rate and daily activity with a
            lightweight wearable designed for comfort and everyday performance.
          </p>

          {/* Price */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <p className="text-3xl font-black sm:text-4xl">7,900 EGP</p>

            <p className="text-lg font-bold text-white/35 line-through">
              8,500 EGP
            </p>

            <span className="rounded-full bg-[#18d86b] px-4 py-2 text-xs font-black text-black">
              SALE
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#101010] p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                i
              </span>

              <div>
                <p className="font-bold text-white">Pre-order product</p>
                <p className="mt-1 text-sm leading-6 text-[#9698a3]">
                  Expected delivery time is approximately 20–45 days.
                </p>
              </div>
            </div>
          </div>

          {/* Colour selector */}
          <div className="mt-9">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-wide">
                Choose Colour
              </h2>

              <span className="text-sm font-bold text-[#90929d]">
                {selectedColour.name}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {productColours.map((colour) => {
                const isSelected = selectedColour.name === colour.name;

                return (
                  <button
                    type="button"
                    key={colour.name}
                    onClick={() => setSelectedColour(colour)}
                    className={`flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border px-2 text-xs font-bold transition sm:text-sm ${
                      isSelected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-[#101010] text-white hover:border-white/40"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border ${
                        isSelected ? "border-black/20" : "border-white/30"
                      }`}
                      style={{ backgroundColor: colour.dotColour }}
                    />

                    <span className="truncate">{colour.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-black uppercase tracking-wide">
              Quantity
            </h2>

            <div className="flex w-fit items-center overflow-hidden rounded-2xl border border-white/15 bg-[#101010]">
              <button
                type="button"
                onClick={decreaseQuantity}
                className="flex h-14 w-14 items-center justify-center text-2xl font-light transition hover:bg-white hover:text-black"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span className="flex h-14 min-w-16 items-center justify-center border-x border-white/15 px-4 text-lg font-black">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                className="flex h-14 w-14 items-center justify-center text-2xl font-light transition hover:bg-white hover:text-black"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Buy now */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="group mt-8 flex w-full items-center justify-between rounded-2xl bg-white px-6 py-5 text-base font-black uppercase tracking-wide text-black transition hover:scale-[1.01] hover:bg-[#18d86b] active:scale-[0.99] sm:max-w-md"
          >
            <span>Buy Now</span>

            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14m-6-6 6 6-6 6"
              />
            </svg>
          </button>

          {/* Secure note */}
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#898b96]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>

            Secure checkout through ORVIX
          </div>
        </div>
      </section>

      {/* Product features */}
      <section className="border-t border-white/10 bg-[#070707]">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
          <p className="text-center text-sm font-bold uppercase tracking-[0.38em] text-[#777a87]">
            Product Details
          </p>

          <h2 className="mt-4 text-center text-3xl font-black uppercase sm:text-4xl">
            Built For Everyday Life
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {productFeatures.map((feature, index) => (
              <div
                key={feature}
                className="rounded-[24px] border border-white/10 bg-[#111111] p-5 transition hover:-translate-y-1 hover:border-white/25"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-black">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <p className="mt-5 text-base font-bold leading-6">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <p className="text-xl font-black tracking-[0.3em]">ORVIX</p>

          <p className="text-sm text-[#777985]">
            Fitness technology that fits your lifestyle.
          </p>
        </div>
      </footer>
    </main>
  );
}