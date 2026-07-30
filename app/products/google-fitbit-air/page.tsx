"use client";

import Link from "next/link";
import {
  FormEvent,
  TouchEvent,
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
  images: string[];
  status: ProductStatus;
  stockQuantity: number;
  lowStockLimit: number;
  allowWishlist: boolean;
  allowPurchase: boolean;
};

type ColourOption = {
  name: string;
  value: string;
  previewClass: string;
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  colour: string;
  quantity: number;
};

type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
};

type Review = {
  id: string;
  name?: string;
  customer_name?: string;
  rating: number;
  comment?: string;
  review?: string;
  status?: string;
  created_at?: string;
};

const colourOptions: ColourOption[] = [
  {
    name: "Black",
    value: "black",
    previewClass: "bg-black",
  },
  {
    name: "Lavender",
    value: "lavender",
    previewClass: "bg-[#b9a7d8]",
  },
  {
    name: "Berry",
    value: "berry",
    previewClass: "bg-[#8f3157]",
  },
];

const productFeatures = [
  {
    title: "Screen-free tracking",
    description:
      "Track your health and fitness without another distracting screen on your wrist.",
  },
  {
    title: "Heart-rate monitoring",
    description:
      "Follow daily heart-rate information and better understand your activity.",
  },
  {
    title: "Sleep tracking",
    description:
      "Review sleep duration and overnight health information through the connected app.",
  },
  {
    title: "Up to 7-day battery",
    description:
      "Spend less time charging and more time tracking your routine.",
  },
  {
    title: "Lightweight design",
    description:
      "Designed for comfortable everyday wear, workouts and sleep.",
  },
  {
    title: "Health insights",
    description:
      "Track useful wellness information including activity, SpO₂ and recovery trends.",
  },
];

const specifications = [
  {
    label: "Product",
    value: "Google Fitbit Air",
  },
  {
    label: "Display",
    value: "Screen-free design",
  },
  {
    label: "Battery life",
    value: "Up to 7 days",
  },
  {
    label: "Tracking",
    value:
      "Heart rate, activity, sleep and SpO₂",
  },
  {
    label: "Available colours",
    value: "Black, Lavender and Berry",
  },
  {
    label: "Connection",
    value: "Compatible mobile application",
  },
];

function formatPrice(price: number) {
  if (price <= 0) {
    return "Price coming soon";
  }

  return `${price.toLocaleString(
    "en-GB"
  )} EGP`;
}

function cleanImages(
  images: unknown,
  fallbackImage = ""
) {
  const uploadedImages = Array.isArray(images)
    ? images
        .map((image) =>
          String(image || "").trim()
        )
        .filter(Boolean)
    : [];

  const uniqueImages = Array.from(
    new Set(uploadedImages)
  );

  if (uniqueImages.length > 0) {
    return uniqueImages;
  }

  if (fallbackImage.trim()) {
    return [fallbackImage.trim()];
  }

  return ["/black.png"];
}

function readStorage<T>(
  key: string,
  fallback: T
): T {
  try {
    const savedValue =
      window.localStorage.getItem(key);

    if (!savedValue) {
      return fallback;
    }

    return JSON.parse(savedValue) as T;
  } catch {
    return fallback;
  }
}

function getReviewName(review: Review) {
  return (
    review.name ||
    review.customer_name ||
    "ORVIX Customer"
  );
}

function getReviewComment(review: Review) {
  return (
    review.comment ||
    review.review ||
    ""
  );
}

