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
  shortDescription?: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  status: ProductStatus;
  stockQuantity: number;
  lowStockLimit: number;
  allowWishlist: boolean;
  allowPurchase: boolean;
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

type TechCategory = {
  title: string;
  icon: string;
  description?: string;
  items: string[];
};

const colours = [
  {
    name: "Black",
    value: "black",
    className: "bg-[#111111]",
  },
  {
    name: "Lavender",
    value: "lavender",
    className: "bg-[#b7a7d8]",
  },
  {
    name: "Berry",
    value: "berry",
    className: "bg-[#8c3157]",
  },
];

const features = [
  {
    number: "01",
    title: "Screen-free tracking",
    description:
      "Track your health and fitness without adding another distracting screen to your wrist.",
  },
  {
    number: "02",
    title: "Heart-rate monitoring",
    description:
      "Follow heart-rate information throughout the day and better understand your activity.",
  },
  {
    number: "03",
    title: "Sleep tracking",
    description:
      "Review sleep duration and overnight health information through the connected app.",
  },
  {
    number: "04",
    title: "Up to 7-day battery",
    description:
      "Spend less time charging and more time tracking your daily routine.",
  },
  {
    number: "05",
    title: "Lightweight design",
    description:
      "Designed for comfortable everyday wear, workouts and sleep.",
  },
  {
    number: "06",
    title: "Health insights",
    description:
      "Track useful wellness information including activity, SpO₂ and recovery trends.",
  },
];

const techCategories: TechCategory[] = [
  {
    title: "Memory",
    icon: "◫",
    description:
      "Detailed health information stays available between syncs.",
    items: [
      "Saves 7 days of detailed motion data, minute by minute",
      "Saves daily totals for the last 30 days",
      "Stores heart-rate data at 2-second intervals",
    ],
  },
  {
    title: "Battery & Power",
    icon: "ϟ",
    description:
      "Made to keep tracking through your daily routine.",
    items: [
      "Battery life of up to 7 days",
      "Charging time of approximately 90 minutes",
      "Quick charge provides up to one day of battery in around 5 minutes",
      "USB-C charging cable included",
      "Battery type: Lithium polymer",
      "Bluetooth 5.0 radio transceiver",
    ],
  },
  {
    title: "Materials",
    icon: "◇",
    items: [
      "Air housing made with recycled polycarbonate and PBT plastics",
      "Band made from flexible silicone material",
      "Packaging uses fibre-based and recyclable materials",
      "Lightweight construction designed for all-day comfort",
    ],
  },
  {
    title: "Sensors & Components",
    icon: "◎",
    items: [
      "Optical heart-rate monitor",
      "Three-axis accelerometer",
      "Gyroscope",
      "Red and infrared sensors for oxygen-saturation monitoring",
      "Temperature sensor",
      "Ambient-light sensor",
      "Vibration motor",
    ],
  },
  {
    title: "Band Size",
    icon: "⌁",
    items: [
      "One-size textile and polyurethane band",
      "Fits wrists approximately 140–210 mm around",
      "Small wrist size: approximately 130–175 mm",
      "Large wrist size: approximately 165–210 mm",
      "Silicone band included",
    ],
  },
  {
    title: "Water Resistance",
    icon: "≈",
    items: [
      "Water-resistant up to 50 metres",
      "Suitable for daily wear and light water exposure",
      "Dry the band completely before wearing again",
      "Not intended for high-speed or deep-water activities",
    ],
  },
  {
    title: "Heart Rate",
    icon: "♥",
    items: [
      "Continuous optical heart-rate tracking",
      "Heart-rate accuracy can vary by physiology and placement",
      "Results may also vary with movement and environmental conditions",
      "Designed for general wellness and fitness information",
    ],
  },
  {
    title: "Care",
    icon: "✦",
    items: [
      "Remove the band occasionally and allow your skin to breathe",
      "Clean the band gently after workouts or water exposure",
      "Dry the tracker and band completely before wearing",
      "Avoid harsh chemicals, abrasive materials and strong cleaners",
    ],
  },
  {
    title: "Dimensions",
    icon: "↔",
    items: [
      "Length: approximately 1.4 in / 34.9 mm",
      "Width: approximately 0.7 in / 17 mm",
      "Height: approximately 0.3 in / 8.3 mm",
      "Compact screen-free tracker body",
    ],
  },
  {
    title: "Weight",
    icon: "●",
    items: [
      "Tracker weight without band: approximately 5.2 g",
      "Total weight with band: approximately 12 g",
      "Designed for comfortable day and night wear",
    ],
  },
  {
    title: "Compatibility",
    icon: "⌘",
    items: [
      "Google Account required",
      "Google Health application required",
      "Compatible with most supported Android and iOS smartphones",
      "Android 11.0 or later recommended",
      "iOS 16.4 or later recommended",
      "Bluetooth Low Energy connection required",
      "Internet connection and location permissions may be required",
      "Maximum syncing range is approximately 30 ft",
    ],
  },
  {
    title: "Safety Information",
    icon: "!",
    items: [
      "This product is intended for general wellness use",
      "Health information should not replace professional medical advice",
      "Stop using the product if skin irritation develops",
      "Read all product and safety documentation before use",
      "Keep the charging cable and small components away from young children",
    ],
  },
  {
    title: "What’s in the Box",
    icon: "□",
    items: [
      "Google Fitbit Air tracker",
      "Wristband",
      "USB-C charging cable",
      "Quick-start and safety information",
    ],
  },
];

