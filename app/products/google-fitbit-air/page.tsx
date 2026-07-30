"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_NAME = "Google Fitbit Air";
const PRODUCT_SLUG = "google-fitbit-air";
const PRODUCT_PRICE = 7900;

const CART_STORAGE_KEY = "orvixCart";
const WISHLIST_STORAGE_KEY =
  "orvixWishlist";

type CartItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  quantity: number;
  slug: string;
};

type WishlistItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  slug: string;
};

type ProductReview = {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  created_at: string;
};

type ReviewStatistics = {
  totalReviews: number;
  averageRating: number;
};

type ProductInventory = {
  id: string;
  productSlug: string;
  productName: string;
  stockQuantity: number;
  lowStockLimit: number;
  isAvailable: boolean;
  updatedAt: string;
};

const colours = [
  {
    name: "Black",
    image: "/black.png",
    dot: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    dot: "bg-violet-300",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    dot: "bg-pink-600",
  },
];

const featureGroups = [
  {
    title: "Tracking",
    features: [
      {
        title: "Detailed Motion Data",
        description:
          "Stores up to 7 days of minute-by-minute motion information.",
      },
      {
        title: "Daily Totals",
        description:
          "Keeps daily activity totals for up to 30 days.",
      },
      {
        title: "Heart Rate Data",
        description:
          "Stores heart-rate measurements at frequent intervals.",
      },
      {
        title: "Optical Heart Rate",
        description:
          "Continuously tracks heart rate during daily use.",
      },
    ],
  },
  {
    title: "Battery & Power",
    features: [
      {
        title: "Up to 7 Days",
        description:
          "Battery life can last up to 7 days depending on usage.",
      },
      {
        title: "Fast Charging",
        description:
          "Charges from 0% to 100% in approximately 90 minutes.",
      },
      {
        title: "USB-C Charging",
        description:
          "Includes a USB-C charging cable for convenient charging.",
      },
      {
        title: "Bluetooth 5.0",
        description:
          "Uses Bluetooth Low Energy for syncing with your phone.",
      },
    ],
  },
  {
    title: "Sensors",
    features: [
      {
        title: "Accelerometer",
        description:
          "Tracks motion, steps and daily activity.",
      },
      {
        title: "Gyroscope",
        description:
          "Supports movement and orientation tracking.",
      },
      {
        title: "Skin Temperature",
        description:
          "Measures changes in skin temperature during sleep.",
      },
      {
        title: "Vibration Motor",
        description:
          "Provides gentle alerts and notifications.",
      },
    ],
  },
  {
    title: "Build & Durability",
    features: [
      {
        title: "Recycled Materials",
        description:
          "Made with recycled polymer and premium stainless steel details.",
      },
      {
        title: "Lightweight Design",
        description:
          "Weighs approximately 12 g with the band.",
      },
      {
        title: "Water Resistance",
        description:
          "Water resistant up to 50 metres for daily wear and swimming.",
      },
      {
        title: "Easy Care",
        description:
          "Designed to be rinsed, dried and worn comfortably every day.",
      },
    ],
  },
  {
    title: "Band & Fit",
    features: [
      {
        title: "Adjustable Wristband",
        description:
          "Flexible band designed for comfortable everyday wear.",
      },
      {
        title: "Small Wrist Size",
        description:
          "Fits wrist sizes around 130–175 mm.",
      },
      {
        title: "Large Wrist Size",
        description:
          "Fits wrist sizes around 165–210 mm.",
      },
      {
        title: "Compact Tracker",
        description:
          "Slim body measuring around 34.9 × 17 × 8.3 mm.",
      },
    ],
  },
  {
    title: "Compatibility",
    features: [
      {
        title: "Google Health App",
        description:
          "Requires a Google Account and the Google Health app.",
      },
      {
        title: "Android Support",
        description:
          "Compatible with Android 11 or newer.",
      },
      {
        title: "iPhone Support",
        description:
          "Compatible with iOS 16.4 or newer.",
      },
      {
        title: "Wireless Syncing",
        description:
          "Syncs through Bluetooth with an internet connection.",
      },
    ],
  },
];

