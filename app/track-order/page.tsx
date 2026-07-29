"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  governorate: string;
  colour: string;
  quantity: number;
  productsTotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
};

const orderSteps = [
  {
    status: "new",
    title: "Order received",
    description:
      "Your order has been received by ORVIX.",
  },
  {
    status: "confirmed",
    title: "Order confirmed",
    description:
      "Your order details have been confirmed.",
  },
  {
    status: "shipped",
    title: "Shipped",
    description:
      "Your order is on its way to you.",
  },
  {
    status: "delivered",
    title: "Delivered",
    description:
      "Your order has been delivered.",
  },
];

function getStatusIndex(status: string) {
  const index = orderSteps.findIndex(
    (step) => step.status === status
  );

  return index >= 0 ? index : 0;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] =
    useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] =
    useState<TrackedOrder | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setOrder(null);

    try {
      const response = await fetch(
        "/api/track-order",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderNumber: orderNumber
              .trim()
              .toUpperCase(),
            phone: phone.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not find your order."
        );
      }

      setOrder(result.order);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not find your order."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeStatusIndex = order
    ? getStatusIndex(order.status)
    : 0;

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
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
            href="/"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-gray-300"
          >
            Back to products
          </Link>
        </div>
      </header>

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              ORVIX order tracking
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              Track your order
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              Enter the order number and phone
              number used during checkout.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8"
          >
            <div className="grid gap-5">
              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  Order number
                </span>

                <input
                  type="text"
                  value={orderNumber}
                  onChange={(event) =>
                    setOrderNumber(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="ORVIX-..."
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 uppercase text-white outline-none placeholder:text-gray-600 focus:border-white"
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
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
                />
              </label>
            </div>

            {message && (
              <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !orderNumber.trim() ||
                !phone.trim()
              }
              className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Checking order..."
                : "Track order"}
            </button>
          </form>

          {order && (
            <section className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                    Order
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {order.orderNumber}
                  </h2>

                  <p className="mt-2 text-gray-400">
                    Hello, {order.customerName}
                  </p>
                </div>

                <div className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black capitalize text-black">
                  {order.status}
                </div>
              </div>

              {order.status === "cancelled" ? (
                <div className="mt-7 rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
                  <p className="font-bold text-red-300">
                    This order has been cancelled.
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  {orderSteps.map(
                    (step, index) => {
                      const completed =
                        index <= activeStatusIndex;

                      return (
                        <div
                          key={step.status}
                          className="flex gap-4"
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-black ${
                              completed
                                ? "border-white bg-white text-black"
                                : "border-white/15 bg-black text-gray-600"
                            }`}
                          >
                            {completed
                              ? "✓"
                              : index + 1}
                          </div>

                          <div>
                            <h3
                              className={`font-bold ${
                                completed
                                  ? "text-white"
                                  : "text-gray-600"
                              }`}
                            >
                              {step.title}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-gray-500">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              <div className="mt-8 grid gap-4 border-t border-white/10 pt-7 sm:grid-cols-2">
                <div className="rounded-2xl bg-black/40 p-5">
                  <p className="text-sm text-gray-500">
                    Product
                  </p>

                  <p className="mt-2 font-bold">
                    Google Fitbit Air
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {order.colour} ×{" "}
                    {order.quantity}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/40 p-5">
                  <p className="text-sm text-gray-500">
                    Delivery area
                  </p>

                  <p className="mt-2 font-bold">
                    {order.governorate}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-black/40 p-5">
                <div className="flex justify-between gap-5 text-gray-400">
                  <span>Products total</span>

                  <span>
                    {order.productsTotal.toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </span>
                </div>

                <div className="mt-3 flex justify-between gap-5 text-gray-400">
                  <span>Delivery</span>

                  <span>
                    {order.deliveryFee === 0
                      ? "FREE"
                      : `${order.deliveryFee.toLocaleString(
                          "en-GB"
                        )} EGP`}
                  </span>
                </div>

                {order.discountAmount > 0 && (
                  <div className="mt-3 flex justify-between gap-5 text-green-400">
                    <span>Discount</span>

                    <span>
                      -
                      {order.discountAmount.toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP
                    </span>
                  </div>
                )}

                <div className="mt-5 flex items-end justify-between gap-5 border-t border-white/10 pt-5">
                  <strong>Total</strong>

                  <strong className="text-2xl">
                    {order.totalPrice.toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </strong>
                </div>
              </div>

              <p className="mt-5 text-center text-sm text-gray-600">
                Order placed on{" "}
                {new Date(
                  order.createdAt
                ).toLocaleString("en-GB")}
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}