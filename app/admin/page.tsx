"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  governorate: string;
  address: string;
  colour: string;
  quantity: number;
  products_total: number;
  delivery_fee: number;
  total_price: number;
  status: string;
  created_at: string;
};

const orderStatuses = [
  {
    value: "new",
    label: "New",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "shipped",
    label: "Shipped",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

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

function createWhatsAppLink(order: Order) {
  const phoneNumber = formatWhatsAppNumber(
    order.phone
  );

  const message = `Hello ${order.customer_name} 👋

Thank you for ordering from ORVIX.

Order Number: ${order.order_number}
Colour: ${order.colour}
Quantity: ${order.quantity}
Governorate: ${order.governorate}
Address: ${order.address}

Products Total: ${Number(
    order.products_total
  ).toLocaleString("en-GB")} EGP

Delivery Fee: ${Number(
    order.delivery_fee
  ).toLocaleString("en-GB")} EGP

Total: ${Number(
    order.total_price
  ).toLocaleString("en-GB")} EGP

Please reply with "Confirm" to confirm your order.

Thank you,
ORVIX`;

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;
}

function getStatusLabel(status: string) {
  const matchingStatus = orderStatuses.find(
    (item) => item.value === status
  );

  return (
    matchingStatus?.label ||
    status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function getStatusClasses(status: string) {
  if (status === "delivered") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (status === "out_for_delivery") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (status === "shipped") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (status === "confirmed") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  return "border-white/15 bg-white/10 text-white";
}

export default function AdminPage() {
  const [password, setPassword] =
    useState("");

  const [orders, setOrders] = useState<
    Order[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [loginLoading, setLoginLoading] =
    useState(false);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState<string | null>(null);

  const [totalViews, setTotalViews] =
    useState(0);

  const [viewsToday, setViewsToday] =
    useState(0);

  const [
    resettingOrders,
    setResettingOrders,
  ] = useState(false);

  async function loadOrders() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not load orders."
        );
      }

      setAuthenticated(true);
      setOrders(result.orders || []);

      const viewsResponse = await fetch(
        "/api/admin/views",
        {
          cache: "no-store",
        }
      );

      const viewsResult =
        await viewsResponse.json();

      if (
        viewsResponse.ok &&
        viewsResult.success
      ) {
        setTotalViews(
          Number(
            viewsResult.totalViews || 0
          )
        );

        setViewsToday(
          Number(
            viewsResult.viewsToday || 0
          )
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoginLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Incorrect password."
        );
      }

      setPassword("");
      setAuthenticated(true);

      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not log in."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function updateOrderStatus(
    orderId: string,
    status: string
  ) {
    const isValidStatus =
      orderStatuses.some(
        (item) => item.value === status
      );

    if (!isValidStatus) {
      setMessage(
        "This order status is not valid."
      );

      return;
    }

    setUpdatingOrderId(orderId);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/order-status",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            orderId,
            status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not update order status."
        );
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order
        )
      );

      setMessage(
        `Order status updated to ${getStatusLabel(
          status
        )}.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function resetAllOrders() {
    const confirmation = window.prompt(
      "To delete all orders permanently, type: DELETE ALL ORDERS"
    );

    if (
      confirmation !== "DELETE ALL ORDERS"
    ) {
      if (confirmation !== null) {
        setMessage(
          "Orders were not deleted. Confirmation text was incorrect."
        );
      }

      return;
    }

    setResettingOrders(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/reset-orders",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            confirmation,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not delete the orders."
        );
      }

      setOrders([]);

      setMessage(
        "All old orders were deleted successfully."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the orders."
      );
    } finally {
      setResettingOrders(false);
    }
  }

  const totalSales = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          Number(order.total_price || 0),
        0
      ),
    [orders]
  );

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();

    return orders.filter(
      (order) =>
        new Date(
          order.created_at
        ).toDateString() === today
    ).length;
  }, [orders]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "delivered" &&
          order.status !== "cancelled"
      ).length,
    [orders]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            ORVIX Admin
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Dashboard Login
          </h1>

          <p className="mt-4 leading-7 text-gray-400">
            Enter the admin password to manage
            orders, reviews, the Garmin waitlist
            and discount codes.
          </p>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value
              );

              setMessage("");
            }}
            placeholder="Enter admin password"
            autoComplete="current-password"
            className="mt-8 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
          />

          {message && (
            <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loginLoading ||
              !password.trim()
            }
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loginLoading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
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
              Dashboard
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              Manage orders, reviews, Garmin
              notification requests, delivery
              statuses and website activity.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              href="/admin/discounts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-4 text-center font-bold text-black transition hover:bg-gray-200"
            >
              Manage Discount Codes
            </Link>

            <Link
              href="/admin/reviews"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-bold text-white transition hover:bg-white/10"
            >
              Manage Reviews
            </Link>

            <Link
              href="/admin/waitlist"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-bold text-white transition hover:bg-white/10"
            >
              Manage Garmin Waitlist
            </Link>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="rounded-2xl border border-white/15 px-5 py-4 font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={resetAllOrders}
              disabled={
                resettingOrders ||
                orders.length === 0
              }
              className="rounded-2xl bg-red-600 px-5 py-4 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resettingOrders
                ? "Deleting..."
                : "Reset All Orders"}
            </button>
          </div>
        </header>

        {message && (
          <p
            className={`mt-6 rounded-2xl border p-4 ${
              message
                .toLowerCase()
                .includes("success") ||
              message
                .toLowerCase()
                .includes("updated")
                ? "border-green-500/20 bg-green-500/10 text-green-300"
                : "border-red-500/20 bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total views
            </p>

            <p className="mt-3 text-4xl font-black">
              {totalViews}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Views today
            </p>

            <p className="mt-3 text-4xl font-black">
              {viewsToday}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total orders
            </p>

            <p className="mt-3 text-4xl font-black">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Orders today
            </p>

            <p className="mt-3 text-4xl font-black">
              {todayOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Active orders
            </p>

            <p className="mt-3 text-4xl font-black">
              {activeOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total sales
            </p>

            <p className="mt-3 text-3xl font-black">
              {totalSales.toLocaleString(
                "en-GB"
              )}{" "}
              EGP
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Orders
            </h2>

            <p className="text-sm text-gray-500">
              {orders.length} total
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
              No orders yet.
            </div>
          ) : (
            orders.map((order) => {
              const isUpdating =
                updatingOrderId === order.id;

              return (
                <article
                  key={order.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Order #
                        {order.order_number}
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {order.customer_name}
                      </h3>

                      <p className="mt-1 text-gray-400">
                        {order.phone}
                      </p>

                      <div
                        className={`mt-4 w-fit rounded-full border px-4 py-2 text-sm font-black ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(
                          order.status
                        )}
                      </div>
                    </div>

                    <div className="w-full lg:w-64">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                        Order Status
                      </label>

                      <select
                        value={order.status}
                        disabled={isUpdating}
                        onChange={(event) =>
                          updateOrderStatus(
                            order.id,
                            event.target.value
                          )
                        }
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {orderStatuses.map(
                          (status) => (
                            <option
                              key={status.value}
                              value={status.value}
                            >
                              {status.label}
                            </option>
                          )
                        )}
                      </select>

                      {isUpdating && (
                        <p className="mt-2 text-xs text-gray-500">
                          Updating status...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-gray-500">
                        Colour
                      </p>

                      <p className="mt-1 font-semibold">
                        {order.colour}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-gray-500">
                        Quantity
                      </p>

                      <p className="mt-1 font-semibold">
                        {order.quantity}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-gray-500">
                        Governorate
                      </p>

                      <p className="mt-1 font-semibold">
                        {order.governorate}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-gray-500">
                        Total
                      </p>

                      <p className="mt-1 font-semibold">
                        {Number(
                          order.total_price
                        ).toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      Address
                    </p>

                    <p className="mt-2 leading-7">
                      {order.address}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <a
                      href={createWhatsAppLink(
                        order
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-center font-black text-black transition hover:brightness-110"
                    >
                      Confirm on WhatsApp
                    </a>

                    <Link
                      href={`/track-order?orderNumber=${encodeURIComponent(
                        order.order_number
                      )}`}
                      target="_blank"
                      className="flex w-full items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-black text-white transition hover:bg-white/10"
                    >
                      Open Tracking Page
                    </Link>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    {new Date(
                      order.created_at
                    ).toLocaleString("en-GB")}
                  </p>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}