function readCart(): CartItem[] {
  try {
    const savedCart =
      window.localStorage.getItem(
        CART_STORAGE_KEY
      );

    if (!savedCart) {
      return [];
    }

    const parsedCart =
      JSON.parse(savedCart);

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch {
    return [];
  }
}

function readWishlist(): WishlistItem[] {
  try {
    const savedWishlist =
      window.localStorage.getItem(
        WISHLIST_STORAGE_KEY
      );

    if (!savedWishlist) {
      return [];
    }

    const parsedWishlist =
      JSON.parse(savedWishlist);

    return Array.isArray(parsedWishlist)
      ? parsedWishlist
      : [];
  } catch {
    return [];
  }
}

function renderStars(rating: number) {
  const roundedRating =
    Math.round(rating);

  return [1, 2, 3, 4, 5].map(
    (star) => (
      <span key={star}>
        {star <= roundedRating
          ? "★"
          : "☆"}
      </span>
    )
  );
}

function formatReviewDate(date: string) {
  const parsedDate = new Date(date);

  if (
    Number.isNaN(parsedDate.getTime())
  ) {
    return "";
  }

  return parsedDate.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

export default function GoogleFitbitAirPage() {
  const [
    selectedColour,
    setSelectedColour,
  ] = useState(colours[0]);

  const [quantity, setQuantity] =
    useState(1);

  const [
    showAddedMessage,
    setShowAddedMessage,
  ] = useState(false);

  const [
    showWishlistMessage,
    setShowWishlistMessage,
  ] = useState("");

  const [
    isWishlisted,
    setIsWishlisted,
  ] = useState(false);

  const [reviews, setReviews] = useState<
    ProductReview[]
  >([]);

  const [
    reviewStatistics,
    setReviewStatistics,
  ] = useState<ReviewStatistics>({
    totalReviews: 0,
    averageRating: 0,
  });

  const [
    reviewsLoading,
    setReviewsLoading,
  ] = useState(true);

  const [
    reviewsError,
    setReviewsError,
  ] = useState("");

  const [inventory, setInventory] =
    useState<ProductInventory | null>(
      null
    );

  const [
    inventoryLoading,
    setInventoryLoading,
  ] = useState(true);

  const [
    inventoryError,
    setInventoryError,
  ] = useState("");

  const [
    cartStockMessage,
    setCartStockMessage,
  ] = useState("");

  const stockQuantity =
    inventory?.stockQuantity ?? 0;

  const isAvailable =
    Boolean(inventory?.isAvailable) &&
    stockQuantity > 0;

  const isLowStock =
    isAvailable &&
    stockQuantity <=
      (inventory?.lowStockLimit ?? 0);

  useEffect(() => {
    const currentWishlist =
      readWishlist();

    const itemId =
      `${PRODUCT_SLUG}-${selectedColour.name.toLowerCase()}`;

    const saved =
      currentWishlist.some(
        (item) => item.id === itemId
      );

    setIsWishlisted(saved);
  }, [selectedColour]);

  useEffect(() => {
    function refreshWishlistState() {
      const currentWishlist =
        readWishlist();

      const itemId =
        `${PRODUCT_SLUG}-${selectedColour.name.toLowerCase()}`;

      setIsWishlisted(
        currentWishlist.some(
          (item) => item.id === itemId
        )
      );
    }

    window.addEventListener(
      "orvix-wishlist-updated",
      refreshWishlistState
    );

    window.addEventListener(
      "storage",
      refreshWishlistState
    );

    return () => {
      window.removeEventListener(
        "orvix-wishlist-updated",
        refreshWishlistState
      );

      window.removeEventListener(
        "storage",
        refreshWishlistState
      );
    };
  }, [selectedColour]);

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      setInventoryLoading(true);
      setInventoryError("");

      try {
        const response = await fetch(
          `/api/inventory/${encodeURIComponent(
            PRODUCT_SLUG
          )}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Could not load stock."
          );
        }

        if (cancelled) {
          return;
        }

        const loadedInventory =
          result.inventory as ProductInventory;

        setInventory(loadedInventory);

        const availableStock = Number(
          loadedInventory?.stockQuantity ||
            0
        );

        setQuantity((current) =>
          availableStock > 0
            ? Math.min(
                Math.max(current, 1),
                availableStock
              )
            : 1
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setInventoryError(
          error instanceof Error
            ? error.message
            : "Could not load stock."
        );
      } finally {
        if (!cancelled) {
          setInventoryLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setReviewsLoading(true);
      setReviewsError("");

      try {
        const response = await fetch(
          `/api/reviews?productSlug=${encodeURIComponent(
            PRODUCT_SLUG
          )}`,
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Could not load reviews."
          );
        }

        if (cancelled) {
          return;
        }

        setReviews(
          Array.isArray(result.reviews)
            ? result.reviews
            : []
        );

        setReviewStatistics({
          totalReviews: Number(
            result.statistics
              ?.totalReviews || 0
          ),

          averageRating: Number(
            result.statistics
              ?.averageRating || 0
          ),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setReviewsError(
          error instanceof Error
            ? error.message
            : "Could not load reviews."
        );
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  function openCartDrawer() {
    window.setTimeout(() => {
      const cartButton =
        document.querySelector<HTMLButtonElement>(
          'button[aria-label^="Open cart with"]'
        );

      cartButton?.click();
    }, 100);
  }

  function showStockMessage(
    message: string
  ) {
    setCartStockMessage(message);

    window.setTimeout(() => {
      setCartStockMessage("");
    }, 3000);
  }

  function addToCart() {
    if (
      inventoryLoading ||
      !inventory
    ) {
      showStockMessage(
        "Stock is still loading."
      );

      return;
    }

    if (!isAvailable) {
      showStockMessage(
        "This product is currently out of stock."
      );

      return;
    }

    const currentCart = readCart();

    const itemId =
      `${PRODUCT_SLUG}-${selectedColour.name.toLowerCase()}`;

    const totalProductQuantity =
      currentCart
        .filter(
          (item) =>
            item.slug === PRODUCT_SLUG
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.quantity || 0),
          0
        );

    const availableToAdd =
      stockQuantity -
      totalProductQuantity;

    if (availableToAdd <= 0) {
      showStockMessage(
        "You already have all available stock in your cart."
      );

      openCartDrawer();

      return;
    }

    const quantityToAdd = Math.min(
      quantity,
      availableToAdd
    );

    const existingItemIndex =
      currentCart.findIndex(
        (item) => item.id === itemId
      );

    let updatedCart: CartItem[];

    if (existingItemIndex >= 0) {
      updatedCart = currentCart.map(
        (item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                image:
                  selectedColour.image,

                quantity:
                  item.quantity +
                  quantityToAdd,
              }
            : item
      );
    } else {
      const newItem: CartItem = {
        id: itemId,
        name: PRODUCT_NAME,
        colour:
          selectedColour.name,
        image:
          selectedColour.image,
        price: PRODUCT_PRICE,
        quantity: quantityToAdd,
        slug: PRODUCT_SLUG,
      };

      updatedCart = [
        ...currentCart,
        newItem,
      ];
    }

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(updatedCart)
    );

    window.dispatchEvent(
      new Event(
        "orvix-cart-updated"
      )
    );

    if (
      quantityToAdd < quantity
    ) {
      showStockMessage(
        `Only ${quantityToAdd} more ${
          quantityToAdd === 1
            ? "piece was"
            : "pieces were"
        } available.`
      );
    } else {
      setShowAddedMessage(true);

      window.setTimeout(() => {
        setShowAddedMessage(false);
      }, 2500);
    }

    openCartDrawer();
  }

  function toggleWishlist() {
    const currentWishlist =
      readWishlist();

    const itemId =
      `${PRODUCT_SLUG}-${selectedColour.name.toLowerCase()}`;

    const alreadyExists =
      currentWishlist.some(
        (item) => item.id === itemId
      );

    let updatedWishlist: WishlistItem[];

    if (alreadyExists) {
      updatedWishlist =
        currentWishlist.filter(
          (item) => item.id !== itemId
        );

      setIsWishlisted(false);

      setShowWishlistMessage(
        "Removed from wishlist"
      );
    } else {
      const newItem: WishlistItem = {
        id: itemId,
        name: PRODUCT_NAME,
        colour:
          selectedColour.name,
        image:
          selectedColour.image,
        price: PRODUCT_PRICE,
        slug: PRODUCT_SLUG,
      };

      updatedWishlist = [
        ...currentWishlist,
        newItem,
      ];

      setIsWishlisted(true);

      setShowWishlistMessage(
        "Added to wishlist"
      );
    }

    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(
        updatedWishlist
      )
    );

    window.dispatchEvent(
      new Event(
        "orvix-wishlist-updated"
      )
    );

    window.setTimeout(() => {
      setShowWishlistMessage("");
    }, 2500);
  }

  return (
    <main className="min-h-screen bg-[#070707] pb-32 text-white md:pb-0">
      <Navbar />

      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 top-24 z-[100] -translate-x-1/2 transition duration-300 ${
          showAddedMessage
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/15 bg-white px-5 py-3 font-black text-black shadow-2xl">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-sm text-white">
            ✓
          </span>

          Added to your cart
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 top-24 z-[102] w-[calc(100%-32px)] max-w-md -translate-x-1/2 transition duration-300 ${
          cartStockMessage
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500 px-5 py-4 text-center font-black text-black shadow-2xl">
          {cartStockMessage}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 top-24 z-[101] -translate-x-1/2 transition duration-300 ${
          showWishlistMessage
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 whitespace-nowrap rounded-full border border-white/15 bg-white px-5 py-3 font-black text-black shadow-2xl">
          <span className="text-xl">
            {isWishlisted
              ? "♥"
              : "♡"}
          </span>

          {showWishlistMessage}
        </div>
      </div>

      <section className="py-14 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
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

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                Screen-Free Fitness
                Tracker
              </p>

              {inventoryLoading ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-wider text-gray-400">
                  Checking Stock
                </span>
              ) : isAvailable ? (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    isLowStock
                      ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                      : "border-green-500/20 bg-green-500/10 text-green-400"
                  }`}
                >
                  {isLowStock
                    ? `Only ${stockQuantity} Left`
                    : "In Stock"}
                </span>
              ) : (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-300">
                  Out of Stock
                </span>
              )}
            </div>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              {PRODUCT_NAME}
            </h1>

            <a
              href="#customer-reviews"
              className="mt-5 flex w-fit flex-wrap items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 transition hover:border-white/25 hover:bg-white/10"
            >
              <div className="flex items-center gap-1 text-xl text-yellow-300">
                {renderStars(
                  reviewStatistics.averageRating
                )}
              </div>

              <strong className="text-sm">
                {reviewStatistics.averageRating >
                0
                  ? reviewStatistics.averageRating.toFixed(
                      1
                    )
                  : "No rating yet"}
              </strong>

              <span className="text-sm text-gray-500">
                (
                {
                  reviewStatistics.totalReviews
                }{" "}
                {reviewStatistics.totalReviews ===
                1
                  ? "review"
                  : "reviews"}
                )
              </span>
            </a>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              A lightweight screen-free
              tracker designed to monitor
              your daily activity, heart
              rate, sleep and recovery.
            </p>

            <div
              className={`mt-6 rounded-2xl border p-4 ${
                inventoryLoading
                  ? "border-white/10 bg-white/5"
                  : inventoryError
                    ? "border-red-500/20 bg-red-500/10"
                    : isAvailable
                      ? isLowStock
                        ? "border-orange-500/20 bg-orange-500/10"
                        : "border-green-500/20 bg-green-500/10"
                      : "border-red-500/20 bg-red-500/10"
              }`}
            >
              {inventoryLoading ? (
                <p className="font-bold text-gray-400">
                  Checking available
                  stock...
                </p>
              ) : inventoryError ? (
                <>
                  <p className="font-black text-red-300">
                    Stock information is
                    currently unavailable
                  </p>

                  <p className="mt-2 text-sm text-gray-400">
                    Please refresh the page
                    and try again.
                  </p>
                </>
              ) : isAvailable ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className={`font-black ${
                        isLowStock
                          ? "text-orange-300"
                          : "text-green-300"
                      }`}
                    >
                      {isLowStock
                        ? "Low Stock"
                        : "Available Now"}
                    </p>

                    <strong className="text-xl">
                      {stockQuantity}{" "}
                      {stockQuantity === 1
                        ? "piece"
                        : "pieces"}
                    </strong>
                  </div>

                  <p className="mt-2 text-sm text-gray-400">
                    The quantity selector
                    is limited to the
                    currently available
                    stock.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-black text-red-300">
                    Currently Out of Stock
                  </p>

                  <p className="mt-2 text-sm text-gray-400">
                    This product cannot be
                    added to the cart until
                    stock is available
                    again.
                  </p>
                </>
              )}
            </div>

            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              Choose your colour
            </p>

            <div className="mt-5 grid gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name ===
                  colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() =>
                      setSelectedColour(
                        colour
                      )
                    }
                    className={`flex items-center justify-between rounded-2xl border p-5 font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span
                        className={`h-6 w-6 rounded-full border ${
                          selected
                            ? "border-black/20"
                            : "border-white/20"
                        } ${colour.dot}`}
                      />

                      <span>
                        {colour.name}
                      </span>
                    </span>

                    <span>
                      {selected
                        ? "Selected"
                        : "Choose"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
                Quantity
              </p>

              <div className="mt-5 flex w-fit items-center rounded-full border border-white/15 bg-white/5 p-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  disabled={
                    inventoryLoading ||
                    !isAvailable ||
                    quantity <= 1
                  }
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-2xl transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>

                <span className="min-w-14 text-center text-xl font-black">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      (current) =>
                        Math.min(
                          stockQuantity,
                          current + 1
                        )
                    )
                  }
                  disabled={
                    inventoryLoading ||
                    !isAvailable ||
                    quantity >=
                      stockQuantity
                  }
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl text-black transition active:scale-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-600"
                >
                  +
                </button>
              </div>

              {!inventoryLoading &&
                isAvailable && (
                  <p className="mt-3 text-sm text-gray-500">
                    Maximum available:{" "}
                    {stockQuantity}
                  </p>
                )}
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-gray-300">
                  Product price
                </span>

                <strong className="text-2xl">
                  {PRODUCT_PRICE.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </strong>
              </div>

              {quantity > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <span className="text-sm text-gray-400">
                    Total for {quantity}{" "}
                    items
                  </span>

                  <strong>
                    {(
                      PRODUCT_PRICE *
                      quantity
                    ).toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </strong>
                </div>
              )}

              <p className="mt-4 text-sm leading-6 text-gray-400">
                Delivery fees will be
                calculated during checkout
                after selecting your
                governorate.
              </p>
            </div>

            <div className="mt-8 hidden grid-cols-[1fr_auto] gap-3 md:grid">
              <button
                type="button"
                onClick={addToCart}
                disabled={
                  inventoryLoading ||
                  Boolean(inventoryError) ||
                  !isAvailable
                }
                className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="h-6 w-6"
                >
                  <path
                    d="M3 4H5L7.2 14.2C7.4 15.2 8.3 16 9.4 16H17.7C18.7 16 19.6 15.3 19.9 14.3L21 8H6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M12 8V13M9.5 10.5H14.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>

                {inventoryLoading
                  ? "Checking Stock..."
                  : inventoryError
                    ? "Stock Unavailable"
                    : isAvailable
                      ? "Add to Cart"
                      : "Out of Stock"}
              </button>

              <button
                type="button"
                onClick={toggleWishlist}
                aria-label={
                  isWishlisted
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                className={`flex h-[68px] w-[68px] items-center justify-center rounded-full border text-3xl transition active:scale-95 ${
                  isWishlisted
                    ? "border-white bg-white text-black"
                    : "border-white/15 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {isWishlisted
                  ? "♥"
                  : "♡"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                "InstaPay on delivery",
                "Order tracking",
                "Official support",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center text-xs font-bold leading-5 text-gray-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
              The most important technical
              details, organised into simple
              cards.
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

                  <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

          <div className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-black">
              What’s in the box
            </h3>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                "Google Fitbit Air tracker",
                "Wristband",
                "USB-C charging cable",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-6 text-gray-600">
            Battery life, tracking accuracy
            and feature availability may
            vary depending on usage, phone
            compatibility and software
            version.
          </p>
        </div>
      </section>

      <section
        id="customer-reviews"
        className="scroll-mt-28 border-t border-white/10 bg-[#070707] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                Verified Customers
              </p>

              <h2 className="mt-5 text-4xl font-black sm:text-6xl">
                Customer Reviews
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
                Real feedback from
                customers who received
                their ORVIX order.
              </p>
            </div>

            <Link
              href="/leave-review"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
            >
              Leave a Review
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-gray-500">
                Average Rating
              </p>

              <p className="mt-3 text-4xl font-black">
                {reviewStatistics.averageRating >
                0
                  ? reviewStatistics.averageRating.toFixed(
                      1
                    )
                  : "—"}
              </p>

              <div className="mt-3 flex gap-1 text-xl text-yellow-300">
                {renderStars(
                  reviewStatistics.averageRating
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-gray-500">
                Customer Reviews
              </p>

              <p className="mt-3 text-4xl font-black">
                {
                  reviewStatistics.totalReviews
                }
              </p>

              <p className="mt-3 text-sm text-gray-400">
                Approved verified reviews
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-gray-500">
                Purchase Verification
              </p>

              <p className="mt-3 text-xl font-black text-green-300">
                Verified Orders Only
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Reviews can only be
                submitted using a
                delivered ORVIX order.
              </p>
            </div>
          </div>

          {reviewsLoading ? (
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="mt-4 text-gray-400">
                Loading customer reviews...
              </p>
            </div>
          ) : reviewsError ? (
            <div className="mt-10 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
              <p className="font-black">
                Could not load customer
                reviews
              </p>

              <p className="mt-2 text-sm leading-6 text-red-200/70">
                {reviewsError}
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-10 text-center">
              <div className="text-4xl text-yellow-300">
                ☆☆☆☆☆
              </div>

              <h3 className="mt-5 text-2xl font-black">
                No reviews yet
              </h3>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-gray-400">
                Delivered customers can
                submit the first verified
                review for this product.
              </p>

              <Link
                href="/leave-review"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
              >
                Leave the First Review
              </Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[32px] border border-white/10 bg-white/5 p-6 sm:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black">
                        {
                          review.customer_name
                        }
                      </h3>

                      <div className="mt-2 inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300">
                        ✓ Verified Purchase
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex gap-1 text-xl text-yellow-300">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <span key={star}>
                              {star <=
                              review.rating
                                ? "★"
                                : "☆"}
                            </span>
                          )
                        )}
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        {review.rating}/5
                      </p>
                    </div>
                  </div>

                  <p className="mt-6 whitespace-pre-wrap break-words text-base leading-8 text-gray-300">
                    “{review.review_text}”
                  </p>

                  <p className="mt-6 border-t border-white/10 pt-5 text-xs text-gray-600">
                    {formatReviewDate(
                      review.created_at
                    )}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:px-6 md:flex-row">
          <p>
            © 2026 ORVIX. All rights
            reserved.
          </p>

          <Link
            href="/#products"
            className="font-bold text-white"
          >
            View all products
          </Link>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-gray-400">
              {selectedColour.name} · Qty{" "}
              {quantity}
            </p>

            <p className="mt-1 text-lg font-black">
              {(
                PRODUCT_PRICE *
                quantity
              ).toLocaleString("en-GB")}{" "}
              EGP
            </p>

            {!inventoryLoading &&
              !inventoryError && (
                <p
                  className={`mt-1 text-xs font-bold ${
                    isAvailable
                      ? isLowStock
                        ? "text-orange-300"
                        : "text-green-300"
                      : "text-red-300"
                  }`}
                >
                  {isAvailable
                    ? `${stockQuantity} in stock`
                    : "Out of stock"}
                </p>
              )}
          </div>

          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={
              isWishlisted
                ? "Remove from wishlist"
                : "Add to wishlist"
            }
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-3xl transition active:scale-95 ${
              isWishlisted
                ? "border-white bg-white text-black"
                : "border-white/15 bg-white/5 text-white"
            }`}
          >
            {isWishlisted ? "♥" : "♡"}
          </button>

          <button
            type="button"
            onClick={addToCart}
            disabled={
              inventoryLoading ||
              Boolean(inventoryError) ||
              !isAvailable
            }
            className="shrink-0 rounded-full bg-white px-5 py-4 font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-600"
          >
            {inventoryLoading
              ? "Checking..."
              : inventoryError
                ? "Unavailable"
                : isAvailable
                  ? "Add to Cart"
                  : "Out of Stock"}
          </button>
        </div>
      </div>
    </main>
  );
}