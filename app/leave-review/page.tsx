"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function LeaveReviewPage() {
  const [orderNumber, setOrderNumber] =
    useState("");

  const [phone, setPhone] = useState("");

  const [rating, setRating] = useState(0);

  const [hoveredRating, setHoveredRating] =
    useState(0);

  const [reviewText, setReviewText] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );

    const orderNumberFromUrl =
      searchParams.get("orderNumber");

    const savedPhone =
      sessionStorage.getItem(
        "orvixLastOrderPhone"
      );

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
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setSuccess(false);

    if (!orderNumber.trim()) {
      setMessage(
        "Please enter your order number."
      );

      return;
    }

    if (!phone.trim()) {
      setMessage(
        "Please enter your phone number."
      );

      return;
    }

    if (rating < 1 || rating > 5) {
      setMessage(
        "Please select a rating from 1 to 5 stars."
      );

      return;
    }

    if (reviewText.trim().length < 5) {
      setMessage(
        "Please write at least 5 characters."
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/reviews/submit",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderNumber:
              orderNumber
                .trim()
                .toUpperCase(),

            phone: phone.trim(),
            rating,
            reviewText:
              reviewText.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not submit your review."
        );
      }

      setSuccess(true);

      setMessage(
        result.message ||
          "Thank you! Your review was submitted successfully."
      );

      setRating(0);
      setHoveredRating(0);
      setReviewText("");
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit your review."
      );
    } finally {
      setLoading(false);
    }
  }

  const displayedRating =
    hoveredRating || rating;

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              ORVIX Reviews
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              Share Your Experience
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              Your feedback helps us improve and
              helps other customers shop with
              confidence.
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
                    setSuccess(false);
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
                    setPhone(
                      event.target.value
                    );

                    setMessage("");
                    setSuccess(false);
                  }}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>
            </div>

            <div className="mt-7">
              <p className="text-sm font-bold text-gray-300">
                Your Rating
              </p>

              <div
                className="mt-4 flex flex-wrap gap-2"
                onMouseLeave={() =>
                  setHoveredRating(0)
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (star) => {
                    const active =
                      star <=
                      displayedRating;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setMessage("");
                          setSuccess(false);
                        }}
                        onMouseEnter={() =>
                          setHoveredRating(
                            star
                          )
                        }
                        disabled={loading}
                        aria-label={`${star} star rating`}
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl transition disabled:opacity-50 ${
                          active
                            ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                            : "border-white/10 bg-black/40 text-gray-600 hover:border-white/30 hover:text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-3 text-sm text-gray-500">
                {rating === 0
                  ? "Select from 1 to 5 stars."
                  : `${rating} out of 5 stars selected.`}
              </p>
            </div>

            <label className="mt-7 block">
              <span className="mb-2 block text-sm font-bold text-gray-300">
                Your Review
              </span>

              <textarea
                value={reviewText}
                onChange={(event) => {
                  setReviewText(
                    event.target.value
                  );

                  setMessage("");
                  setSuccess(false);
                }}
                placeholder="Tell us what you liked about your ORVIX experience..."
                rows={6}
                maxLength={1000}
                disabled={loading}
                className="w-full resize-none rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
              />

              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-gray-500">
                <span>
                  Minimum 5 characters
                </span>

                <span>
                  {reviewText.length}/1000
                </span>
              </div>
            </label>

            {message && (
              <p
                role="alert"
                className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
                  success
                    ? "border-green-500/20 bg-green-500/10 text-green-300"
                    : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !orderNumber.trim() ||
                !phone.trim() ||
                rating === 0 ||
                reviewText.trim().length < 5
              }
              className="mt-7 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting Review..."
                : "Submit Review"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-gray-500">
              Reviews can only be submitted for
              delivered orders. Reviews are checked
              before appearing publicly.
            </p>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/track-order"
              className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-center font-bold transition hover:bg-white/10"
            >
              Track Your Order
            </Link>

            <Link
              href="/products/google-fitbit-air"
              className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-center font-bold transition hover:bg-white/10"
            >
              Back to Product
            </Link>
          </div>
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