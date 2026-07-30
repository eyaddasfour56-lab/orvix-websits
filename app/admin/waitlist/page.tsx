"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type WaitlistEntry = {
  id: string;
  product_name: string;
  product_slug: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  colour: string | null;
  size: string | null;
  status:
    | "waiting"
    | "notified"
    | "cancelled";
  created_at: string;
  notified_at: string | null;
};

type WaitlistStatistics = {
  total: number;
  waiting: number;
  notified: number;
};

function formatStatus(
  status: WaitlistEntry["status"]
) {
  return status.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase()
  );
}

function getStatusClasses(
  status: WaitlistEntry["status"]
) {
  if (status === "notified") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
}

function formatWhatsAppNumber(phone: string) {
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

  const [filter, setFilter] =
    useState("all");

  async function loadWaitlist() {
    setLoading(true);
    setMessage("");

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
              View customers who asked to be
              notified when Garmin CIRQA becomes
              available.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-2xl border border-white/15 px-6 py-4 font-black transition hover:bg-white/10"
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
              {[
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
              ].map((item) => (
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
                (entry) => (
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

                    <p className="mt-5 text-xs text-gray-500">
                      Joined on{" "}
                      {new Date(
                        entry.created_at
                      ).toLocaleString("en-GB")}
                    </p>

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
                          href={`mailto:${entry.email}?subject=${encodeURIComponent(
                            "Garmin CIRQA is now available"
                          )}&body=${encodeURIComponent(
                            `Hello ${entry.customer_name},

Garmin CIRQA is now available at ORVIX.

Your selected option:
Colour: ${entry.colour || "Not selected"}
Size: ${entry.size || "Not selected"}

Reply to this email if you would like to place your order.

Thank you,
ORVIX`
                          )}`}
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
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}