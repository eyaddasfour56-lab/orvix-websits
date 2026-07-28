"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  order_number: number;
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
  const [loginLoading, setLoginLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not load orders.");
      }

      setAuthenticated(true);
      setOrders(result.orders || []);
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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Incorrect password.");
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

  const totalSales = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + Number(order.total_price || 0),
        0
      ),
    [orders]
  );

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();

    return orders.filter(
      (order) => new Date(order.created_at).toDateString() === today
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
            onChange={(event) => setPassword(event.target.value)}
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
            disabled={loginLoading || !password}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-black disabled:opacity-50"
          >
            {loginLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Dashboard
            </h1>
          </div>

          <button
            onClick={loadOrders}
            className="rounded-2xl border border-white/15 px-5 py-3 font-semibold"
          >
            Refresh
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl bg-red-500/10 p-4 text-red-300">
            {message}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">Total orders</p>
            <p className="mt-3 text-4xl font-black">{orders.length}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">Orders today</p>
            <p className="mt-3 text-4xl font-black">{todayOrders}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">Total sales</p>
            <p className="mt-3 text-3xl font-black">
              {totalSales.toLocaleString("en-GB")} EGP
            </p>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold">Orders</h2>

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
                      Order #{order.order_number}
                    </p>

                    <h3 className="mt-1 text-2xl font-bold">
                      {order.customer_name}
                    </h3>

                    <p className="mt-1 text-gray-400">
                      {order.phone}
                    </p>
                  </div>

                  <div className="rounded-full bg-white px-4 py-2 text-sm font-bold capitalize text-black">
                    {order.status}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-gray-500">Colour</p>
                    <p className="mt-1 font-semibold">{order.colour}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Quantity</p>
                    <p className="mt-1 font-semibold">{order.quantity}</p>
                  </div>

                  <div>
                    <p className="text-gray-500">Governorate</p>
                    <p className="mt-1 font-semibold">
                      {order.governorate}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="mt-1 font-semibold">
                      {Number(order.total_price).toLocaleString("en-GB")} EGP
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Address
                  </p>

                  <p className="mt-2 leading-7">{order.address}</p>
                </div>

                <p className="mt-4 text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleString("en-GB")}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}