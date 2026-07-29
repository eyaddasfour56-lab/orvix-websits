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

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] =
    useState(false);
  const [authenticated, setAuthenticated] =
    useState(false);
  const [message, setMessage] = useState("");
  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [viewsToday, setViewsToday] = useState(0);
  const [resettingOrders, setResettingOrders] =
    useState(false);

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
          viewsResult.totalViews || 0
        );
        setViewsToday(
          viewsResult.viewsToday || 0
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

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-16 text-white">
        <p className="text-center text-gray-400">
          Loading dashboard...
        </p>
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

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter admin password"
            className="mt-8 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
          />

          {message && (
            <p className="mt-3 text-sm font-semibold text-red-400">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loginLoading || !password
            }
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-black disabled:opacity-50"
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Dashboard
            </h1>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin/discounts"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-bold text-black transition hover:bg-gray-200"
            >
              Manage Discount Codes
            </Link>

            <button
              type="button"
              onClick={loadOrders}
              className="rounded-2xl border border-white/15 px-5 py-3 font-semibold transition hover:bg-white/10"
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
              className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resettingOrders
                ? "Deleting..."
                : "Reset All Orders"}
            </button>
          </div>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {message}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total website views
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
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-400">
              No orders yet.
            </div>
          ) : (
            orders.map((order) => (
              <article
                key={order.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  </div>

                  <select
                    value={order.status}
                    disabled={
                      updatingOrderId ===
                      order.id
                    }
                    onChange={(event) =>
                      updateOrderStatus(
                        order.id,
                        event.target.value
                      )
                    }
                    className="rounded-full bg-white px-4 py-3 text-sm font-bold capitalize text-black outline-none disabled:opacity-50"
                  >
                    <option value="new">
                      New
                    </option>

                    <option value="confirmed">
                      Confirmed
                    </option>

                    <option value="shipped">
                      Shipped
                    </option>

                    <option value="delivered">
                      Delivered
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>

                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-gray-500">
                      Colour
                    </p>

                    <p className="mt-1 font-semibold">
                      {order.colour}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Quantity
                    </p>

                    <p className="mt-1 font-semibold">
                      {order.quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">
                      Governorate
                    </p>

                    <p className="mt-1 font-semibold">
                      {order.governorate}
                    </p>
                  </div>

                  <div>
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

                <p className="mt-4 text-xs text-gray-500">
                  {new Date(
                    order.created_at
                  ).toLocaleString("en-GB")}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}