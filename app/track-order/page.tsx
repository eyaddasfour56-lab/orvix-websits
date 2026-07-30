"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  governorate: string;
  productName?: string;
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
    title: "Order Placed",
    description:
      "Your order has been received successfully by ORVIX.",
  },
  {
    status: "confirmed",
    title: "Order Confirmed",
    description:
      "Your order details have been reviewed and confirmed.",
  },
  {
    status: "shipped",
    title: "Shipped",
    description:
      "Your order has left our facility and is on its way.",
  },
  {
    status: "out_for_delivery",
    title: "Out for Delivery",
    description:
      "The courier is delivering your order to your address.",
  },
  {
    status: "delivered",
    title: "Delivered",
    description:
      "Your order has been delivered successfully.",
  },
];

function normaliseStatus(status: string) {
  const cleanStatus = status
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  if (cleanStatus === "pending") {
    return "new";
  }

  if (
    cleanStatus === "outfordelivery" ||
    cleanStatus === "out_for_delivery"
  ) {
    return "out_for_delivery";
  }

  return cleanStatus;
}

function getStatusIndex(status: string) {
  const normalisedStatus =
    normaliseStatus(status);

  const index = orderSteps.findIndex(
    (step) =>
      step.status === normalisedStatus
  );

  return index >= 0 ? index : 0;
}

