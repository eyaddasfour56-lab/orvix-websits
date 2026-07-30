"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Review = {
  id: string;
  order_id: string;
  order_number: string;
  product_name: string;
  product_slug: string;
  customer_name: string;
  rating: number;
  review_text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
};

type Statistics = {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  averageRating: number;
};

const filters = [
  {
    value: "all",
    label: "All Reviews",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

function getStatusClasses(status: Review["status"]) {
  if (status === "approved") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "rejected") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
}

function formatStatus(status: Review["status"]) {
  return status.replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function renderStars(rating: number) {
  return Array.from(
    {
      length: 5,
    },
    (_, index) => (
      <span
        key={index}
        className={
          index < rating
            ? "text-yellow-300"
            : "text-gray-700"
        }
      >
        ★
      </span>
    )
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<
    Review[]
  >([]);

  const [statistics, setStatistics] =
    useState<Statistics>({
      totalReviews: 0,
      pendingReviews: 0,
      approvedReviews: 0,
      averageRating: 0,
    });

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [
    updatingReviewId,
    setUpdatingReviewId,
  ] = useState<string | null>(null);

  const [
    deletingReviewId,
    setDeletingReviewId,
  ] = useState<string | null>(null);

  async function loadReviews() {
    setLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/admin/reviews",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        throw new Error(
          "Your admin session has expired. Return to the dashboard and sign in again."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not load reviews."
        );
      }

      setReviews(result.reviews || []);

      setStatistics(
        result.statistics || {
          totalReviews: 0,
          pendingReviews: 0,
          approvedReviews: 0,
          averageRating: 0,
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function updateReviewStatus(
    reviewId: string,
    status: Review["status"]
  ) {
    setUpdatingReviewId(reviewId);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/reviews/${encodeURIComponent(
          reviewId
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not update review."
        );
      }

      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === reviewId
            ? result.review
            : review
        )
      );

      setSuccessMessage(
        `Review ${
          status === "approved"
            ? "approved"
            : status === "rejected"
              ? "rejected"
              : "moved to pending"
        } successfully.`
      );

      await loadReviews();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update review."
      );
    } finally {
      setUpdatingReviewId(null);
    }
  }

  async function deleteReview(
    reviewId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review permanently?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingReviewId(reviewId);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/reviews/${encodeURIComponent(
          reviewId
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not delete review."
        );
      }

      setReviews((currentReviews) =>
        currentReviews.filter(
          (review) =>
            review.id !== reviewId
        )
      );

      setSuccessMessage(
        "Review deleted successfully."
      );

      await loadReviews();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete review."
      );
    } finally {
      setDeletingReviewId(null);
    }
  }

  const filteredReviews = useMemo(() => {
    if (filter === "all") {
      return reviews;
    }

    return reviews.filter(
      (review) => review.status === filter
    );
  }, [reviews, filter]);

  const rejectedReviews = useMemo(
    () =>
      reviews.filter(
        (review) =>
          review.status === "rejected"
      ).length,
    [reviews]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading reviews...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Customer Reviews
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              Approve customer reviews before they
              appear publicly on the product page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-2xl border border-white/15 px-6 py-4 text-center font-black transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={loadReviews}
              className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200"
            >
              Refresh Reviews
            </button>
          </div>
        </header>

        {message && (
          <p className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 leading-6 text-red-300">
            {message}
          </p>
        )}

        {successMessage && (
          <p className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 leading-6 text-green-300">
            {successMessage}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total Reviews
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.totalReviews}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Pending
            </p>

            <p className="mt-3 text-4xl font-black text-yellow-300">
              {statistics.pendingReviews}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Approved
            </p>

            <p className="mt-3 text-4xl font-black text-green-300">
              {statistics.approvedReviews}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Rejected
            </p>

            <p className="mt-3 text-4xl font-black text-red-300">
              {rejectedReviews}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Average Rating
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.averageRating.toFixed(
                1
              )}
            </p>

            <p className="mt-2 text-yellow-300">
              ★★★★★
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black">
              Manage Reviews
            </h2>

            <div className="flex flex-wrap gap-2">
              {filters.map((filterItem) => (
                <button
                  key={filterItem.value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      filterItem.value
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    filter ===
                    filterItem.value
                      ? "border-white bg-white text-black"
                      : "border-white/15 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="text-xl font-black">
                No reviews found
              </p>

              <p className="mt-3 text-gray-400">
                There are no reviews matching this
                filter yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {filteredReviews.map(
                (review) => {
                  const isUpdating =
                    updatingReviewId ===
                    review.id;

                  const isDeleting =
                    deletingReviewId ===
                    review.id;

                  return (
                    <article
                      key={review.id}
                      className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-2xl font-black">
                              {review.customer_name}
                            </h3>

                            <span
                              className={`rounded-full border px-4 py-2 text-xs font-black ${getStatusClasses(
                                review.status
                              )}`}
                            >
                              {formatStatus(
                                review.status
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-500">
                            Order:{" "}
                            {review.order_number}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Product:{" "}
                            {review.product_name}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3">
                          <div className="flex text-2xl">
                            {renderStars(
                              review.rating
                            )}
                          </div>

                          <p className="mt-1 text-center text-xs font-bold text-yellow-200">
                            {review.rating}/5
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-5">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                          Customer Review
                        </p>

                        <p className="mt-4 whitespace-pre-wrap break-words leading-8 text-gray-200">
                          {review.review_text}
                        </p>
                      </div>

                      <p className="mt-4 text-xs text-gray-500">
                        Submitted on{" "}
                        {new Date(
                          review.created_at
                        ).toLocaleString(
                          "en-GB"
                        )}
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                          type="button"
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "approved"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            review.status ===
                              "approved"
                          }
                          className="rounded-2xl bg-green-500 px-5 py-4 font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "rejected"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            review.status ===
                              "rejected"
                          }
                          className="rounded-2xl bg-red-500 px-5 py-4 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Reject"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateReviewStatus(
                              review.id,
                              "pending"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            review.status ===
                              "pending"
                          }
                          className="rounded-2xl border border-white/15 px-5 py-4 font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Set Pending
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteReview(
                              review.id
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting
                          }
                          className="rounded-2xl border border-red-500/30 px-5 py-4 font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}