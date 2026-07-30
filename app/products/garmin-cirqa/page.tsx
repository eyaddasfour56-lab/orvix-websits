"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_NAME = "Garmin CIRQA";
const PRODUCT_SLUG = "garmin-cirqa";

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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 10;
}

export default function GarminCirqaPage() {
  const [
    selectedColour,
    setSelectedColour,
  ] = useState(colours[0]);

  const [
    selectedSize,
    setSelectedSize,
  ] = useState(sizes[0]);

  const [
    showNotifyForm,
    setShowNotifyForm,
  ] = useState(false);

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [sending, setSending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  function openNotifyForm() {
    setShowNotifyForm(true);
    setMessage("");
    setSuccess(false);

    window.setTimeout(() => {
      document
        .getElementById(
          "garmin-notify-form"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

  function closeNotifyForm() {
    setShowNotifyForm(false);
    setMessage("");
    setSuccess(false);
  }

  async function handleNotifySubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (sending) {
      return;
    }

    setMessage("");
    setSuccess(false);

    if (!customerName.trim()) {
      setMessage(
        "Please enter your name."
      );

      return;
    }

    if (!email.trim() && !phone.trim()) {
      setMessage(
        "Please enter your email or phone number."
      );

      return;
    }

    if (
      email.trim() &&
      !isValidEmail(email)
    ) {
      setMessage(
        "Please enter a valid email address."
      );

      return;
    }

    if (
      phone.trim() &&
      !isValidPhone(phone)
    ) {
      setMessage(
        "Please enter a valid phone number."
      );

      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/waitlist",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productName: PRODUCT_NAME,
            productSlug: PRODUCT_SLUG,

            customerName:
              customerName.trim(),

            email: email
              .trim()
              .toLowerCase(),

            phone: phone.trim(),

            colour:
              selectedColour.name,

            size: selectedSize,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not join the notification list."
        );
      }

      setSuccess(true);

      setMessage(
        result.message ||
          "You are on the list. We will notify you when Garmin CIRQA becomes available."
      );

      setCustomerName("");
      setEmail("");
      setPhone("");
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not join the notification list."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      {/* Product Section */}
      <section className="py-14 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Product Image */}
          <div className="rounded-[40px] bg-white p-6 sm:sticky sm:top-28 sm:p-8">
            <Image
              key={selectedColour.name}
              src={selectedColour.image}
              alt={`${PRODUCT_NAME} - ${selectedColour.name}`}
              width={700}
              height={700}
              priority
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          {/* Product Details */}
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.25em] text-gray-300">
              Coming Soon
            </span>

            <p className="mt-7 text-sm uppercase tracking-[0.4em] text-gray-500">
              Screen-Free Smart Band
            </p>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              {PRODUCT_NAME}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              A screen-free smart band designed
              to track your health, sleep,
              recovery and daily activity
              through Garmin Connect.
            </p>

            {/* Colour */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name ===
                  colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => {
                      setSelectedColour(
                        colour
                      );

                      setMessage("");
                      setSuccess(false);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border ${
                        selected
                          ? "border-black/20"
                          : "border-white/20"
                      } ${colour.dot}`}
                    />

                    <span>{colour.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Size */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your size
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {sizes.map((size) => {
                const selected =
                  selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size);
                      setMessage("");
                      setSuccess(false);
                    }}
                    className={`rounded-2xl border p-4 text-center font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Selection */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                Selected option
              </p>

              <p className="mt-3 text-xl font-bold">
                {selectedColour.name} ·{" "}
                {selectedSize}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Price and official launch date
                will be announced soon.
              </p>
            </div>

            {/* Notify Button */}
            <button
              type="button"
              onClick={openNotifyForm}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 active:scale-[0.99]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M18 8C18 4.69 15.31 2 12 2C8.69 2 6 4.69 6 8V11.5C6 13.3 5.4 15.05 4.3 16.48L3 18H21L19.7 16.48C18.6 15.05 18 13.3 18 11.5V8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M10 21H14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              Notify Me When Available
            </button>

            <p className="mt-4 text-center text-sm leading-6 text-gray-500">
              Join the list and we will contact
              you by email or phone when Garmin
              CIRQA becomes available.
            </p>

            {/* Notify Form */}
            {showNotifyForm && (
              <form
                id="garmin-notify-form"
                onSubmit={handleNotifySubmit}
                className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                      Launch Notification
                    </p>

                    <h2 className="mt-3 text-2xl font-black">
                      Join the Garmin CIRQA List
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                      Enter your email or phone
                      number and we will contact
                      you when the product
                      launches.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeNotifyForm}
                    aria-label="Close notification form"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-2xl transition hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    Your selection
                  </p>

                  <p className="mt-2 font-black">
                    {selectedColour.name} ·{" "}
                    {selectedSize}
                  </p>
                </div>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Name
                    </span>

                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => {
                        setCustomerName(
                          event.target.value
                        );

                        setMessage("");
                        setSuccess(false);
                      }}
                      placeholder="Enter your name"
                      autoComplete="name"
                      disabled={sending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Email address
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value
                        );

                        setMessage("");
                        setSuccess(false);
                      }}
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={sending}
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />

                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
                      Or
                    </span>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Phone number
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(
                          event.target.value
                        );

                        setMessage("");
                        setSuccess(false);
                      }}
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={sending}
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>
                </div>

                <p className="mt-4 text-xs leading-6 text-gray-500">
                  Enter at least one contact
                  method: email or phone number.
                </p>

                {message && (
                  <p
                    role="alert"
                    className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                      success
                        ? "border-green-500/20 bg-green-500/10 text-green-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {message}
                  </p>
                )}

                {!success ? (
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !customerName.trim() ||
                      (!email.trim() &&
                        !phone.trim())
                    }
                    className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-7 py-5 font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending
                      ? "Joining List..."
                      : "Notify Me at Launch"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeNotifyForm}
                    className="mt-6 flex w-full items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
                  >
                    Done
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-[#0b0b0b] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              {PRODUCT_NAME}
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              Features at a glance
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              The most important health, sleep
              and fitness features, organised
              into simple cards.
            </p>
          </div>

          <div className="mt-16 space-y-16">
            {featureGroups.map(
              (group) => (
                <section key={group.title}>
                  <div className="flex items-center gap-5">
                    <h3 className="shrink-0 text-2xl font-black uppercase tracking-[0.15em] sm:text-3xl">
                      {group.title}
                    </h3>

                    <div className="h-px flex-1 bg-white/15" />
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {group.features.map(
                      (feature) => (
                        <article
                          key={
                            feature.title
                          }
                          className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
                        >
                          <h4 className="font-bold leading-6 text-white sm:text-lg">
                            {feature.title}
                          </h4>

                          <p className="mt-3 text-sm leading-6 text-gray-400">
                            {
                              feature.description
                            }
                          </p>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>

          <p className="mx-auto mt-16 max-w-3xl text-center text-xs leading-6 text-gray-600">
            Feature availability may depend on
            your country, compatible device,
            Garmin Connect version or a Garmin
            Connect+ subscription.
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
    </main>
  );
}