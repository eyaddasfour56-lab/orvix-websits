"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_PRICE = 7900;

const INSTAPAY_LOGO =
  "data:image/jpeg;base64,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";

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
    name:
      "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
    fee: 140,
  },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  const [selectedColour, setSelectedColour] =
    useState(colours[0]);

  const [selectedAreaCode, setSelectedAreaCode] =
    useState("");

  const [quantity, setQuantity] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [discountCode, setDiscountCode] =
    useState("");

  const [
    appliedDiscountCode,
    setAppliedDiscountCode,
  ] = useState("");

  const [discountMessage, setDiscountMessage] =
    useState("");

  const [
    checkingDiscount,
    setCheckingDiscount,
  ] = useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const selectedArea = deliveryAreas.find(
    (area) => area.code === selectedAreaCode
  );

  const deliveryFee = selectedArea?.fee ?? 0;

  const productsTotal =
    PRODUCT_PRICE * quantity;

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

    if (isSending) {
      return;
    }

    setOrderError("");

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

    if (!customerEmail.trim()) {
      setOrderError(
        "Please enter your email address."
      );

      return;
    }

    if (!isValidEmail(customerEmail)) {
      setOrderError(
        "Please enter a valid email address."
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

            customerEmail: customerEmail
              .trim()
              .toLowerCase(),

            governorate: selectedArea.name,
            address: address.trim(),
            notes: notes.trim(),

            productName:
              "Google Fitbit Air",

            productSlug:
              "google-fitbit-air",

            colour: selectedColour.name,
            quantity,

            productPrice: PRODUCT_PRICE,

            deliveryFee:
              finalDeliveryFee,

            originalDeliveryFee:
              deliveryFee,

            discountCode:
              appliedDiscountCode || "",

            deliveryDiscount,
            totalPrice: finalTotal,

            paymentMethod:
              "instapay_on_delivery",
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

      const createdOrderNumber =
        result.orderNumber ||
        result.order?.order_number;

      if (!createdOrderNumber) {
        throw new Error(
          "Your order was saved, but the order number was not returned."
        );
      }

      sessionStorage.setItem(
        "orvixLastOrderPhone",
        phone.trim()
      );

      sessionStorage.setItem(
        "orvixLastOrderEmail",
        customerEmail.trim().toLowerCase()
      );

      router.push(
        `/order-success/${encodeURIComponent(
          createdOrderNumber
        )}`
      );
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Could not place your order."
      );

      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

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
              Choose your colour and delivery
              area, then enter your contact
              information. Payment is completed
              through InstaPay when your order
              arrives.
            </p>
          </div>

          <form
            onSubmit={handleOrderSubmit}
            className="grid items-start gap-10 lg:grid-cols-[1fr_0.85fr]"
          >
            <div className="space-y-8">
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
                        disabled={isSending}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition disabled:opacity-50 ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/15 bg-black/20 text-white hover:border-white/30"
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
                    disabled={isSending}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl disabled:opacity-50"
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
                    disabled={isSending}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-black disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </section>

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
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
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
                      inputMode="tel"
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Email address
                    </span>

                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) =>
                        setCustomerEmail(
                          event.target.value
                        )
                      }
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      We will send your order number
                      and tracking details to this
                      email.
                    </p>
                  </label>
                </div>
              </section>

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
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-white outline-none focus:border-white disabled:opacity-50"
                    >
                      <option value="">
                        Select your delivery area
                      </option>

                      {deliveryAreas.map(
                        (area) => (
                          <option
                            key={area.code}
                            value={area.code}
                          >
                            {area.name} —{" "}
                            {area.fee} EGP
                          </option>
                        )
                      )}
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
                      disabled={isSending}
                      required
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Order notes — optional
                    </span>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value
                        )
                      }
                      placeholder="Add any useful delivery notes"
                      rows={3}
                      disabled={isSending}
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>
                </div>
              </section>
            </div>

            <aside className="rounded-[32px] border border-white/10 bg-[#111111] p-5 sm:p-7 lg:sticky lg:top-28">
              <h2 className="text-2xl font-black">
                Order summary
              </h2>

              <div className="mt-7 space-y-5">
                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Product
                  </span>

                  <strong>
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
                    disabled={
                      !selectedArea ||
                      isSending
                    }
                    className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
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
                      !selectedArea ||
                      isSending
                    }
                    className="rounded-2xl bg-white px-5 py-4 font-bold text-black disabled:opacity-50"
                  >
                    {checkingDiscount
                      ? "Checking..."
                      : hasFreeDelivery
                        ? "Remove"
                        : "Apply"}
                  </button>
                </div>

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

              <div className="mt-7 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white">
                    <img
                      src={INSTAPAY_LOGO}
                      alt="InstaPay"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <p className="font-black">
                      InstaPay on Delivery
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Pay through InstaPay only
                      when your order arrives. No
                      advance payment is required.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs leading-5 text-gray-500">
                    The official InstaPay payment
                    details will be provided when
                    confirming or delivering your
                    order. Never transfer money to
                    an unverified account.
                  </p>
                </div>
              </div>

              {orderError && (
                <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {orderError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black disabled:opacity-50"
              >
                {isSending
                  ? "Placing order..."
                  : `Place order — ${finalTotal.toLocaleString(
                      "en-GB"
                    )} EGP`}
              </button>

              {isSending && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Please do not close or refresh
                  this page.
                </p>
              )}
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