function formatPrice(price: number) {
  if (!price || price <= 0) {
    return "Price coming soon";
  }

  return `${price.toLocaleString("en-GB")} EGP`;
}

function cleanImages(images: unknown, fallbackImage = "") {
  const imageList = Array.isArray(images)
    ? images
        .map((image) => String(image || "").trim())
        .filter(Boolean)
    : [];

  const uniqueImages = Array.from(new Set(imageList));

  if (uniqueImages.length > 0) {
    return uniqueImages;
  }

  if (fallbackImage.trim()) {
    return [fallbackImage.trim()];
  }

  return ["/black.png"];
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function getReviewName(review: Review) {
  return review.name || review.customer_name || "ORVIX Customer";
}

function getReviewComment(review: Review) {
  return review.comment || review.review || "";
}

export default function GoogleFitbitAirPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [selectedColour, setSelectedColour] = useState("Black");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [touchStartX, setTouchStartX] = useState<number | null>(
    null
  );
  const [touchEndX, setTouchEndX] = useState<number | null>(
    null
  );

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const [isInWishlist, setIsInWishlist] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "overview" | "specifications" | "reviews"
  >("overview");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] =
    useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setPageError("");

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
              "Google Fitbit Air could not be loaded."
          );
        }

        const images = cleanImages(
          result.product.images,
          result.product.image
        );

        const loadedProduct: Product = {
          ...result.product,
          images,
          image: images[0] || "/black.png",
          price: Number(result.product.price || 0),
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
        };

        setProduct(loadedProduct);
        setActiveImageIndex(0);

        const wishlist = readStorage<WishlistItem[]>(
          "orvixWishlist",
          []
        );

        setIsInWishlist(
          wishlist.some(
            (item) =>
              item.id === loadedProduct.id ||
              item.slug === loadedProduct.slug
          )
        );
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "The product could not be loaded."
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

        const reviewList = Array.isArray(result.reviews)
          ? result.reviews.filter(
              (review: Review) =>
                !review.status || review.status === "approved"
            )
          : [];

        setReviews(reviewList);
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, []);

  const productImages = useMemo(
    () => cleanImages(product?.images, product?.image),
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
      (sum, review) => sum + Number(review.rating || 0),
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

    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4500);
  }

  function previousImage() {
    setActiveImageIndex((current) =>
      current === 0 ? productImages.length - 1 : current - 1
    );
  }

  function nextImage() {
    setActiveImageIndex((current) =>
      current === productImages.length - 1 ? 0 : current + 1
    );
  }

  function handleTouchStart(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(null);
    setTouchStartX(event.targetTouches[0].clientX);
  }

  function handleTouchMove(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(event.targetTouches[0].clientX);
  }

  function handleTouchEnd() {
    if (
      touchStartX === null ||
      touchEndX === null ||
      productImages.length <= 1
    ) {
      return;
    }

    const distance = touchStartX - touchEndX;

    if (distance > 50) {
      nextImage();
    } else if (distance < -50) {
      previousImage();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }

  function updateQuantity(value: number) {
    if (!product) {
      return;
    }

    setQuantity(
      Math.min(
        Math.max(value, 1),
        Math.max(product.stockQuantity, 1)
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

    const cart = readStorage<CartItem[]>("orvixCart", []);

    const existingIndex = cart.findIndex(
      (item) =>
        item.id === product.id &&
        item.colour === selectedColour
    );

    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity: Math.min(
          Number(cart[existingIndex].quantity || 1) + quantity,
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
          productImages[0] || product.image || "/black.png",
        colour: selectedColour,
        quantity: Math.min(quantity, product.stockQuantity),
      });
    }

    window.localStorage.setItem(
      "orvixCart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(
      new CustomEvent("orvix-cart-updated")
    );

    showMessage(
      `${product.name} in ${selectedColour} was added to your cart.`,
      "success"
    );
  }

  function toggleWishlist() {
    if (!product || !product.allowWishlist) {
      return;
    }

    const wishlist = readStorage<WishlistItem[]>(
      "orvixWishlist",
      []
    );

    const alreadyAdded = wishlist.some(
      (item) =>
        item.id === product.id || item.slug === product.slug
    );

    const updatedWishlist = alreadyAdded
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

    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(
      new CustomEvent("orvix-wishlist-updated")
    );

    setIsInWishlist(!alreadyAdded);

    showMessage(
      alreadyAdded
        ? "Removed from your wishlist."
        : "Added to your wishlist.",
      "success"
    );
  }

  async function submitReview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reviewName.trim()) {
      showMessage("Please enter your name.", "error");
      return;
    }

    if (reviewComment.trim().length < 5) {
      showMessage(
        "Please write a slightly longer review.",
        "error"
      );
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug: "google-fitbit-air",
          name: reviewName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Review could not be submitted."
        );
      }

      setReviewName("");
      setReviewRating(5);
      setReviewComment("");

      showMessage(
        "Your review was submitted for approval.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Review could not be submitted.",
        "error"
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  function scrollToSection(
    section:
      | "overview"
      | "specifications"
      | "reviews"
  ) {
    setActiveSection(section);

    document
      .getElementById(section)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <Navbar />

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-white" />

            <p className="mt-5 text-sm font-semibold text-white/45">
              Loading Google Fitbit Air...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (pageError || !product) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <Navbar />

        <section className="flex min-h-[80vh] items-center justify-center px-5">
          <div className="max-w-lg rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
              Product unavailable
            </p>

            <h1 className="mt-4 text-3xl font-black">
              We couldn’t load this product.
            </h1>

            <p className="mt-4 leading-7 text-red-100/60">
              {pageError}
            </p>

            <Link
              href="/#products"
              className="mt-7 inline-flex rounded-full bg-white px-7 py-4 font-black text-black"
            >
              Back to products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] pb-28 text-white lg:pb-0">
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"
          >
            <span>←</span>
            Back to products
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="group relative touch-pan-y select-none overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-b from-white to-[#e9e9e9] p-5 shadow-2xl shadow-black/30 sm:p-10"
              >
                <img
                  src={activeImage}
                  alt={`${product.name} image ${
                    activeImageIndex + 1
                  }`}
                  draggable={false}
                  className="aspect-square h-auto w-full object-contain transition duration-500 group-hover:scale-[1.02]"
                />

                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={previousImage}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/75 text-2xl font-black text-white backdrop-blur transition hover:bg-black sm:left-5"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/75 text-2xl font-black text-white backdrop-blur transition hover:bg-black sm:right-5"
                    >
                      ›
                    </button>

                    <div className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/75 px-4 py-2 text-xs font-black text-white backdrop-blur">
                      {activeImageIndex + 1} /{" "}
                      {productImages.length}
                    </div>
                  </>
                )}
              </div>

              {productImages.length > 1 && (
                <>
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                    {productImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() =>
                          setActiveImageIndex(index)
                        }
                        className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-2 transition sm:h-24 sm:w-24 ${
                          activeImageIndex === index
                            ? "border-white ring-2 ring-white/60"
                            : "border-white/10 opacity-50 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Product thumbnail ${
                            index + 1
                          }`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-center text-xs font-semibold text-white/35 sm:hidden">
                    Swipe left or right to see more images
                  </p>
                </>
              )}
            </div>

            <div className="lg:sticky lg:top-28">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] ${
                    canPurchase
                      ? product.stockQuantity <=
                        product.lowStockLimit
                        ? "border-orange-400/20 bg-orange-400/10 text-orange-300"
                        : "border-green-400/20 bg-green-400/10 text-green-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300"
                  }`}
                >
                  {canPurchase
                    ? product.stockQuantity <=
                      product.lowStockLimit
                      ? `Only ${product.stockQuantity} left`
                      : "Available now"
                    : "Out of stock"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
                  Screen-free tracker
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                {product.name}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
                {product.shortDescription ||
                  "A lightweight screen-free tracker designed to monitor daily activity, heart rate, sleep and recovery."}
              </p>

              <div className="mt-7 flex flex-wrap items-end gap-4">
                <p className="text-3xl font-black sm:text-4xl">
                  {formatPrice(product.price)}
                </p>

                {reviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      scrollToSection("reviews")
                    }
                    className="pb-1 text-sm font-black text-yellow-300"
                  >
                    ★ {averageRating.toFixed(1)} ·{" "}
                    {reviews.length} reviews
                  </button>
                )}
              </div>

              <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                    Choose colour
                  </p>

                  <p className="font-black">
                    {selectedColour}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {colours.map((colour) => {
                    const selected =
                      selectedColour === colour.name;

                    return (
                      <button
                        key={colour.value}
                        type="button"
                        onClick={() =>
                          setSelectedColour(colour.name)
                        }
                        className={`rounded-2xl border p-3 transition sm:p-4 ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-black/30 text-white hover:border-white/30"
                        }`}
                      >
                        <span
                          className={`mx-auto block h-8 w-8 rounded-full border border-black/15 shadow-inner ${colour.className}`}
                        />

                        <span className="mt-3 block text-xs font-black sm:text-sm">
                          {colour.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                      Quantity
                    </p>

                    <p className="mt-2 text-sm text-white/45">
                      {product.stockQuantity} pieces available
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(quantity - 1)
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-black transition hover:bg-white/10"
                    >
                      −
                    </button>

                    <span className="min-w-10 text-center text-lg font-black">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(quantity + 1)
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-black transition hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {message && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
                    messageType === "success"
                      ? "border-green-400/20 bg-green-400/10 text-green-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!canPurchase}
                  className="rounded-full bg-white px-7 py-5 text-base font-black text-black transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {canPurchase
                    ? "Add to cart"
                    : "Currently unavailable"}
                </button>

                {product.allowWishlist && (
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    aria-label="Toggle wishlist"
                    className="flex h-[64px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 text-sm font-black transition hover:bg-white/10 sm:w-[64px] sm:px-0"
                  >
                    <span className="sm:hidden">
                      {isInWishlist
                        ? "Remove from wishlist"
                        : "Add to wishlist"}
                    </span>

                    <span className="hidden text-2xl sm:block">
                      {isInWishlist ? "♥" : "♡"}
                    </span>
                  </button>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  ["Secure", "Checkout"],
                  ["Fast", "Support"],
                  ["Easy", "Tracking"],
                ].map(([top, bottom]) => (
                  <div
                    key={`${top}-${bottom}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center"
                  >
                    <p className="text-xs font-black">
                      {top}
                    </p>

                    <p className="mt-1 text-[11px] text-white/35">
                      {bottom}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-y border-white/10 bg-[#080808]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5">
          {[
            {
              key: "overview" as const,
              label: "Overview",
            },
            {
              key: "specifications" as const,
              label: "Tech Specs",
            },
            {
              key: "reviews" as const,
              label: "Reviews",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => scrollToSection(tab.key)}
              className={`flex-1 rounded-full px-4 py-3 text-xs font-black transition sm:text-sm ${
                activeSection === tab.key
                  ? "bg-white text-black"
                  : "text-white/45 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section
        id="overview"
        className="scroll-mt-40 border-b border-white/10 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
              Product details
            </p>

            <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              Fitness tracking without distractions.
            </h2>

            <p className="mt-6 max-w-3xl whitespace-pre-line text-lg leading-8 text-white/50">
              {product.description ||
                "Google Fitbit Air combines useful everyday health tracking with a lightweight screen-free design. Wear it through daily activities, workouts and sleep to collect helpful information without constant notifications."}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.055] to-white/[0.018] p-7 transition duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black tracking-[0.2em] text-white/25">
                    {feature.number}
                  </p>

                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/30">
                    ↗
                  </span>
                </div>

                <h3 className="mt-8 text-2xl font-black tracking-[-0.02em]">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-white/45">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="specifications"
        className="scroll-mt-40 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
              Technical specifications
            </p>

            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
              Everything, neatly organised.
            </h2>

            <p className="mt-5 text-lg leading-8 text-white/45">
              Explore product measurements, materials,
              sensors, compatibility, battery information
              and everything included in the box.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-5 md:grid-cols-2">
            {techCategories.map((category) => (
              <article
                key={category.title}
                className="rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.018] p-6 shadow-xl shadow-black/10 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-white/70">
                    {category.icon}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.02em]">
                      {category.title}
                    </h3>

                    {category.description && (
                      <p className="mt-2 text-sm leading-6 text-white/40">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {category.items.map((item) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4"
                    >
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />

                      <p className="text-sm leading-6 text-white/55">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/30">
              Important note
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-white/40">
              Battery life, sensor readings and performance
              can vary depending on usage, settings,
              environment and device condition. Product
              specifications may be updated by the
              manufacturer.
            </p>
          </div>
        </div>
      </section>

      <section
        id="reviews"
        className="scroll-mt-40 border-t border-white/10 bg-white/[0.018] px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
                Customer reviews
              </p>

              <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Share your experience.
              </h2>

              <p className="mt-5 max-w-md leading-7 text-white/45">
                Tell other customers what you liked about
                the product and how it worked for you.
              </p>

              <form
                onSubmit={submitReview}
                className="mt-8 rounded-[30px] border border-white/10 bg-black/30 p-6"
              >
                <label className="text-sm font-black">
                  Your name
                </label>

                <input
                  type="text"
                  value={reviewName}
                  onChange={(event) =>
                    setReviewName(event.target.value)
                  }
                  placeholder="Enter your name"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/35"
                />

                <label className="mt-6 block text-sm font-black">
                  Rating
                </label>

                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setReviewRating(rating)
                      }
                      aria-label={`${rating} star rating`}
                      className={`text-3xl transition ${
                        rating <= reviewRating
                          ? "text-yellow-300"
                          : "text-white/15"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <label className="mt-6 block text-sm font-black">
                  Your review
                </label>

                <textarea
                  value={reviewComment}
                  onChange={(event) =>
                    setReviewComment(event.target.value)
                  }
                  placeholder="What did you think about the product?"
                  rows={5}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-white outline-none transition placeholder:text-white/20 focus:border-white/35"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="mt-5 w-full rounded-full bg-white px-6 py-4 font-black text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {submittingReview
                    ? "Submitting..."
                    : "Submit review"}
                </button>
              </form>
            </div>

            <div>
              <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <p className="text-6xl font-black tracking-[-0.05em]">
                      {reviews.length > 0
                        ? averageRating.toFixed(1)
                        : "—"}
                    </p>

                    <p className="mt-2 tracking-[0.18em] text-yellow-300">
                      ★★★★★
                    </p>
                  </div>

                  <p className="text-sm font-bold text-white/35">
                    {reviews.length} review
                    {reviews.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {reviewsLoading ? (
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.025] p-8 text-white/40">
                    Loading reviews...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.025] p-8">
                    <h3 className="text-xl font-black">
                      No reviews yet
                    </h3>

                    <p className="mt-3 text-white/40">
                      Be the first customer to leave a review.
                    </p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-[30px] border border-white/10 bg-white/[0.025] p-6 sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-black">
                            {getReviewName(review)}
                          </h3>

                          {review.created_at && (
                            <p className="mt-1 text-xs text-white/25">
                              {new Date(
                                review.created_at
                              ).toLocaleDateString("en-GB")}
                            </p>
                          )}
                        </div>

                        <p className="text-sm tracking-[0.12em] text-yellow-300">
                          {"★".repeat(
                            Math.max(
                              1,
                              Math.min(
                                5,
                                Number(review.rating || 5)
                              )
                            )
                          )}
                        </p>
                      </div>

                      <p className="mt-5 leading-7 text-white/55">
                        {getReviewComment(review)}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-black tracking-[0.35em]">
              ORVIX
            </p>

            <p className="mt-2 text-xs text-white/25">
              © 2026 ORVIX. All rights reserved.
            </p>
          </div>

          <Link
            href="/#products"
            className="text-sm font-black text-white/45 transition hover:text-white"
          >
            Explore more products →
          </Link>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 p-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {product.name}
            </p>

            <p className="mt-1 text-xs text-white/45">
              {formatPrice(product.price)}
            </p>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!canPurchase}
            className="rounded-full bg-white px-6 py-4 text-sm font-black text-black disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>
      </div>
    </main>
  );
}
