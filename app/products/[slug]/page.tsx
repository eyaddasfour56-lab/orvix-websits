"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  TouchEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Navbar from "@/components/Navbar";
import {
  Language,
  useLanguage,
} from "@/components/LanguageProvider";

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

const copyByLanguage = {
  en: {
    priceComingSoon: "Price coming soon",
    comingSoon: "Coming Soon",
    outOfStock: "Out of Stock",
    onlyLeft: (count: number) =>
      `Only ${count} left`,
    availableNow: "Available Now",
    productNotFoundApi: "Product was not found.",
    loadError: "Could not load product.",
    addedToCart: (name: string) =>
      `${name} added to your cart.`,
    removedFromWishlist: (name: string) =>
      `${name} removed from your wishlist.`,
    addedToWishlist: (name: string) =>
      `${name} added to your wishlist.`,
    loading: "Loading product...",
    unavailableEyebrow: "Product unavailable",
    notFound: "Product not found",
    notFoundDescription:
      "This product does not exist or is currently hidden.",
    allProducts: "View All Products",
    back: "← Back to Products",
    previousImage: "Previous image",
    nextImage: "Next image",
    imageAlt: (name: string, index: number) =>
      `${name} image ${index}`,
    thumbnailAlt: (
      name: string,
      index: number
    ) => `${name} thumbnail ${index}`,
    viewImage: (index: number) =>
      `View image ${index}`,
    goToImage: (index: number) =>
      `Go to image ${index}`,
    swipe:
      "Swipe left or right to view more pictures",
    productDetails: "Product Details",
    quantity: "Quantity",
    piecesAvailable: (count: number) =>
      `${count} pieces currently available`,
    addToCart: "Add to Cart",
    comingSoonTitle:
      "This product is coming soon.",
    unavailableTitle:
      "This product is currently unavailable.",
    comingSoonDescription:
      "Follow ORVIX for availability updates and launch information.",
    unavailableDescription:
      "Purchasing will be enabled again when stock becomes available.",
    removeWishlist: "Remove from Wishlist",
    addWishlist: "Add to Wishlist",
    secureOrdering: "Secure Ordering",
    orderTracking: "Order Tracking",
    support: "ORVIX Support",
    rights: "All rights reserved.",
    exploreMore: "Explore More Products",
  },
  ar: {
    priceComingSoon: "السعر قريبًا",
    comingSoon: "قريبًا",
    outOfStock: "غير متوفر",
    onlyLeft: (count: number) =>
      `متبقي ${count.toLocaleString("ar-EG")} فقط`,
    availableNow: "متوفر الآن",
    productNotFoundApi:
      "لم يتم العثور على المنتج.",
    loadError: "تعذر تحميل المنتج.",
    addedToCart: (name: string) =>
      `تمت إضافة ${name} إلى سلة التسوق.`,
    removedFromWishlist: (name: string) =>
      `تمت إزالة ${name} من قائمة المفضلة.`,
    addedToWishlist: (name: string) =>
      `تمت إضافة ${name} إلى قائمة المفضلة.`,
    loading: "جارٍ تحميل المنتج...",
    unavailableEyebrow: "المنتج غير متاح",
    notFound: "لم يتم العثور على المنتج",
    notFoundDescription:
      "هذا المنتج غير موجود أو مخفي حاليًا.",
    allProducts: "عرض جميع المنتجات",
    back: "→ العودة إلى المنتجات",
    previousImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
    imageAlt: (name: string, index: number) =>
      `صورة ${name} رقم ${index.toLocaleString("ar-EG")}`,
    thumbnailAlt: (
      name: string,
      index: number
    ) =>
      `صورة مصغرة لـ ${name} رقم ${index.toLocaleString(
        "ar-EG"
      )}`,
    viewImage: (index: number) =>
      `عرض الصورة ${index.toLocaleString("ar-EG")}`,
    goToImage: (index: number) =>
      `الانتقال إلى الصورة ${index.toLocaleString(
        "ar-EG"
      )}`,
    swipe:
      "اسحب يمينًا أو يسارًا لمشاهدة صور أخرى",
    productDetails: "تفاصيل المنتج",
    quantity: "الكمية",
    piecesAvailable: (count: number) =>
      `${count.toLocaleString("ar-EG")} قطعة متوفرة حاليًا`,
    addToCart: "أضف إلى السلة",
    comingSoonTitle: "هذا المنتج سيتوفر قريبًا.",
    unavailableTitle:
      "هذا المنتج غير متاح حاليًا.",
    comingSoonDescription:
      "تابع ORVIX لمعرفة موعد التوفر وتفاصيل الإطلاق.",
    unavailableDescription:
      "سيتم تفعيل الشراء مرة أخرى عند توفر المنتج.",
    removeWishlist: "إزالة من المفضلة",
    addWishlist: "أضف إلى المفضلة",
    secureOrdering: "طلب آمن",
    orderTracking: "تتبّع الطلب",
    support: "دعم ORVIX",
    rights: "جميع الحقوق محفوظة.",
    exploreMore: "اكتشف منتجات أخرى",
  },
} as const;

