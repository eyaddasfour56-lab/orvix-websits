"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type InventoryItem = {
  id: string;
  product_slug: string;
  product_name: string;
  stock_quantity: number;
  low_stock_limit: number;
  is_available: boolean;
  updated_at: string;
};

export default function AdminInventoryPage() {
  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">("");

  const [
    updatingProductId,
    setUpdatingProductId,
  ] = useState<string | null>(null);

  async function loadInventory() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/inventory",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        throw new Error(
          "Your admin session expired. Go back to the dashboard and sign in again."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load inventory."
        );
      }

      setInventory(
        Array.isArray(result.inventory)
          ? result.inventory.map(
              (item: InventoryItem) => ({
                ...item,
                stock_quantity: Number(
                  item.stock_quantity || 0
                ),
                low_stock_limit: Number(
                  item.low_stock_limit || 0
                ),
                is_available: Boolean(
                  item.is_available
                ),
              })
            )
          : []
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load inventory."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  function updateLocalItem(
    id: string,
    field:
      | "stock_quantity"
      | "low_stock_limit"
      | "is_available",
    value: number | boolean
  ) {
    setInventory((currentInventory) =>
      currentInventory.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function saveInventoryItem(
    item: InventoryItem
  ) {
    setUpdatingProductId(item.id);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        `/api/admin/inventory/${encodeURIComponent(
          item.id
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            stockQuantity:
              item.stock_quantity,
            lowStockLimit:
              item.low_stock_limit,
            isAvailable:
              item.is_available,
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
            "Could not update inventory."
        );
      }

      setInventory((currentInventory) =>
        currentInventory.map(
          (currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  ...result.inventory,
                  stock_quantity: Number(
                    result.inventory
                      ?.stock_quantity || 0
                  ),
                  low_stock_limit: Number(
                    result.inventory
                      ?.low_stock_limit || 0
                  ),
                  is_available: Boolean(
                    result.inventory
                      ?.is_available
                  ),
                }
              : currentItem
        )
      );

      setMessage(
        `${item.product_name} inventory updated successfully.`
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update inventory."
      );

      setMessageType("error");
    } finally {
      setUpdatingProductId(null);
    }
  }

  const totalStock = useMemo(
    () =>
      inventory.reduce(
        (total, item) =>
          total +
          Number(item.stock_quantity || 0),
        0
      ),
    [inventory]
  );

  const lowStockProducts = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.is_available &&
          item.stock_quantity > 0 &&
          item.stock_quantity <=
            item.low_stock_limit
      ).length,
    [inventory]
  );

  const outOfStockProducts = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.stock_quantity === 0 ||
          !item.is_available
      ).length,
    [inventory]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading inventory...
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
              Product Inventory
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              Control stock quantity, low-stock
              warnings and product availability.
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
              onClick={loadInventory}
              className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200"
            >
              Refresh Inventory
            </button>
          </div>
        </header>

        {message && (
          <p
            className={`mt-6 rounded-2xl border p-4 ${
              messageType === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-300"
                : "border-red-500/20 bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Products
            </p>

            <p className="mt-3 text-4xl font-black">
              {inventory.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total Stock
            </p>

            <p className="mt-3 text-4xl font-black">
              {totalStock}
            </p>
          </div>

          <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">
            <p className="text-orange-200">
              Low Stock Products
            </p>

            <p className="mt-3 text-4xl font-black text-orange-300">
              {lowStockProducts}
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-red-200">
              Unavailable Products
            </p>

            <p className="mt-3 text-4xl font-black text-red-300">
              {outOfStockProducts}
            </p>
          </div>
        </section>

        {inventory.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <h2 className="text-2xl font-black">
              No inventory products found
            </h2>

            <p className="mt-3 text-gray-400">
              Add products to the product_inventory
              table in Supabase.
            </p>
          </div>
        ) : (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            {inventory.map((item) => {
              const isUpdating =
                updatingProductId === item.id;

              const isOutOfStock =
                item.stock_quantity === 0 ||
                !item.is_available;

              const isLowStock =
                !isOutOfStock &&
                item.stock_quantity <=
                  item.low_stock_limit;

              return (
                <article
                  key={item.id}
                  className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">
                        {item.product_name}
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {item.product_slug}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${
                        isOutOfStock
                          ? "border-red-500/20 bg-red-500/10 text-red-300"
                          : isLowStock
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                            : "border-green-500/20 bg-green-500/10 text-green-300"
                      }`}
                    >
                      {isOutOfStock
                        ? "Unavailable"
                        : isLowStock
                          ? "Low Stock"
                          : "In Stock"}
                    </span>
                  </div>

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`stock-${item.id}`}
                        className="text-sm font-black text-gray-300"
                      >
                        Stock Quantity
                      </label>

                      <input
                        id={`stock-${item.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.stock_quantity}
                        onChange={(event) =>
                          updateLocalItem(
                            item.id,
                            "stock_quantity",
                            Math.max(
                              0,
                              Number(
                                event.target.value ||
                                  0
                              )
                            )
                          )
                        }
                        className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-xl font-black text-white outline-none focus:border-white"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateLocalItem(
                              item.id,
                              "stock_quantity",
                              Math.max(
                                0,
                                item.stock_quantity - 1
                              )
                            )
                          }
                          className="rounded-xl border border-white/15 px-4 py-3 font-black transition hover:bg-white/10"
                        >
                          − 1
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateLocalItem(
                              item.id,
                              "stock_quantity",
                              item.stock_quantity + 1
                            )
                          }
                          className="rounded-xl bg-white px-4 py-3 font-black text-black transition hover:bg-gray-200"
                        >
                          + 1
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`low-stock-${item.id}`}
                        className="text-sm font-black text-gray-300"
                      >
                        Low Stock Limit
                      </label>

                      <input
                        id={`low-stock-${item.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.low_stock_limit}
                        onChange={(event) =>
                          updateLocalItem(
                            item.id,
                            "low_stock_limit",
                            Math.max(
                              0,
                              Number(
                                event.target.value ||
                                  0
                              )
                            )
                          )
                        }
                        className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-xl font-black text-white outline-none focus:border-white"
                      />

                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        The product shows Low Stock
                        when quantity is this number
                        or lower.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-black">
                          Product Availability
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                          Turning this off disables
                          purchasing even when stock
                          is above zero.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateLocalItem(
                            item.id,
                            "is_available",
                            !item.is_available
                          )
                        }
                        aria-pressed={
                          item.is_available
                        }
                        className={`relative h-10 w-20 rounded-full transition ${
                          item.is_available
                            ? "bg-green-500"
                            : "bg-white/15"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-8 w-8 rounded-full bg-white transition ${
                            item.is_available
                              ? "left-11"
                              : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    <p
                      className={`mt-4 text-sm font-black ${
                        item.is_available
                          ? "text-green-300"
                          : "text-red-300"
                      }`}
                    >
                      {item.is_available
                        ? "Available for purchase"
                        : "Purchasing disabled"}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500">
                      Current customer view
                    </p>

                    <p
                      className={`mt-2 text-lg font-black ${
                        isOutOfStock
                          ? "text-red-300"
                          : isLowStock
                            ? "text-orange-300"
                            : "text-green-300"
                      }`}
                    >
                      {isOutOfStock
                        ? "Out of Stock"
                        : isLowStock
                          ? `Only ${item.stock_quantity} left`
                          : `${item.stock_quantity} pieces in stock`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      saveInventoryItem(item)
                    }
                    disabled={isUpdating}
                    className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdating
                      ? "Saving..."
                      : "Save Inventory Changes"}
                  </button>

                  <p className="mt-4 text-xs text-gray-600">
                    Last updated:{" "}
                    {new Date(
                      item.updated_at
                    ).toLocaleString("en-GB")}
                  </p>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}