export default function GoogleFitbitAirPage() {
  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedColour, setSelectedColour] =
    useState("Black");

  const [quantity, setQuantity] =
    useState(1);

  const [activeImageIndex, setActiveImageIndex] =
    useState(0);

  const [touchStartX, setTouchStartX] =
    useState<number | null>(null);

  const [touchEndX, setTouchEndX] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">(
      ""
    );

  const [isInWishlist, setIsInWishlist] =
    useState(false);

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [reviewsLoading, setReviewsLoading] =
    useState(true);

  const [reviewName, setReviewName] =
    useState("");

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewComment, setReviewComment] =
    useState("");

  const [submittingReview, setSubmittingReview] =
    useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/products?slug=google-fitbit-air",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.product
        ) {
          throw new Error(
            result.message ||
              "Could not load Google Fitbit Air."
          );
        }

        const loadedProduct = {
          ...result.product,
          images: cleanImages(
            result.product.images,
            result.product.image
          ),
          image:
            cleanImages(
              result.product.images,
              result.product.image
            )[0] || "/black.png",
          price: Number(
            result.product.price || 0
          ),
          stockQuantity: Number(
            result.product.stockQuantity || 0
          ),
          lowStockLimit: Number(
            result.product.lowStockLimit || 0
          ),
          allowWishlist: Boolean(
            result.product.allowWishlist
          ),
          allowPurchase: Boolean(
            result.product.allowPurchase
          ),
        } satisfies Product;

        setProduct(loadedProduct);
        setActiveImageIndex(0);

        const wishlist =
          readStorage<WishlistItem[]>(
            "orvixWishlist",
            []
          );

        setIsInWishlist(
          wishlist.some(
            (item) =>
              item.id === loadedProduct.id ||
              item.slug ===
                loadedProduct.slug
          )
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the product."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, []);

  useEffect(() => {
    async function loadReviews() {
      setReviewsLoading(true);

      try {
        const response = await fetch(
          "/api/reviews?productSlug=google-fitbit-air",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          setReviews([]);
          return;
        }

        const result = await response.json();

        const loadedReviews = Array.isArray(
          result.reviews
        )
          ? result.reviews.filter(
              (review: Review) =>
                !review.status ||
                review.status === "approved"
            )
          : [];

        setReviews(loadedReviews);
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, []);

  const productImages = useMemo(
    () =>
      cleanImages(
        product?.images,
        product?.image
      ),
    [product]
  );

  const activeImage =
    productImages[activeImageIndex] ||
    productImages[0] ||
    "/black.png";

  const canPurchase = Boolean(
    product &&
      product.status === "available" &&
      product.stockQuantity > 0 &&
      product.allowPurchase
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  function showMessage(
    text: string,
    type: "success" | "error"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function previousImage() {
    setActiveImageIndex(
      (currentIndex) =>
        currentIndex === 0
          ? productImages.length - 1
          : currentIndex - 1
    );
  }

  function nextImage() {
    setActiveImageIndex(
      (currentIndex) =>
        currentIndex ===
        productImages.length - 1
          ? 0
          : currentIndex + 1
    );
  }

  function handleTouchStart(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(null);
    setTouchStartX(
      event.targetTouches[0].clientX
    );
  }

  function handleTouchMove(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(
      event.targetTouches[0].clientX
    );
  }

  function handleTouchEnd() {
    if (
      touchStartX === null ||
      touchEndX === null ||
      productImages.length <= 1
    ) {
      return;
    }

    const swipeDistance =
      touchStartX - touchEndX;

    if (swipeDistance > 50) {
      nextImage();
    }

    if (swipeDistance < -50) {
      previousImage();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }

  function changeQuantity(
    newQuantity: number
  ) {
    if (!product) {
      return;
    }

    setQuantity(
      Math.min(
        Math.max(newQuantity, 1),
        Math.max(
          product.stockQuantity,
          1
        )
      )
    );
  }

  function addToCart() {
    if (!product || !canPurchase) {
      showMessage(
        "This product is currently unavailable.",
        "error"
      );
      return;
    }

    const cart =
      readStorage<CartItem[]>(
        "orvixCart",
        []
      );

    const existingItemIndex =
      cart.findIndex(
        (item) =>
          item.id === product.id &&
          item.colour === selectedColour
      );

    if (existingItemIndex >= 0) {
      const currentItem =
        cart[existingItemIndex];

      cart[existingItemIndex] = {
        ...currentItem,
        quantity: Math.min(
          Number(currentItem.quantity || 1) +
            quantity,
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
          productImages[0] ||
          product.image ||
          "/black.png",
        colour: selectedColour,
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

    showMessage(
      `${product.name} in ${selectedColour} was added to your cart.`,
      "success"
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
      readStorage<WishlistItem[]>(
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
                productImages[0] ||
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

    showMessage(
      alreadyAdded
        ? "Product removed from your wishlist."
        : "Product added to your wishlist.",
      "success"
    );
  }

  async function submitReview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reviewName.trim()) {
      showMessage(
        "Please enter your name.",
        "error"
      );
      return;
    }

    if (
      reviewComment.trim().length < 5
    ) {
      showMessage(
        "Please write a longer review.",
        "error"
      );
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch(
        "/api/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productSlug:
              "google-fitbit-air",
            name: reviewName.trim(),
            rating: reviewRating,
            comment:
              reviewComment.trim(),
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
            "Could not submit review."
        );
      }

      setReviewName("");
      setReviewRating(5);
      setReviewComment("");

      showMessage(
        "Thank you. Your review was submitted for approval.",
        "success"
      );
    } catch (submitError) {
      showMessage(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit review.",
        "error"
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <Navbar />

        <div className="flex min-h-[75vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-5 text-gray-400">
              Loading Google Fitbit Air...
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
          <div className="max-w-xl rounded-[36px] border border-red-500/20 bg-red-500/10 p-10 text-center">
            <h1 className="text-4xl font-black">
              Product unavailable
            </h1>

            <p className="mt-5 text-red-200/70">
              {error}
            </p>

            <Link
              href="/#products"
              className="mt-7 inline-flex rounded-full bg-white px-7 py-4 font-black text-black"
            >
              Back to Products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] pb-28 text-white lg:pb-0">
      <Navbar />

      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/#products"
            className="text-sm font-bold text-gray-400 transition hover:text-white"
          >
            ← Back to Products
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <div
                onTouchStart={
                  handleTouchStart
                }
                onTouchMove={
                  handleTouchMove
                }
                onTouchEnd={
                  handleTouchEnd
                }
                className="relative touch-pan-y select-none overflow-hidden rounded-[40px] border border-white/10 bg-white p-6 sm:p-10"
              >
                <img
                  src={activeImage}
                  alt={`${product.name} ${
                    activeImageIndex + 1
                  }`}
                  draggable={false}
                  className="aspect-square h-auto w-full object-contain"
                />

                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousImage}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-3xl font-black text-white"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-3xl font-black text-white"
                    >
                      ›
                    </button>

                    <span className="absolute bottom-4 right-4 rounded-full bg-black/80 px-4 py-2 text-xs font-black">
                      {activeImageIndex + 1} /{" "}
                      {productImages.length}
                    </span>
                  </>
                )}
              </div>

              {productImages.length > 1 && (
                <>
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                    {productImages.map(
                      (
                        imageUrl,
                        imageIndex
                      ) => (
                        <button
                          key={`${imageUrl}-${imageIndex}`}
                          type="button"
                          onClick={() =>
                            setActiveImageIndex(
                              imageIndex
                            )
                          }
                          className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-white p-2 ${
                            activeImageIndex ===
                            imageIndex
                              ? "border-white ring-2 ring-white"
                              : "border-white/15 opacity-60"
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Thumbnail ${
                              imageIndex + 1
                            }`}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )
                    )}
                  </div>

                  <p className="mt-3 text-center text-xs font-semibold text-gray-500 sm:hidden">
                    Swipe left or right to
                    view more pictures
                  </p>
                </>
              )}
            </div>

            <div className="lg:sticky lg:top-28">
              <span
                className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                  canPurchase
                    ? product.stockQuantity <=
                      product.lowStockLimit
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
                      : "border-green-500/30 bg-green-500/10 text-green-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {canPurchase
                  ? product.stockQuantity <=
                    product.lowStockLimit
                    ? `Only ${product.stockQuantity} left`
                    : "Available Now"
                  : "Out of Stock"}
              </span>

              <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">
                {product.name}
              </h1>

              <p className="mt-6 text-xl leading-8 text-gray-300">
                {product.shortDescription ||
                  "Screen-free fitness tracking with heart rate, sleep, SpO₂ and up to seven days of battery life."}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <p className="text-3xl font-black">
                  {formatPrice(
                    product.price
                  )}
                </p>

                {reviews.length > 0 && (
                  <a
                    href="#reviews"
                    className="text-sm font-bold text-yellow-300"
                  >
                    ★{" "}
                    {averageRating.toFixed(
                      1
                    )}{" "}
                    ({reviews.length})
                  </a>
                )}
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">
                    Choose Colour
                  </p>

                  <p className="font-bold">
                    {selectedColour}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {colourOptions.map(
                    (colour) => {
                      const selected =
                        selectedColour ===
                        colour.name;

                      return (
                        <button
                          key={colour.value}
                          type="button"
                          onClick={() =>
                            setSelectedColour(
                              colour.name
                            )
                          }
                          className={`rounded-2xl border p-4 transition ${
                            selected
                              ? "border-white bg-white text-black"
                              : "border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className={`mx-auto block h-8 w-8 rounded-full border border-black/20 ${colour.previewClass}`}
                          />

                          <span className="mt-3 block text-sm font-black">
                            {colour.name}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {message && (
                <p
                  className={`mt-6 rounded-2xl border p-4 font-semibold ${
                    messageType === "success"
                      ? "border-green-500/20 bg-green-500/10 text-green-300"
                      : "border-red-500/20 bg-red-500/10 text-red-300"
                  }`}
                >
                  {message}
                </p>
              )}

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
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-2xl font-black"
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
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 text-2xl font-black"
                  >
                    +
                  </button>
                </div>

                <p className="mt-3 text-sm text-gray-500">
                  {product.stockQuantity}{" "}
                  pieces currently available
                </p>
              </div>

              <button
                type="button"
                onClick={addToCart}
                disabled={!canPurchase}
                className="mt-7 w-full rounded-full bg-white px-7 py-5 text-lg font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {canPurchase
                  ? "Add to Cart"
                  : "Currently Unavailable"}
              </button>

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
                {[
                  "Secure Ordering",
                  "Order Tracking",
                  "ORVIX Support",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center font-black"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
            PRODUCT DETAILS
          </p>

          <h2 className="mt-5 text-4xl font-black sm:text-6xl">
            Fitness tracking without
            distractions.
          </h2>

          <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-gray-400">
            {product.description ||
              "Google Fitbit Air combines everyday health tracking with a clean screen-free design. Wear it during daily activities, workouts and sleep to collect useful information without constant notifications."}
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {productFeatures.map(
              (feature, index) => (
                <article
                  key={feature.title}
                  className="rounded-[28px] border border-white/10 bg-black/30 p-7"
                >
                  <p className="text-sm font-black text-gray-600">
                    0{index + 1}
                  </p>

                  <h3 className="mt-5 text-2xl font-black">
                    {feature.title}
                  </h3>

                  <p className="mt-4 leading-7 text-gray-400">
                    {
                      feature.description
                    }
                  </p>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-sm uppercase tracking-[0.4em] text-gray-500">
            SPECIFICATIONS
          </p>

          <h2 className="mt-5 text-center text-4xl font-black sm:text-6xl">
            Product information
          </h2>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-white/10">
            {specifications.map(
              (specification) => (
                <div
                  key={
                    specification.label
                  }
                  className="grid gap-2 border-b border-white/10 bg-white/5 p-5 last:border-b-0 sm:grid-cols-[220px_1fr] sm:p-6"
                >
                  <p className="font-black text-gray-400">
                    {specification.label}
                  </p>

                  <p>
                    {specification.value}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section
        id="reviews"
        className="border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                CUSTOMER REVIEWS
              </p>

              <h2 className="mt-5 text-4xl font-black sm:text-5xl">
                Share your experience.
              </h2>

              <form
                onSubmit={submitReview}
                className="mt-8 rounded-[28px] border border-white/10 bg-black/30 p-6"
              >
                <label className="text-sm font-black">
                  Your Name
                </label>

                <input
                  type="text"
                  value={reviewName}
                  onChange={(event) =>
                    setReviewName(
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
                />

                <label className="mt-5 block text-sm font-black">
                  Rating
                </label>

                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map(
                    (rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() =>
                          setReviewRating(
                            rating
                          )
                        }
                        className={`text-3xl ${
                          rating <=
                          reviewRating
                            ? "text-yellow-300"
                            : "text-gray-700"
                        }`}
                      >
                        ★
                      </button>
                    )
                  )}
                </div>

                <label className="mt-5 block text-sm font-black">
                  Your Review
                </label>

                <textarea
                  value={reviewComment}
                  onChange={(event) =>
                    setReviewComment(
                      event.target.value
                    )
                  }
                  rows={5}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="mt-5 w-full rounded-full bg-white px-6 py-4 font-black text-black disabled:opacity-50"
                >
                  {submittingReview
                    ? "Submitting..."
                    : "Submit Review"}
                </button>
              </form>
            </div>

            <div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-5xl font-black">
                    {reviews.length > 0
                      ? averageRating.toFixed(
                          1
                        )
                      : "—"}
                  </p>

                  <p className="mt-2 text-yellow-300">
                    ★★★★★
                  </p>
                </div>

                <p className="text-gray-500">
                  {reviews.length} review
                  {reviews.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>

              <div className="mt-8 space-y-4">
                {reviewsLoading ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-400">
                    Loading reviews...
                  </div>
                ) : reviews.length ===
                  0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                    <h3 className="text-xl font-black">
                      No reviews yet
                    </h3>

                    <p className="mt-3 text-gray-400">
                      Be the first customer
                      to share a review.
                    </p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-black">
                          {getReviewName(
                            review
                          )}
                        </h3>

                        <p className="text-yellow-300">
                          {"★".repeat(
                            Math.max(
                              1,
                              Math.min(
                                5,
                                Number(
                                  review.rating ||
                                    5
                                )
                              )
                            )
                          )}
                        </p>
                      </div>

                      <p className="mt-4 leading-7 text-gray-300">
                        {getReviewComment(
                          review
                        )}
                      </p>

                      {review.created_at && (
                        <p className="mt-4 text-xs text-gray-600">
                          {new Date(
                            review.created_at
                          ).toLocaleDateString(
                            "en-GB"
                          )}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
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
            className="font-bold text-gray-400"
          >
            Explore More Products
          </Link>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {product.name}
            </p>

            <p className="text-sm text-gray-400">
              {formatPrice(
                product.price
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!canPurchase}
            className="rounded-full bg-white px-6 py-4 font-black text-black disabled:opacity-40"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  );
}