function formatStatus(status: string) {
  return normaliseStatus(status)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString(
    "en-GB"
  )} EGP`;
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

  const [detailsLoaded, setDetailsLoaded] =
    useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );

    const orderNumberFromUrl =
      searchParams.get("orderNumber") || "";

    const savedPhone =
      sessionStorage.getItem(
        "orvixLastOrderPhone"
      ) || "";

    if (orderNumberFromUrl) {
      setOrderNumber(
        orderNumberFromUrl
          .trim()
          .toUpperCase()
      );
    }

    if (savedPhone) {
      setPhone(savedPhone);
    }

    setDetailsLoaded(true);
  }, []);

  async function trackOrder(
    submittedOrderNumber: string,
    submittedPhone: string
  ) {
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
            orderNumber:
              submittedOrderNumber
                .trim()
                .toUpperCase(),

            phone: submittedPhone.trim(),
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

      sessionStorage.setItem(
        "orvixLastOrderPhone",
        submittedPhone.trim()
      );

      window.history.replaceState(
        {},
        "",
        `/track-order?orderNumber=${encodeURIComponent(
          submittedOrderNumber
            .trim()
            .toUpperCase()
        )}`
      );
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !orderNumber.trim() ||
      !phone.trim()
    ) {
      setMessage(
        "Please enter your order number and phone number."
      );

      return;
    }

    await trackOrder(orderNumber, phone);
  }

  function resetTracking() {
    setOrder(null);
    setMessage("");
    setOrderNumber("");
    setPhone("");

    sessionStorage.removeItem(
      "orvixLastOrderPhone"
    );

    window.history.replaceState(
      {},
      "",
      "/track-order"
    );
  }

  const normalisedOrderStatus = order
    ? normaliseStatus(order.status)
    : "new";

  const activeStatusIndex = order
    ? getStatusIndex(order.status)
    : 0;

  const isCancelled =
    normalisedOrderStatus === "cancelled";

  const contactMessage = order
    ? encodeURIComponent(
        `Hello ORVIX, I need help with my order ${order.orderNumber}.`
      )
    : "";

  if (!detailsLoaded) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-5 text-gray-400">
              Loading tracking details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              ORVIX Order Tracking
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              Track Your Order
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              Enter the order number and phone
              number used during checkout to view
              the latest status of your order.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  Order Number
                </span>

                <input
                  type="text"
                  value={orderNumber}
                  onChange={(event) => {
                    setOrderNumber(
                      event.target.value.toUpperCase()
                    );

                    setMessage("");
                    setOrder(null);
                  }}
                  placeholder="ORVIX-..."
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 uppercase text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  Phone Number
                </span>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);

                    setMessage("");
                    setOrder(null);
                  }}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>
            </div>

            {message && (
              <p
                role="alert"
                className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
              >
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
              className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Checking Order..."
                : "Track Your Order"}
            </button>
          </form>

          {order && (
            <section className="mt-8 overflow-hidden rounded-[36px] border border-white/10 bg-white/5">
              {/* Order heading */}
              <div className="p-5 sm:p-8">
                <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                      Order Number
                    </p>

                    <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
                      {order.orderNumber}
                    </h2>

                    <p className="mt-3 text-gray-400">
                      Hello, {order.customerName}
                    </p>
                  </div>

                  <div
                    className={`w-fit rounded-full border px-5 py-3 text-sm font-black ${
                      isCancelled
                        ? "border-red-500/20 bg-red-500/10 text-red-300"
                        : normalisedOrderStatus ===
                            "delivered"
                          ? "border-green-500/20 bg-green-500/10 text-green-300"
                          : "border-white bg-white text-black"
                    }`}
                  >
                    {formatStatus(order.status)}
                  </div>
                </div>

                {/* Cancelled status */}
                {isCancelled ? (
                  <div className="mt-8 rounded-[28px] border border-red-500/20 bg-red-500/10 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-400 font-black text-black">
                        ×
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-red-200">
                          Order Cancelled
                        </h3>

                        <p className="mt-2 leading-7 text-red-200/70">
                          This order has been
                          cancelled. Contact ORVIX
                          support if you believe
                          this was a mistake.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Professional timeline */
                  <div className="mt-9">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                      Order Progress
                    </p>

                    <div className="mt-8">
                      {orderSteps.map(
                        (step, index) => {
                          const completed =
                            index <
                            activeStatusIndex;

                          const current =
                            index ===
                            activeStatusIndex;

                          const reached =
                            index <=
                            activeStatusIndex;

                          const isLast =
                            index ===
                            orderSteps.length - 1;

                          return (
                            <div
                              key={step.status}
                              className="relative flex gap-5"
                            >
                              {!isLast && (
                                <div
                                  className={`absolute left-[23px] top-12 h-[calc(100%-4px)] w-px ${
                                    index <
                                    activeStatusIndex
                                      ? "bg-white"
                                      : "bg-white/10"
                                  }`}
                                />
                              )}

                              <div
                                className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-black transition ${
                                  completed
                                    ? "border-white bg-white text-black"
                                    : current
                                      ? "border-white bg-black text-white shadow-[0_0_0_6px_rgba(255,255,255,0.08)]"
                                      : "border-white/15 bg-[#070707] text-gray-600"
                                }`}
                              >
                                {completed
                                  ? "✓"
                                  : index + 1}
                              </div>

                              <div
                                className={`min-w-0 flex-1 ${
                                  isLast
                                    ? "pb-0"
                                    : "pb-9"
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3
                                    className={`text-lg font-black ${
                                      reached
                                        ? "text-white"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {step.title}
                                  </h3>

                                  {current && (
                                    <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                                      Current Status
                                    </span>
                                  )}

                                  {completed && (
                                    <span className="text-xs font-bold text-gray-500">
                                      Completed
                                    </span>
                                  )}
                                </div>

                                <p
                                  className={`mt-2 text-sm leading-6 ${
                                    reached
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Order details */}
                <div className="mt-9 border-t border-white/10 pt-8">
                  <h3 className="text-xl font-black">
                    Order Details
                  </h3>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <p className="text-sm text-gray-500">
                        Product
                      </p>

                      <p className="mt-2 font-black">
                        {order.productName ||
                          "Google Fitbit Air"}
                      </p>

                      <p className="mt-2 text-sm text-gray-400">
                        {order.colour} ×{" "}
                        {order.quantity}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <p className="text-sm text-gray-500">
                        Delivery Area
                      </p>

                      <p className="mt-2 font-black">
                        {order.governorate}
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        InstaPay on Delivery
                      </p>
                    </div>
                  </div>
                </div>

                {/* Price summary */}
                <div className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6">
                  <div className="flex justify-between gap-5 text-gray-400">
                    <span>Products Total</span>

                    <span>
                      {formatMoney(
                        order.productsTotal
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between gap-5 text-gray-400">
                    <span>Delivery</span>

                    <span>
                      {order.deliveryFee === 0
                        ? "FREE"
                        : formatMoney(
                            order.deliveryFee
                          )}
                    </span>
                  </div>

                  {order.discountAmount > 0 && (
                    <div className="mt-4 flex justify-between gap-5 text-green-400">
                      <span>Discount</span>

                      <span>
                        -
                        {formatMoney(
                          order.discountAmount
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex items-end justify-between gap-5 border-t border-white/10 pt-6">
                    <strong className="text-lg">
                      Total
                    </strong>

                    <strong className="text-2xl sm:text-3xl">
                      {formatMoney(
                        order.totalPrice
                      )}
                    </strong>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Order placed on{" "}
                  {new Date(
                    order.createdAt
                  ).toLocaleString("en-GB")}
                </p>

                {/* Support actions */}
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <a
                    href={`https://www.instagram.com/orvix_tech/?text=${contactMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
                  >
                    Contact ORVIX
                  </a>

                  <button
                    type="button"
                    onClick={resetTracking}
                    className="flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black text-white transition hover:bg-white/10"
                  >
                    Track Another Order
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. All rights reserved.
        </p>
      </footer>
    </main>
  );
}