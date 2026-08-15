"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type ProductStatus = "available" | "coming_soon" | "out_of_stock" | "hidden";

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  price: number;
  image?: string;
  status: ProductStatus;
  stockQuantity: number;
  allowPurchase: boolean;
};

type ApiResult = {
  success?: boolean;
  products?: Product[];
};

type Colour = "Black" | "Lavender" | "Berry";

const FITBIT_PRICE = 8500;
const colours: Array<{ name: Colour; className: string }> = [
  { name: "Black", className: "bg-[#161616]" },
  { name: "Lavender", className: "bg-[#b7a7d8]" },
  { name: "Berry", className: "bg-[#8c3157]" },
];

const copy = {
  en: {
    eyebrow: "ORVIX COLLECTION",
    title: "Smart technology. Carefully selected.",
    subtitle:
      "Discover our fitness technology through a cleaner, faster shopping experience.",
    available: "Available now",
    comingSoon: "Coming soon",
    outOfStock: "Out of stock",
    lowStock: "Limited stock",
    view: "View Product",
    quick: "Quick Order",
    colour: "Choose colour",
    quantity: "Quantity",
    continue: "Continue to Checkout",
    close: "Close",
    loading: "Loading products...",
    retry: "Try again",
    error: "Could not load products.",
    threeColours: "3 colours",
    selected: "Selected",
    price: "Price",
  },
  ar: {
    eyebrow: "مجموعة ORVIX",
    title: "تقنيات ذكية. مختارة بعناية.",
    subtitle:
      "اكتشف تقنيات اللياقة لدينا من خلال تجربة تسوق أبسط وأسرع.",
    available: "متوفر الآن",
    comingSoon: "قريبًا",
    outOfStock: "غير متوفر",
    lowStock: "الكمية محدودة",
    view: "شاهد المنتج",
    quick: "طلب سريع",
    colour: "اختر اللون",
    quantity: "الكمية",
    continue: "المتابعة لإتمام الطلب",
    close: "إغلاق",
    loading: "جارٍ تحميل المنتجات...",
    retry: "حاول مرة أخرى",
    error: "تعذر تحميل المنتجات.",
    threeColours: "3 ألوان",
    selected: "تم الاختيار",
    price: "السعر",
  },
} as const;

function formatPrice(value: number, language: "en" | "ar") {
  return `${value.toLocaleString(language === "ar" ? "ar-EG" : "en-GB")} EGP`;
}

function displayPrice(product: Product) {
  return product.slug === "google-fitbit-air" ? FITBIT_PRICE : Number(product.price || 0);
}

function canPurchase(product: Product) {
  return (
    product.status === "available" &&
    product.allowPurchase !== false &&
    product.stockQuantity > 0
  );
}

