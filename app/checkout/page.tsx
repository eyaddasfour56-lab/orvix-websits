"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const PRODUCT_PRICE = 7900;

const colours = [
  {
    name: "Black",
    image: "/black.png",
    buttonStyle: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    buttonStyle: "bg-violet-300",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    buttonStyle: "bg-pink-600",
  },
];

const deliveryAreas = [
  {
    code: "CAIRO",
    name: "Cairo",
    fee: 70,
  },
  {
    code: "ALEXANDRIA",
    name: "Alexandria",
    fee: 75,
  },
  {
    code: "DELTA_CANAL",
    name: "Delta and Canal Cities",
    fee: 85,
  },
  {
    code: "UPPER_EGYPT_RED_SEA",
    name: "Upper Egypt and Red Sea",
    fee: 100,
  },
  {
    code: "REMOTE_AREAS",
    name: "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
    fee: 140,
  },
];

export default function CheckoutPage() {
  const [selectedColour, setSelectedColour] = useState(colours[0]);
  const [selectedAreaCode, setSelectedAreaCode] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discountMessage, setDiscountMessage] = useState("");
  const [checkingDiscount, setCheckingDiscount] = useState(false);

  const [orderSent, setOrderSent] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [orderError, setOrderError] = useState("");

  const selectedArea = deliveryAreas.find(
    (area) => area.code === selectedAreaCode
  );

  const deliveryFee = selectedArea?.fee ?? 0;
  const productsTotal = PRODUCT_PRICE * quantity;

  const hasFreeDelivery =
    appliedDiscountCode.length > 0;

  const deliveryDiscount = hasFreeDelivery
    ? deliveryFee
    : 0;

  const finalDeliveryFee = Math.max(
    deliveryFee - deliveryDiscount,
    0
  );

  const finalTotal =
    productsTotal + finalDeliveryFee;

  useEffect(() => {
    setAppliedDiscountCode("");
    setDiscountMessage("");

    if (discountCode) {
      setDiscountCode("");
    }
  }, [selectedAreaCode]);

  async function applyDiscountCode() {
    const cleanCode = discountCode
      .trim()
      .toUpperCase();

    if (!selectedArea) {
      setAppliedDiscountCode("");
      setDiscountMessage(
        "Please select your governorate first."
      );
      return;
    }

    if (!cleanCode) {
      setAppliedDiscountCode("");
      setDiscountMessage(
        "Please enter a discount code."
      );
      return;
    }

    setCheckingDiscount(true);
    setDiscountMessage("");

    try {
      const response = await fetch(
        "/api/discounts/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: cleanCode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setAppliedDiscountCode("");
        setDiscountMessage(
          result.message ||
            "Invalid discount code."
        );
        return;
      }

      if (
        result.discountType !== "free_delivery"
      ) {
        setAppliedDiscountCode("");
        setDiscountMessage(
          "This code cannot be used for delivery."
        );
        return;
      }

      setAppliedDiscountCode(result.code);
      setDiscountCode(result.code);
      setDiscountMessage(
        "Free delivery applied successfully."
      );
    } catch {
      setAppliedDiscountCode("");
      setDiscountMessage(
        "Could not check the discount code."
      );
    } finally {
      setCheckingDiscount(false);
    }
  }

  function removeDiscountCode() {
    setAppliedDiscountCode("");
    setDiscountCode("");
    setDiscountMessage(
      "Discount code removed."
    );
  }

  async function handleOrderSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setOrderError("");
    setOrderSent(false);

    if (!selectedArea) {
      setOrderError(
        "Please select your delivery area."
      );
      return;
    }

    if (!fullName.trim()) {
      setOrderError(
        "Please enter your full name."
      );
      return;
    }

    if (!phone.trim()) {
      setOrderError(
        "Please enter your phone number."
      );
      return;
    }

    if (!address.trim()) {
      setOrderError(
        "Please enter your full address."
      );
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        "/api/order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: fullName.trim(),
            phone: phone.trim(),
            governorate: selectedArea.name,
            address: address.trim(),
            notes: notes.trim(),
            colour: selectedColour.name,
            quantity,
            productPrice: PRODUCT_PRICE,
            deliveryFee: finalDeliveryFee,
            originalDeliveryFee: deliveryFee,
            discountCode:
              appliedDiscountCode || "",
            deliveryDiscount,
            totalPrice: finalTotal,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not place your order."
        );
      }

      setOrderNumber(
        result.orderNumber ||
          result.order?.order_number ||
          "Confirmed"
      );

      setOrderSent(true);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Could not place your order."
      );
    } finally {
      setIsSending(false);
    }
  }

  if (orderSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <section className="w-full max-w-xl rounded-[36px] border border-white/10 bg-white/5 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-black">
            ✓
          </div>

          <p className="mt-8 text-sm uppercase tracking-[0.35em] text-gray-500">
            Order confirmed
          </p>

          <h1 className="mt-4 text-4xl font-black sm:text-5xl">
            Thank you!
          </h1>

          <p className="mt-5 leading-7 text-gray-400">
            Your order has been received. We will
            contact you to confirm the details.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm text-gray-500">
              Order number
            </p>

            <p className="mt-2 text-2xl font-bold">
              {orderNumber}
            </p>
          </div>

          <Link
            href="/"
            className="mt-8 flex w-full justify-center rounded-full bg-white px-8 py-5 font-bold text-black"
          >
            Back to our products
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
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
            href="/products/google-fitbit-air"
            className="rounded-full border border-white/15 px-4 py-3 text-sm font-bold text-gray-300"
          >
            ← Product
          </Link>
        </div>
      </header>

      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Secure checkout
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              Complete your order
            </h1>

            <p className="mt-5 max-w-2xl leading-7 text-gray-400">
              Choose your colour and delivery area,
              then enter your contact information.
            </p>
          </div>

          <form
            onSubmit={handleOrderSubmit}
            className="grid items-start gap-10 lg:grid-cols-[1fr_0.85fr]"
          >
            <div className="space-y-8">
              {/* Product */}
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Your product
                </h2>

                <div className="mt-6 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="rounded-[24px] bg-white p-4">
                    <Image
                      key={selectedColour.name}
                      src={selectedColour.image}
                      alt={`Google Fitbit Air - ${selectedColour.name}`}
                      width={500}
                      height={500}
                      className="h-auto w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                      Fitness tracker
                    </p>

                    <h3 className="mt-3 text-3xl font-black">
                      Google Fitbit Air
                    </h3>

                    <p className="mt-3 text-gray-400">
                      {PRODUCT_PRICE.toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP each
                    </p>
                  </div>
                </div>
              </section>

              {/* Colours */}
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Choose your colour
                </h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/15 bg-black/20 text-white"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-full border border-black/20 ${colour.buttonStyle}`}
                        />

                        {colour.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Quantity */}
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Quantity
                </h2>

                <div className="mt-6 flex w-fit items-center rounded-full border border-white/15 bg-black/30 p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl"
                  >
                    −
                  </button>

                  <span className="min-w-16 text-center text-xl font-bold">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(10, current + 1)
                      )
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-black"
                  >
                    +
                  </button>
                </div>
              </section>

              {/* Customer information */}
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Contact information
                </h2>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Full name
                    </span>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(
                          event.target.value
                        )
                      }
                      placeholder="Enter your full name"
                      autoComplete="name"
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Phone number
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
                    />
                  </label>
                </div>
              </section>

              {/* Delivery */}
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Delivery information
                </h2>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Governorate / delivery area
                    </span>

                    <select
                      value={selectedAreaCode}
                      onChange={(event) =>
                        setSelectedAreaCode(
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-white outline-none focus:border-white"
                    >
                      <option value="">
                        Select your delivery area
                      </option>

                      {deliveryAreas.map((area) => (
                        <option
                          key={area.code}
                          value={area.code}
                        >
                          {area.name} — {area.fee} EGP
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Full address
                    </span>

                    <textarea
                      value={address}
                      onChange={(event) =>
                        setAddress(
                          event.target.value
                        )
                      }
                      placeholder="Area, street, building, floor and apartment"
                      rows={4}
                      autoComplete="street-address"
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Order notes — optional
                    </span>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      placeholder="Add any useful delivery notes"
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* Summary */}
            <aside className="rounded-[32px] border border-white/10 bg-[#111111] p-5 lg:sticky lg:top-6 sm:p-7">
              <h2 className="text-2xl font-black">
                Order summary
              </h2>

              <div className="mt-7 space-y-5">
                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Product
                  </span>

                  <strong className="text-right">
                    Google Fitbit Air
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Colour
                  </span>

                  <strong>
                    {selectedColour.name}
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Quantity
                  </span>

                  <strong>{quantity}</strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Products total
                  </span>

                  <strong>
                    {productsTotal.toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Delivery
                  </span>

                  <strong>
                    {!selectedArea
                      ? "Select area"
                      : finalDeliveryFee === 0
                        ? "FREE"
                        : `${finalDeliveryFee} EGP`}
                  </strong>
                </div>

                {deliveryDiscount > 0 && (
                  <div className="flex justify-between gap-5 text-green-400">
                    <span>
                      Delivery discount
                    </span>

                    <strong>
                      -{deliveryDiscount} EGP
                    </strong>
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                  Delivery discount code
                </p>

                <div className="mt-4 flex gap-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(event) => {
                      setDiscountCode(
                        event.target.value.toUpperCase()
                      );

                      setAppliedDiscountCode("");
                      setDiscountMessage("");
                    }}
                    placeholder="Enter code"
                    disabled={!selectedArea}
                    className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={
                      hasFreeDelivery
                        ? removeDiscountCode
                        : applyDiscountCode
                    }
                    disabled={
                      checkingDiscount ||
                      !selectedArea
                    }
                    className="rounded-2xl bg-white px-5 py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingDiscount
                      ? "Checking..."
                      : hasFreeDelivery
                        ? "Remove"
                        : "Apply"}
                  </button>
                </div>

                {!selectedArea && (
                  <p className="mt-3 text-sm text-gray-500">
                    Select your delivery area before
                    applying a code.
                  </p>
                )}

                {discountMessage && (
                  <p
                    className={`mt-3 text-sm ${
                      hasFreeDelivery
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {discountMessage}
                  </p>
                )}
              </div>

              <div className="my-8 h-px bg-white/10" />

              <div className="flex items-end justify-between gap-5">
                <span className="text-xl font-black">
                  Final total
                </span>

                <strong className="text-3xl">
                  {finalTotal.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </strong>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Cash on delivery. Your order will
                be confirmed by phone.
              </p>

              {orderError && (
                <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
                  {orderError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending
                  ? "Placing order..."
                  : `Place order — ${finalTotal.toLocaleString(
                      "en-GB"
                    )} EGP`}
              </button>
            </aside>
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. All rights reserved.
        </p>
      </footer>
    </main>
  );
}