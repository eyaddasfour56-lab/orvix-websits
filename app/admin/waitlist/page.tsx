"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type WaitlistStatus =
  | "waiting"
  | "notified"
  | "cancelled";

type WaitlistEntry = {
  id: string;
  product_name: string;
  product_slug: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  colour: string | null;
  size: string | null;
  status: WaitlistStatus;
  created_at: string;
  notified_at: string | null;
};

type WaitlistStatistics = {
  total: number;
  waiting: number;
  notified: number;
};

const filterOptions = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "waiting",
    label: "Waiting",
  },
  {
    value: "notified",
    label: "Notified",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

function formatStatus(
  status: WaitlistStatus
) {
  return status.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase()
  );
}

function getStatusClasses(
  status: WaitlistStatus
) {
  if (status === "notified") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
}

function formatWhatsAppNumber(
  phone: string
) {
  let digits = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (digits.startsWith("0020")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("20")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  return `20${digits}`;
}

function createWhatsAppLink(
  entry: WaitlistEntry
) {
  if (!entry.phone) {
    return "#";
  }

  const phoneNumber =
    formatWhatsAppNumber(entry.phone);

  const message = `Hello ${entry.customer_name} 👋

Garmin CIRQA is now available at ORVIX.

Your selected option:
Colour: ${entry.colour || "Not selected"}
Size: ${entry.size || "Not selected"}

Reply to this message if you would like to place your order.

Thank you,
ORVIX`;

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;
}

function createEmailLink(
  entry: WaitlistEntry
) {
  if (!entry.email) {
    return "#";
  }

  const subject =
    "Garmin CIRQA is now available";

  const body = `Hello ${entry.customer_name},

Garmin CIRQA is now available at ORVIX.

Your selected option:
Colour: ${entry.colour || "Not selected"}
Size: ${entry.size || "Not selected"}

Reply to this email if you would like to place your order.

Thank you,
ORVIX`;

  return `mailto:${entry.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export default function AdminWaitlistPage() {
  const [entries, setEntries] = useState<
    WaitlistEntry[]
  >([]);

  const [statistics, setStatistics] =
    useState<WaitlistStatistics>({
      total: 0,
      waiting: 0,
      notified: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [
    updatingEntryId,
    setUpdatingEntryId,
  ] = useState<string | null>(null);

  const [
    deletingEntryId,
    setDeletingEntryId,
  ] = useState<string | null>(null);

  async function loadWaitlist() {
    setLoading(true);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/admin/waitlist",
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

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load waitlist."
        );
      }

      setEntries(
        Array.isArray(result.entries)
          ? result.entries
          : []
      );

      setStatistics(
        result.statistics || {
          total: 0,
          waiting: 0,
          notified: 0,
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load waitlist."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWaitlist();
  }, []);

  async function updateEntryStatus(
    entryId: string,
    status: WaitlistStatus
  ) {
    setUpdatingEntryId(entryId);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/waitlist/${encodeURIComponent(
          entryId
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

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not update waitlist entry."
        );
      }

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === entryId
            ? result.entry
            : entry
        )
      );

      setSuccessMessage(
        status === "notified"
          ? "Customer marked as notified successfully."
          : status === "waiting"
            ? "Customer moved back to waiting."
            : "Waitlist request cancelled successfully."
      );

      await loadWaitlist();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update waitlist entry."
      );
    } finally {
      setUpdatingEntryId(null);
    }
  }

  async function deleteEntry(
    entryId: string
  ) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this waitlist entry permanently?"
    );

    if (!confirmed) {
      return;
    }

    setDeletingEntryId(entryId);
    setMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/admin/waitlist/${encodeURIComponent(
          entryId
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not delete waitlist entry."
        );
      }

      setEntries((currentEntries) =>
        currentEntries.filter(
          (entry) => entry.id !== entryId
        )
      );

      setSuccessMessage(
        "Waitlist entry deleted successfully."
      );

      await loadWaitlist();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete waitlist entry."
      );
    } finally {
      setDeletingEntryId(null);
    }
  }

  const filteredEntries = useMemo(() => {
    if (filter === "all") {
      return entries;
    }

    return entries.filter(
      (entry) => entry.status === filter
    );
  }, [entries, filter]);

  const cancelledCount = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.status === "cancelled"
      ).length,
    [entries]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading Garmin waitlist...
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
              Garmin Waitlist
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              View and manage customers who asked
              to be notified when Garmin CIRQA
              becomes available.
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
              onClick={loadWaitlist}
              className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200"
            >
              Refresh Waitlist
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Waiting
            </p>

            <p className="mt-3 text-4xl font-black text-yellow-300">
              {statistics.waiting}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Notified
            </p>

            <p className="mt-3 text-4xl font-black text-green-300">
              {statistics.notified}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Cancelled
            </p>

            <p className="mt-3 text-4xl font-black text-red-300">
              {cancelledCount}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black">
              Notification Requests
            </h2>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setFilter(item.value)
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    filter === item.value
                      ? "border-white bg-white text-black"
                      : "border-white/15 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <h3 className="text-2xl font-black">
                No waitlist entries
              </h3>

              <p className="mt-3 text-gray-400">
                Nobody has joined this list yet.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {filteredEntries.map(
                (entry) => {
                  const isUpdating =
                    updatingEntryId ===
                    entry.id;

                  const isDeleting =
                    deletingEntryId ===
                    entry.id;

                  return (
                    <article
                      key={entry.id}
                      className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black">
                            {entry.customer_name}
                          </h3>

                          <p className="mt-2 text-sm text-gray-500">
                            {entry.product_name}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black ${getStatusClasses(
                            entry.status
                          )}`}
                        >
                          {formatStatus(
                            entry.status
                          )}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Email
                          </p>

                          <p className="mt-2 break-words font-bold">
                            {entry.email ||
                              "Not provided"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Phone
                          </p>

                          <p className="mt-2 font-bold">
                            {entry.phone ||
                              "Not provided"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Colour
                          </p>

                          <p className="mt-2 font-bold">
                            {entry.colour ||
                              "Not selected"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/40 p-4">
                          <p className="text-xs uppercase tracking-wider text-gray-500">
                            Size
                          </p>

                          <p className="mt-2 font-bold">
                            {entry.size ||
                              "Not selected"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="text-xs text-gray-500">
                          Joined on
                        </p>

                        <p className="mt-2 text-sm font-bold">
                          {new Date(
                            entry.created_at
                          ).toLocaleString(
                            "en-GB"
                          )}
                        </p>

                        {entry.notified_at && (
                          <>
                            <p className="mt-4 text-xs text-gray-500">
                              Notified on
                            </p>

                            <p className="mt-2 text-sm font-bold text-green-300">
                              {new Date(
                                entry.notified_at
                              ).toLocaleString(
                                "en-GB"
                              )}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {entry.phone ? (
                          <a
                            href={createWhatsAppLink(
                              entry
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-center font-black text-black transition hover:brightness-110"
                          >
                            Message on WhatsApp
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-2xl bg-white/5 px-5 py-4 font-black text-gray-600"
                          >
                            No Phone Number
                          </button>
                        )}

                        {entry.email ? (
                          <a
                            href={createEmailLink(
                              entry
                            )}
                            className="flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-black transition hover:bg-white/10"
                          >
                            Send Email
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-2xl border border-white/10 px-5 py-4 font-black text-gray-600"
                          >
                            No Email Address
                          </button>
                        )}
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateEntryStatus(
                              entry.id,
                              "notified"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            entry.status ===
                              "notified"
                          }
                          className="rounded-2xl bg-green-500 px-5 py-4 font-black text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Mark as Notified"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateEntryStatus(
                              entry.id,
                              "waiting"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            entry.status ===
                              "waiting"
                          }
                          className="rounded-2xl bg-yellow-400 px-5 py-4 font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Set as Waiting"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateEntryStatus(
                              entry.id,
                              "cancelled"
                            )
                          }
                          disabled={
                            isUpdating ||
                            isDeleting ||
                            entry.status ===
                              "cancelled"
                          }
                          className="rounded-2xl border border-red-500/30 px-5 py-4 font-black text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isUpdating
                            ? "Updating..."
                            : "Cancel Request"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteEntry(entry.id)
                          }
                          disabled={
                            isUpdating ||
                            isDeleting
                          }
                          className="rounded-2xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "Delete Permanently"}
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