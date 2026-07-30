"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

type ProductStatus =
  | "available"
  | "coming_soon"
  | "out_of_stock"
  | "hidden";

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  image: string;
  status: ProductStatus;
  stockQuantity: number;
  lowStockLimit: number;
  showOnHomepage: boolean;
  allowWishlist: boolean;
  allowPurchase: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
};

type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
};

function formatPrice(price: number) {
  if (price <= 0) {
    return "Price coming soon";
  }

  return `${price.toLocaleString(
    "en-GB"
  )} EGP`;
}

function readLocalStorage<T>(
  key: string,
  fallback: T
): T {
  try {
    const storedValue =
      window.localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function getStatusDetails(product: Product) {
  if (product.status === "coming_soon") {
    return {
      label: "Coming Soon",
      classes:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    };
  }

  if (
    product.status === "out_of_stock" ||
    product.stockQuantity <= 0
  ) {
    return {
      label: "Out of Stock",
      classes:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (
    product.stockQuantity <=
    product.lowStockLimit
  ) {
    return {
      label: `Only ${product.stockQuantity} left`,
      classes:
        "border-orange-500/30 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: "Available Now",
    classes:
      "border-green-500/30 bg-green-500/10 text-green-300",
  };
}

export default function DynamicProductPage() {
  const params = useParams<{
    slug: string;
  }>();

  const slug = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [message, setMessage] =
    useState("");

  const [isInWishlist, setIsInWishlist] =
    useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/products?slug=${encodeURIComponent(
            slug
          )}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.product
        ) {
          throw new Error(
            result.message ||
              "Product was not found."
          );
        }

        if (
          result.product.status ===
          "hidden"
        ) {
          throw new Error(
            "Product was not found."
          );
        }

        setProduct(result.product);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load product."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  useEffect(() => {
    if (!product) {
      return;
    }

    const wishlist =
      readLocalStorage<WishlistItem[]>(
        "orvixWishlist",
        []
      );

    setIsInWishlist(
      wishlist.some(
        (item) =>
          item.id === product.id ||
          item.slug === product.slug
      )
    );
  }, [product]);

  const statusDetails = useMemo(() => {
    if (!product) {
      return null;
    }

    return getStatusDetails(product);
  }, [product]);

  const canPurchase = Boolean(
    product &&
      product.status === "available" &&
      product.stockQuantity > 0 &&
      product.allowPurchase
  );

  function changeQuantity(
    newQuantity: number
  ) {
    if (!product) {
      return;
    }

    const maximumQuantity = Math.max(
      product.stockQuantity,
      1
    );

    setQuantity(
      Math.min(
        Math.max(newQuantity, 1),
        maximumQuantity
      )
    );
  }

  function addToCart() {
    if (!product || !canPurchase) {
      return;
    }

    const cart =
      readLocalStorage<CartItem[]>(
        "orvixCart",
        []
      );

    const existingItemIndex =
      cart.findIndex(
        (item) =>
          item.id === product.id ||
          item.slug === product.slug
      );

    if (existingItemIndex >= 0) {
      const currentQuantity =
        Number(
          cart[existingItemIndex]
            .quantity || 1
        );

      cart[existingItemIndex] = {
        ...cart[existingItemIndex],
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image,
        quantity: Math.min(
          currentQuantity + quantity,
          product.stockQuantity
        ),
      };
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image:
          product.image ||
          "/black.png",
        quantity: Math.min(
          quantity,
          product.stockQuantity
        ),
      });
    }

    window.localStorage.setItem(
      "orvixCart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(
      new Event("storage")
    );

    window.dispatchEvent(
      new CustomEvent(
        "orvix-cart-updated"
      )
    );

    setMessage(
      `${product.name} added to your cart.`
    );
  }

  function toggleWishlist() {
    if (
      !product ||
      !product.allowWishlist
    ) {
      return;
    }

    const wishlist =
      readLocalStorage<WishlistItem[]>(
        "orvixWishlist",
        []
      );

    const alreadyAdded =
      wishlist.some(
        (item) =>
          item.id === product.id ||
          item.slug === product.slug
      );

    const updatedWishlist =
      alreadyAdded
        ? wishlist.filter(
            (item) =>
              item.id !== product.id &&
              item.slug !== product.slug
          )
        : [
            ...wishlist,
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image:
                product.image ||
                "/black.png",
            },
          ];

    window.localStorage.setItem(
      "orvixWishlist",
      JSON.stringify(updatedWishlist)
    );

    window.dispatchEvent(
      new Event("storage")
    );

    window.dispatchEvent(
      new CustomEvent(
        "orvix-wishlist-updated"
      )
    );

    setIsInWishlist(!alreadyAdded);

    setMessage(
      alreadyAdded
        ? `${product.name} removed from your wishlist.`
        : `${product.name} added to your wishlist.`
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <Navbar />

        <div className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-5 text-gray-400">
              Loading product...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <Navbar />

        <section className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="w-full max-w-xl rounded-[36px] border border-red-500/20 bg-red-500/10 p-8 text-center sm:p-12">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-red-300">
              Product unavailable
            </p>

            <h1 className="mt-5 text-4xl font-black">
              Product not found
            </h1>

            <p className="mt-5 leading-7 text-red-200/70">
              {error ||
                "This product does not exist or is currently hidden."}
            </p>

            <Link
              href="/#products"
              className="mt-8 inline-flex rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
            >
              View All Products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-white"
          >
            ← Back to Products
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="overflow-hidden rounded-[40px] border border-white/10 bg-white p-6 sm:p-10">
              {/* Using img allows local paths and external image URLs entered in Admin. */}
              <img
                src={
                  product.image ||
                  "/black.png"
                }
                alt={product.name}
                className="aspect-square h-auto w-full object-contain"
              />
            </div>

            <div className="lg:sticky lg:top-28">
              {statusDetails && (
                <span
                  className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${statusDetails.classes}`}
                >
                  {statusDetails.label}
                </span>
              )}

              <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">
                {product.name}
              </h1>

              {product.shortDescription && (
                <p className="mt-6 text-xl leading-8 text-gray-300">
                  {
                    product.shortDescription
                  }
                </p>
              )}

              <p className="mt-7 text-3xl font-black">
                {product.status ===
                  "coming_soon" &&
                product.price <= 0
                  ? "Coming soon"
                  : formatPrice(
                      product.price
                    )}
              </p>

              {product.description && (
                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-gray-500">
                    Product Details
                  </p>

                  <p className="mt-4 whitespace-pre-line leading-8 text-gray-300">
                    {product.description}
                  </p>
                </div>
              )}

              {message && (
                <p className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 font-semibold text-green-300">
                  {message}
                </p>
              )}

              {canPurchase ? (
                <div className="mt-8">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                    Quantity
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(
                          quantity - 1
                        )
                      }
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-2xl font-black transition hover:bg-white/10"
                    >
                      −
                    </button>

                    <div className="flex h-14 min-w-20 items-center justify-center rounded-full bg-white px-6 text-xl font-black text-black">
                      {quantity}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(
                          quantity + 1
                        )
                      }
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-2xl font-black transition hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-gray-500">
                    {product.stockQuantity}{" "}
                    pieces currently available
                  </p>

                  <button
                    type="button"
                    onClick={addToCart}
                    className="mt-7 w-full rounded-full bg-white px-7 py-5 text-lg font-black text-black transition hover:bg-gray-200"
                  >
                    Add to Cart
                  </button>
                </div>
              ) : (
                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-black">
                    {product.status ===
                    "coming_soon"
                      ? "This product is coming soon."
                      : "This product is currently unavailable."}
                  </h2>

                  <p className="mt-3 leading-7 text-gray-400">
                    {product.status ===
                    "coming_soon"
                      ? "Follow ORVIX for availability updates and launch information."
                      : "Purchasing will be enabled again when stock becomes available."}
                  </p>
                </div>
              )}

              {product.allowWishlist && (
                <button
                  type="button"
                  onClick={toggleWishlist}
                  className="mt-4 w-full rounded-full border border-white/15 px-7 py-5 font-black transition hover:bg-white/10"
                >
                  {isInWishlist
                    ? "Remove from Wishlist"
                    : "Add to Wishlist"}
                </button>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    Secure Ordering
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    Order Tracking
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    ORVIX Support
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-14 border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-black tracking-[0.3em]">
              ORVIX
            </p>

            <p className="mt-2 text-sm text-gray-600">
              © 2026 ORVIX. All rights
              reserved.
            </p>
          </div>

          <Link
            href="/#products"
            className="text-sm font-bold text-gray-400 transition hover:text-white"
          >
            Explore More Products
          </Link>
        </div>
      </footer>
    </main>
  );
}