function formatPrice(
  price: number,
  language: Language
) {
  if (price <= 0) {
    return copyByLanguage[language]
      .priceComingSoon;
  }

  return `${price.toLocaleString(
    language === "ar" ? "ar-EG" : "en-GB"
  )} ${language === "ar" ? "ج.م" : "EGP"}`;
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

function cleanImages(
  images: unknown,
  fallbackImage = ""
) {
  const imageList = Array.isArray(images)
    ? images
        .map((image) =>
          String(image || "").trim()
        )
        .filter(Boolean)
    : [];

  const uniqueImages = Array.from(
    new Set(imageList)
  );

  if (
    uniqueImages.length === 0 &&
    fallbackImage.trim()
  ) {
    return [fallbackImage.trim()];
  }

  if (uniqueImages.length === 0) {
    return ["/black.png"];
  }

  return uniqueImages;
}

function normaliseProduct(
  product: Product
): Product {
  const images = cleanImages(
    product.images,
    product.image
  );

  return {
    ...product,
    name: product.name || "",
    slug: product.slug || "",
    shortDescription:
      product.shortDescription || "",
    description:
      product.description || "",
    image: images[0] || "/black.png",
    images,
    price: Number(product.price || 0),
    stockQuantity: Number(
      product.stockQuantity || 0
    ),
    lowStockLimit: Number(
      product.lowStockLimit || 0
    ),
    showOnHomepage: Boolean(
      product.showOnHomepage
    ),
    allowWishlist: Boolean(
      product.allowWishlist
    ),
    allowPurchase: Boolean(
      product.allowPurchase
    ),
  };
}

function getStatusDetails(
  product: Product,
  language: Language
) {
  const copy = copyByLanguage[language];

  if (product.status === "coming_soon") {
    return {
      label: copy.comingSoon,
      classes:
        "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    };
  }

  if (
    product.status === "out_of_stock" ||
    product.stockQuantity <= 0
  ) {
    return {
      label: copy.outOfStock,
      classes:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (
    product.stockQuantity <=
    product.lowStockLimit
  ) {
    return {
      label: copy.onlyLeft(
        product.stockQuantity
      ),
      classes:
        "border-orange-500/30 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: copy.availableNow,
    classes:
      "border-green-500/30 bg-green-500/10 text-green-300",
  };
}

export default function DynamicProductPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];

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

  const [
    isInWishlist,
    setIsInWishlist,
  ] = useState(false);

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [
    touchStartX,
    setTouchStartX,
  ] = useState<number | null>(null);

  const [
    touchEndX,
    setTouchEndX,
  ] = useState<number | null>(null);

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

        const loadedProduct =
          normaliseProduct(
            result.product
          );

        setProduct(loadedProduct);
        setActiveImageIndex(0);
        setQuantity(1);
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

    const animationFrame =
      window.requestAnimationFrame(() => {
        void loadProduct();
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
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

    const animationFrame =
      window.requestAnimationFrame(() => {
        setIsInWishlist(
          wishlist.some(
            (item) =>
              item.id === product.id ||
              item.slug === product.slug
          )
        );
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, [product]);

  const productImages = useMemo(() => {
    if (!product) {
      return ["/black.png"];
    }

    return cleanImages(
      product.images,
      product.image
    );
  }, [product]);

  const activeImage =
    productImages[activeImageIndex] ||
    productImages[0] ||
    "/black.png";

  const statusDetails = useMemo(() => {
    if (!product) {
      return null;
    }

    return getStatusDetails(
      product,
      language
    );
  }, [language, product]);

  const canPurchase = Boolean(
    product &&
      product.status === "available" &&
      product.stockQuantity > 0 &&
      product.allowPurchase
  );

  function showPreviousImage() {
    setActiveImageIndex(
      (currentIndex) =>
        currentIndex === 0
          ? productImages.length - 1
          : currentIndex - 1
    );
  }

  function showNextImage() {
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
      event.targetTouches[0]
        .clientX
    );
  }

  function handleTouchMove(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(
      event.targetTouches[0]
        .clientX
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

    const minimumSwipeDistance = 50;

    if (
      swipeDistance >
      minimumSwipeDistance
    ) {
      showNextImage();
    }

    if (
      swipeDistance <
      -minimumSwipeDistance
    ) {
      showPreviousImage();
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
        image:
          productImages[0] ||
          product.image,
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
          productImages[0] ||
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
      copy.addedToCart(product.name)
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

    setMessage(
      alreadyAdded
        ? copy.removedFromWishlist(
            product.name
          )
        : copy.addedToWishlist(product.name)
    );
  }

  if (loading) {
    return (
      <main
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-[#070707] text-white"
      >
        <Navbar />

        <div className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="mt-5 text-gray-400">
              {copy.loading}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-[#070707] text-white"
      >
        <Navbar />

        <section className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="w-full max-w-xl rounded-[36px] border border-red-500/20 bg-red-500/10 p-8 text-center sm:p-12">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-red-300">
              {copy.unavailableEyebrow}
            </p>

            <h1 className="mt-5 text-4xl font-black">
              {copy.notFound}
            </h1>

            <p className="mt-5 leading-7 text-red-200/70">
              {language === "ar"
                ? copy.notFoundDescription
                : error || copy.notFoundDescription}
            </p>

            <Link
              href="/#products"
              className="mt-8 inline-flex rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
            >
              {copy.allProducts}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-white"
          >
            {copy.back}
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
                <Image
                  key={activeImage}
                  src={activeImage}
                  alt={copy.imageAlt(
                    product.name,
                    activeImageIndex + 1
                  )}
                  draggable={false}
                  width={900}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  unoptimized
                  className="aspect-square h-auto w-full animate-[fadeIn_250ms_ease-in-out] object-contain"
                />

                {productImages.length >
                  1 && (
                  <>
                    <button
                      type="button"
                      onClick={
                        showPreviousImage
                      }
                      aria-label={copy.previousImage}
                      className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-2xl font-black text-white backdrop-blur transition hover:scale-105 hover:bg-black sm:left-5"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={
                        showNextImage
                      }
                      aria-label={copy.nextImage}
                      className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/80 text-2xl font-black text-white backdrop-blur transition hover:scale-105 hover:bg-black sm:right-5"
                    >
                      ›
                    </button>

                    <span className="absolute bottom-4 right-4 rounded-full bg-black/80 px-4 py-2 text-xs font-black text-white backdrop-blur">
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
                          aria-label={copy.viewImage(
                            imageIndex + 1
                          )}
                          className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white p-2 transition ${
                            activeImageIndex ===
                            imageIndex
                              ? "border-white ring-2 ring-white"
                              : "border-white/15 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <Image
                            src={imageUrl}
                            alt={copy.thumbnailAlt(
                              product.name,
                              imageIndex + 1
                            )}
                            draggable={false}
                            width={160}
                            height={160}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    {productImages.map(
                      (_, imageIndex) => (
                        <button
                          key={imageIndex}
                          type="button"
                          onClick={() =>
                            setActiveImageIndex(
                              imageIndex
                            )
                          }
                          aria-label={copy.goToImage(
                            imageIndex + 1
                          )}
                          className={`h-2 rounded-full transition-all ${
                            activeImageIndex ===
                            imageIndex
                              ? "w-7 bg-white"
                              : "w-2 bg-white/25"
                          }`}
                        />
                      )
                    )}
                  </div>

                  <p className="mt-4 text-center text-xs font-semibold text-gray-500 sm:hidden">
                    {copy.swipe}
                  </p>
                </>
              )}
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
                  ? copy.comingSoon
                  : formatPrice(
                      product.price,
                      language
                    )}
              </p>

              {product.description && (
                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-gray-500">
                    {copy.productDetails}
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
                    {copy.quantity}
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
                    {copy.piecesAvailable(
                      product.stockQuantity
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={addToCart}
                    className="mt-7 w-full rounded-full bg-white px-7 py-5 text-lg font-black text-black transition hover:bg-gray-200"
                  >
                    {copy.addToCart}
                  </button>
                </div>
              ) : (
                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <h2 className="text-xl font-black">
                    {product.status ===
                    "coming_soon"
                      ? copy.comingSoonTitle
                      : copy.unavailableTitle}
                  </h2>

                  <p className="mt-3 leading-7 text-gray-400">
                    {product.status ===
                    "coming_soon"
                      ? copy.comingSoonDescription
                      : copy.unavailableDescription}
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
                    ? copy.removeWishlist
                    : copy.addWishlist}
                </button>
              )}

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    {copy.secureOrdering}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    {copy.orderTracking}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="font-black">
                    {copy.support}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-14 border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-start">
          <div>
            <p className="font-black tracking-[0.3em]">
              ORVIX
            </p>

            <p className="mt-2 text-sm text-gray-600">
              © 2026 ORVIX. {copy.rights}
            </p>
          </div>

          <Link
            href="/#products"
            className="text-sm font-bold text-gray-400 transition hover:text-white"
          >
            {copy.exploreMore}
          </Link>
        </div>
      </footer>
    </main>
  );
}