export default function HomepageProductsUpgrade() {
  const { language, isArabic } = useLanguage();
  const t = copy[language];
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);
  const [selectedColour, setSelectedColour] = useState<Colour>("Black");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (window.location.pathname !== "/") return;

    let cancelled = false;
    let frame = 0;
    let originalRoot: HTMLElement | null = null;
    let mount: HTMLDivElement | null = null;

    function attach() {
      if (cancelled) return;

      const section = document.getElementById("products");
      if (!section) {
        frame = window.requestAnimationFrame(attach);
        return;
      }

      originalRoot = section.firstElementChild as HTMLElement | null;
      if (originalRoot) {
        originalRoot.style.display = "none";
      }

      mount = document.createElement("div");
      mount.dataset.orvixHomepageProducts = "true";
      mount.className = "w-full";
      section.appendChild(mount);
      setHost(mount);
    }

    attach();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      setHost(null);
      mount?.remove();
      if (originalRoot) originalRoot.style.display = "";
    };
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/products?homepage=true", { cache: "no-store" });
      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !Array.isArray(result.products)) {
        throw new Error(t.error);
      }

      setProducts(result.products.filter((product) => product.status !== "hidden"));
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.location.pathname === "/") void loadProducts();
    // Language changes only alter copy; product data does not need to be reloaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!quickProduct) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [quickProduct]);

  const featured = useMemo(
    () => products.find((product) => product.slug === "google-fitbit-air") ?? products[0] ?? null,
    [products]
  );

  function openQuickOrder(product: Product) {
    setQuickProduct(product);
    setSelectedColour("Black");
    setQuantity(1);
  }

  function statusLabel(product: Product) {
    if (product.status === "coming_soon") return t.comingSoon;
    if (!canPurchase(product)) return t.outOfStock;
    if (product.stockQuantity <= 5) return t.lowStock;
    return t.available;
  }

  function statusClasses(product: Product) {
    if (product.status === "coming_soon") {
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";
    }
    if (!canPurchase(product)) {
      return "border-red-300/20 bg-red-400/10 text-red-100";
    }
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
  }

  if (!host) return null;

  return createPortal(
    <>
      <div
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="mx-auto max-w-7xl py-2 text-white"
      >
        <div className="mb-10 flex flex-col gap-5 sm:mb-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-blue-200/65">
              {t.eyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              {t.title}
            </h1>
          </div>
          <p className="max-w-md text-sm leading-7 text-white/45 sm:text-base">
            {t.subtitle}
          </p>
        </div>

        {loading && (
          <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-12 text-center text-white/50">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
            <p className="mt-4 font-bold">{t.loading}</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[34px] border border-red-400/15 bg-red-400/[0.06] p-8 text-center">
            <p className="font-black text-red-100">{error}</p>
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="mt-5 rounded-full bg-white px-6 py-3 text-sm font-black text-black"
            >
              {t.retry}
            </button>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {products.map((product) => {
              const isFeatured = featured?.id === product.id;
              const price = displayPrice(product);
              const purchasable = canPurchase(product);
              const fitbit = product.slug === "google-fitbit-air";

              return (
                <article
                  key={product.id}
                  className={`group relative overflow-hidden rounded-[34px] border bg-white/[0.035] transition duration-300 hover:-translate-y-1 hover:bg-white/[0.055] ${
                    isFeatured ? "border-blue-300/20" : "border-white/10"
                  }`}
                >
                  <div className="grid sm:grid-cols-[1.02fr_0.98fr]">
                    <Link
                      href={`/products/${product.slug}`}
                      className="relative flex min-h-[290px] items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[#f5f7fb] to-[#e8edf8] p-6 sm:min-h-[410px] sm:p-9"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.12),transparent_42%)]" />
                      <Image
                        src={product.image || "/black.png"}
                        alt={product.name}
                        width={720}
                        height={720}
                        priority={isFeatured}
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 30vw"
                        className="relative z-10 h-[245px] w-full object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.22)] transition duration-500 group-hover:scale-[1.035] sm:h-[340px]"
                      />

                      <span
                        className={`absolute left-4 top-4 z-20 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasses(product)}`}
                      >
                        {statusLabel(product)}
                      </span>
                    </Link>

                    <div className="flex flex-col justify-between p-6 sm:p-8">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">
                          {product.status === "coming_soon" ? t.comingSoon : "ORVIX SELECT"}
                        </p>
                        <Link href={`/products/${product.slug}`}>
                          <h2 className="mt-3 text-3xl font-black leading-none tracking-[-0.035em] transition group-hover:text-blue-100 sm:text-4xl">
                            {product.name}
                          </h2>
                        </Link>
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/45">
                          {product.shortDescription || product.description || t.subtitle}
                        </p>

                        {price > 0 && product.status !== "coming_soon" && (
                          <div className="mt-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                              {t.price}
                            </p>
                            <p className="mt-1 text-3xl font-black tracking-tight">
                              {formatPrice(price, language)}
                            </p>
                          </div>
                        )}

                        {fitbit && (
                          <div className="mt-5 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {colours.map((colour) => (
                                <span
                                  key={colour.name}
                                  title={colour.name}
                                  className={`h-4 w-4 rounded-full border border-white/20 shadow-sm ${colour.className}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-white/40">{t.threeColours}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-7 grid gap-2">
                        <Link
                          href={`/products/${product.slug}`}
                          className="flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-black transition hover:bg-white/[0.09]"
                        >
                          {t.view}
                        </Link>

                        {fitbit && purchasable && (
                          <button
                            type="button"
                            onClick={() => openQuickOrder(product)}
                            className="flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:scale-[1.01] hover:bg-blue-50 active:scale-95"
                          >
                            {t.quick}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {quickProduct &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setQuickProduct(null);
            }}
          >
            <div
              lang={language}
              dir={isArabic ? "rtl" : "ltr"}
              className="w-full rounded-t-[32px] border border-white/10 bg-[#0a0a0a] p-5 text-white shadow-[0_-30px_80px_rgba(0,0,0,0.55)] sm:max-w-lg sm:rounded-[32px] sm:p-7"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/60">
                    {t.quick}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{quickProduct.name}</h2>
                  <p className="mt-2 text-xl font-black">{formatPrice(FITBIT_PRICE, language)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickProduct(null)}
                  aria-label={t.close}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xl"
                >
                  ×
                </button>
              </div>

              <div className="mt-7">
                <p className="text-sm font-black">{t.colour}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {colours.map((colour) => {
                    const active = selectedColour === colour.name;
                    return (
                      <button
                        key={colour.name}
                        type="button"
                        onClick={() => setSelectedColour(colour.name)}
                        className={`rounded-2xl border px-3 py-4 text-xs font-black transition ${
                          active
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.035] text-white/65"
                        }`}
                      >
                        <span className={`mx-auto mb-2 block h-5 w-5 rounded-full border border-black/15 ${colour.className}`} />
                        {colour.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div>
                  <p className="text-sm font-black">{t.quantity}</p>
                  <p className="mt-1 text-xs text-white/35">1–10</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xl"
                  >
                    −
                  </button>
                  <span className="min-w-7 text-center text-lg font-black">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(10, current + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <Link
                href={`/checkout?colour=${encodeURIComponent(selectedColour)}&quantity=${quantity}`}
                className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-white px-6 py-4 text-center text-base font-black text-black transition hover:bg-blue-50 active:scale-[0.99]"
              >
                {t.continue}
              </Link>
            </div>
          </div>,
          document.body
        )}
    </>,
    host
  );
}
