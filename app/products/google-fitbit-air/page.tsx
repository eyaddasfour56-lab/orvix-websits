"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductColour = {
  name: "Black" | "Lavender" | "Berry";
  image: string;
  colourClass: string;
};

const colours: ProductColour[] = [
  {
    name: "Black",
    image: "/black.png",
    colourClass: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    colourClass: "bg-[#aaa4d8]",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    colourClass: "bg-[#c74b76]",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [selectedColour, setSelectedColour] =
    useState<ProductColour>(colours[0]);

  const [quantity, setQuantity] = useState(1);

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
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      {/* Header */}
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-2xl font-black tracking-[0.25em]"
          >
            ORVIX
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-black px-5 py-2 text-sm font-semibold transition hover:bg-black hover:text-white"
          >
            Back
          </button>
        </div>
      </header>

      {/* Product */}
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-16">
        {/* Images */}
        <div>
          {/* Main product image */}
          <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:min-h-[550px] sm:p-8">
            <img
              key={selectedColour.image}
              src={selectedColour.image}
              alt={`Google Fitbit Air in ${selectedColour.name}`}
              className="h-auto max-h-[500px] w-full object-contain transition-all duration-300"
            />
          </div>

          {/* Colour image boxes */}
          <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
            {colours.map((colour) => {
              const isSelected = selectedColour.name === colour.name;

              return (
                <button
                  type="button"
                  key={colour.name}
                  onClick={() => setSelectedColour(colour)}
                  className={`overflow-hidden rounded-2xl border-2 bg-white p-2 transition sm:p-3 ${
                    isSelected
                      ? "border-black shadow-md"
                      : "border-transparent hover:border-black/30"
                  }`}
                  aria-label={`Select ${colour.name}`}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f7f7f5]">
                    <img
                      src={colour.image}
                      alt={colour.name}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full border border-black/20 ${colour.colourClass}`}
                    />

                    <span className="text-xs font-semibold sm:text-sm">
                      {colour.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product information */}
        <div className="flex flex-col justify-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-black/50">
            Fitness tracker
          </p>

          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Google Fitbit Air
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-black/65 sm:text-lg">
            A lightweight fitness tracker designed to follow your activity,
            heart rate, sleep and daily wellness while maintaining a simple,
            comfortable design.
          </p>

          {/* Price */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-black">7,900 EGP</p>

            <p className="text-lg font-semibold text-black/40 line-through">
              8,500 EGP
            </p>

            <span className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white">
              SALE
            </span>
          </div>

          <p className="mt-2 text-sm font-medium text-black/55">
            Pre-order delivery: approximately 20–45 days
          </p>

          {/* Selected colour */}
          <div className="mt-9">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">Choose colour</h2>

              <p className="text-sm font-semibold text-black/55">
                {selectedColour.name}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {colours.map((colour) => {
                const isSelected = selectedColour.name === colour.name;

                return (
                  <button
                    type="button"
                    key={colour.name}
                    onClick={() => setSelectedColour(colour)}
                    className={`flex min-w-[115px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-black/15 bg-white hover:border-black"
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full border ${
                        isSelected ? "border-white/40" : "border-black/20"
                      } ${colour.colourClass}`}
                    />

                    {colour.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-8">
            <h2 className="mb-4 font-bold">Quantity</h2>

            <div className="flex w-fit items-center overflow-hidden rounded-xl border border-black/20 bg-white">
              <button
                type="button"
                onClick={decreaseQuantity}
                className="flex h-12 w-12 items-center justify-center text-xl font-bold transition hover:bg-black hover:text-white"
                aria-label="Decrease quantity"
              >
                −
              </button>

              <span className="flex h-12 min-w-14 items-center justify-center border-x border-black/20 px-4 font-bold">
                {quantity}
              </span>

              <button
                type="button"
                onClick={increaseQuantity}
                className="flex h-12 w-12 items-center justify-center text-xl font-bold transition hover:bg-black hover:text-white"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Buy button */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="mt-8 w-full rounded-2xl bg-black px-8 py-4 text-base font-bold text-white transition hover:scale-[1.01] hover:bg-black/85 active:scale-[0.99] sm:w-fit sm:min-w-[260px]"
          >
            Buy Now
          </button>

          {/* Features */}
          <div className="mt-10 border-t border-black/10 pt-8">
            <h2 className="mb-5 text-xl font-black">Product features</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Heart-rate tracking",
                "Sleep tracking",
                "Blood oxygen monitoring",
                "Up to 7 days battery",
                "Water resistant",
                "iOS and Android support",
                "Lightweight design",
                "Full charge in approximately 90 minutes",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm"
                >
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                    ✓
                  </span>

                  <p className="text-sm font-medium leading-5">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}