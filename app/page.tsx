"use client";

import Image from "next/image";
import Link from "next/link";
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

const benefits = [
  {
    number: "01",
    title: "Carefully Selected",
    description:
      "We focus on smart fitness technology that offers useful features, reliable performance and a clean design.",
  },
  {
    number: "02",
    title: "Simple Ordering",
    description:
      "Choose your product, colour and delivery area, then complete your order securely through our website.",
  },
  {
    number: "03",
    title: "Order Tracking",
    description:
      "Use your order number and phone number to check the latest status of your ORVIX order at any time.",
  },
];

const frequentlyAskedQuestions = [
  {
    question: "How can I place an order?",
    answer:
      "Open an available product, select your preferred options and quantity, add it to your cart, then complete the checkout form.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Open the Track Order page and enter the order number and phone number used during checkout. Your current order status will appear immediately.",
  },
  {
    question:
      "Where can I find my order number?",
    answer:
      "Your order number appears on the confirmation page after checkout and is also sent to the email address used during your order.",
  },
  {
    question:
      "What payment method is available?",
    answer:
      "Payment is completed through InstaPay when your order arrives. No advance payment is required.",
  },
  {
    question:
      "How much does delivery cost?",
    answer:
      "Delivery fees depend on your selected area and are calculated automatically during checkout before you place the order.",
  },
  {
    question:
      "Can I use a discount code?",
    answer:
      "Yes. Enter an active discount code in the order summary during checkout. The discount will appear before you submit the order.",
  },
  {
    question:
      "What happens when a product is out of stock?",
    answer:
      "The product remains visible, but purchasing is disabled until new stock is added.",
  },
  {
    question:
      "How can I get notified about coming-soon products?",
    answer:
      "Open the coming-soon product and complete its notification form when one is available.",
  },
  {
    question: "How can I contact ORVIX?",
    answer:
      "You can contact ORVIX through our official Instagram account. Include your order number when asking about an existing order.",
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

function getProductHref(product: Product) {
  return `/products/${encodeURIComponent(
    product.slug
  )}`;
}

function getStatusLabel(product: Product) {
  if (
    product.status === "available" &&
    product.stockQuantity <= 0
  ) {
    return "Out of stock";
  }

  if (product.status === "available") {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return `Only ${product.stockQuantity} left`;
    }

    return "Available now";
  }

  if (product.status === "coming_soon") {
    return "Coming soon";
  }

  if (
    product.status === "out_of_stock"
  ) {
    return "Out of stock";
  }

  return "Hidden";
}

function getStatusClasses(
  product: Product
) {
  if (
    product.status === "available" &&
    product.stockQuantity > 0
  ) {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return "text-orange-300";
    }

    return "text-green-400";
  }

  if (product.status === "coming_soon") {
    return "text-yellow-300";
  }

  return "text-red-300";
}

function getBadgeClasses(
  product: Product
) {
  if (
    product.status === "available" &&
    product.stockQuantity > 0
  ) {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return "border-orange-500/20 bg-orange-500/90 text-black";
    }

    return "border-green-500/20 bg-green-500/90 text-black";
  }

  if (product.status === "coming_soon") {
    return "border-yellow-500/20 bg-yellow-400 text-black";
  }

  return "border-red-500/20 bg-red-500 text-white";
}

function getButtonText(product: Product) {
  if (product.status === "coming_soon") {
    if (product.slug === "garmin-cirqa") {
      return "Notify Me When Available";
    }

    return "View Coming Soon Product";
  }

  if (
    product.status === "out_of_stock" ||
    product.stockQuantity <= 0 ||
    !product.allowPurchase
  ) {
    return "View Product";
  }

  return "View Product";
}

function getButtonClasses(
  product: Product
) {
  const canPurchase =
    product.status === "available" &&
    product.stockQuantity > 0 &&
    product.allowPurchase;

  if (canPurchase) {
    return "bg-white text-black hover:bg-gray-200";
  }

  if (product.status === "coming_soon") {
    return "border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20";
  }

  return "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10";
}

export default function Home() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await fetch(
        "/api/products?homepage=true",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load products."
        );
      }

      setProducts(
        Array.isArray(result.products)
          ? result.products
          : []
      );
    } catch (error) {
      setProductsError(
        error instanceof Error
          ? error.message
          : "Could not load products."
      );
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const firstProduct = useMemo(
    () => products[0] || null,
    [products]
  );

  const garminProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.slug === "garmin-cirqa"
      ) || null,
    [products]
  );

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      {/* Products */}
      <section
        id="products"
        className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.45em] text-gray-500">
              ORVIX COLLECTION
            </p>

            <h1 className="mt-5 text-5xl font-black sm:text-7xl">
              OUR PRODUCTS
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              Explore our fitness technology
              and choose the product that fits
              your lifestyle.
            </p>
          </div>

          {productsLoading ? (
            <div className="mt-14 rounded-[36px] border border-white/10 bg-white/5 p-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="mt-5 font-bold text-gray-400">
                Loading products...
              </p>
            </div>
          ) : productsError ? (
            <div className="mt-14 rounded-[36px] border border-red-500/20 bg-red-500/10 p-8 text-center">
              <h2 className="text-2xl font-black text-red-300">
                Could not load products
              </h2>

              <p className="mt-3 text-red-200/70">
                {productsError}
              </p>

              <button
                type="button"
                onClick={loadProducts}
                className="mt-6 rounded-full bg-white px-7 py-4 font-black text-black"
              >
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="mt-14 rounded-[36px] border border-white/10 bg-white/5 p-12 text-center">
              <h2 className="text-2xl font-black">
                No products available
              </h2>

              <p className="mt-3 text-gray-400">
                New ORVIX products will appear
                here soon.
              </p>
            </div>
          ) : (
            <div className="mt-14 grid gap-8 lg:grid-cols-2">
              {products.map(
                (product, index) => {
                  const productHref =
                    getProductHref(product);

                  return (
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-5 transition duration-300 hover:-translate-y-1 hover:border-white/25 sm:p-7"
                    >
                      <Link
                        href={productHref}
                        className="block"
                      >
                        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[32px] bg-white p-6">
                          <Image
                            src={
                              product.image ||
                              "/black.png"
                            }
                            alt={product.name}
                            width={700}
                            height={700}
                            priority={index < 2}
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                          />

                          <span
                            className={`absolute right-4 top-4 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${getBadgeClasses(
                              product
                            )}`}
                          >
                            {getStatusLabel(
                              product
                            )}
                          </span>
                        </div>
                      </Link>

                      <div className="px-2 pb-2 pt-7">
                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <p
                              className={`text-sm font-black uppercase tracking-[0.3em] ${getStatusClasses(
                                product
                              )}`}
                            >
                              {getStatusLabel(
                                product
                              )}
                            </p>

                            <Link
                              href={
                                productHref
                              }
                              className="block"
                            >
                              <h2 className="mt-3 text-3xl font-black transition group-hover:text-gray-200 sm:text-4xl">
                                {
                                  product.name
                                }
                              </h2>
                            </Link>
                          </div>

                          <span className="text-3xl transition group-hover:translate-x-1">
                            →
                          </span>
                        </div>

                        <p className="mt-5 min-h-[84px] leading-7 text-gray-400">
                          {product.shortDescription ||
                            product.description ||
                            "Discover this ORVIX product and explore its features."}
                        </p>

                        <div className="mt-7">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <strong className="block text-xl">
                              {product.status ===
                              "coming_soon"
                                ? product.price > 0
                                  ? formatPrice(
                                      product.price
                                    )
                                  : "Coming soon"
                                : formatPrice(
                                    product.price
                                  )}
                            </strong>

                            {product.status ===
                              "available" &&
                              product.stockQuantity >
                                0 && (
                                <span className="text-sm font-bold text-gray-500">
                                  {
                                    product.stockQuantity
                                  }{" "}
                                  in stock
                                </span>
                              )}
                          </div>

                          <Link
                            href={productHref}
                            className={`mt-5 flex w-full items-center justify-center rounded-full px-6 py-4 text-center font-black transition ${getButtonClasses(
                              product
                            )}`}
                          >
                            {getButtonText(
                              product
                            )}
                          </Link>

                          {product.status ===
                            "coming_soon" && (
                            <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                              Open the product
                              page to view launch
                              information and
                              notification options.
                            </p>
                          )}

                          {(product.status ===
                            "out_of_stock" ||
                            product.stockQuantity <=
                              0) &&
                            product.status !==
                              "coming_soon" && (
                              <p className="mt-3 text-center text-xs leading-5 text-red-300/70">
                                Purchasing is
                                currently disabled
                                until stock becomes
                                available.
                              </p>
                            )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="scroll-mt-24 border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                ABOUT ORVIX
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">
                Fitness technology made
                simple.
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
                ORVIX is an Egyptian
                technology brand focused on
                modern fitness and
                health-tracking products. We
                provide carefully selected
                devices with a simple ordering
                experience and reliable
                customer support.
              </p>

              <Link
                href={
                  firstProduct
                    ? getProductHref(
                        firstProduct
                      )
                    : "/#products"
                }
                className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
              >
                Explore Our Products
              </Link>
            </div>

            <div className="grid gap-4">
              {benefits.map((benefit) => (
                <article
                  key={benefit.number}
                  className="rounded-[28px] border border-white/10 bg-black/30 p-6 sm:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span className="text-sm font-black tracking-[0.25em] text-gray-600">
                      {benefit.number}
                    </span>

                    <div>
                      <h3 className="text-2xl font-black">
                        {benefit.title}
                      </h3>

                      <p className="mt-3 leading-7 text-gray-400">
                        {
                          benefit.description
                        }
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Track Order */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-7 text-center sm:p-12">
            <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
              Already placed an order?
            </p>

            <h2 className="mt-4 text-3xl font-black sm:text-5xl">
              Track your ORVIX order
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              Enter your order number and
              phone number to view the latest
              status of your order.
            </p>

            <Link
              href="/track-order"
              className="mx-auto mt-8 flex w-full max-w-sm items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200"
            >
              Track Your Order
            </Link>
          </div>
        </div>
      </section>

      {/* Garmin CTA */}
      {garminProduct &&
        garminProduct.status ===
          "coming_soon" && (
          <section className="px-4 pb-20 sm:px-6 sm:pb-24">
            <div className="mx-auto max-w-7xl">
              <div className="grid overflow-hidden rounded-[36px] border border-white/10 bg-[#111111] lg:grid-cols-[0.8fr_1.2fr]">
                <div className="flex items-center justify-center bg-white p-6 sm:p-10">
                  <Image
                    src={
                      garminProduct.image ||
                      "/black.jpeg"
                    }
                    alt={garminProduct.name}
                    width={700}
                    height={700}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="flex flex-col justify-center p-7 sm:p-12">
                  <span className="w-fit rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
                    Coming Soon
                  </span>

                  <h2 className="mt-5 text-4xl font-black sm:text-6xl">
                    Be first to know.
                  </h2>

                  <p className="mt-5 max-w-xl text-lg leading-8 text-gray-400">
                    {garminProduct.description ||
                      "Join the notification list and we will contact you when Garmin CIRQA becomes available."}
                  </p>

                  <Link
                    href={getProductHref(
                      garminProduct
                    )}
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-center text-lg font-black text-black transition hover:bg-gray-200 sm:w-fit"
                  >
                    Notify Me When Available
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              NEED HELP?
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              Frequently Asked Questions
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
              Everything you need to know
              about ordering, delivery,
              tracking and products.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {frequentlyAskedQuestions.map(
              (item, index) => (
                <details
                  key={item.question}
                  className="group rounded-[24px] border border-white/10 bg-black/30 p-5 open:border-white/25 sm:p-6"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-black">
                    <span>
                      {index + 1}.{" "}
                      {item.question}
                    </span>

                    <span className="text-2xl text-gray-500 transition group-open:rotate-45 group-open:text-white">
                      +
                    </span>
                  </summary>

                  <p className="mt-5 border-t border-white/10 pt-5 leading-7 text-gray-400">
                    {item.answer}
                  </p>
                </details>
              )
            )}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[40px] border border-white/10 bg-white/5">
            <div className="grid lg:grid-cols-2">
              <div className="p-7 sm:p-12">
                <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                  CONTACT US
                </p>

                <h2 className="mt-5 text-4xl font-black sm:text-6xl">
                  We are here to help.
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
                  Contact ORVIX for product
                  questions, order assistance
                  or general support. Include
                  your order number when asking
                  about an existing order.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://www.instagram.com/orvix_tech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
                  >
                    Message Us on Instagram
                  </a>

                  <Link
                    href="/track-order"
                    className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
                  >
                    Track an Order
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/30 p-7 sm:p-12 lg:border-l lg:border-t-0">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                  Official Account
                </p>

                <a
                  href="https://www.instagram.com/orvix_tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block break-words text-3xl font-black transition hover:text-gray-300"
                >
                  @orvix_tech
                </a>

                <p className="mt-5 leading-7 text-gray-400">
                  For your safety, only
                  communicate with ORVIX
                  through our official website
                  and official social media
                  account.
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-bold text-gray-300">
                    Order support
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Send us your order number
                    and the phone number used
                    during checkout so we can
                    assist you faster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center lg:flex-row lg:text-left">
          <div>
            <p className="font-black tracking-[0.3em]">
              ORVIX
            </p>

            <p className="mt-2 text-sm text-gray-600">
              © 2026 ORVIX. All rights
              reserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-semibold text-gray-500">
            <Link
              href="/#products"
              className="transition hover:text-white"
            >
              Products
            </Link>

            <Link
              href="/#about"
              className="transition hover:text-white"
            >
              About Us
            </Link>

            <Link
              href="/#faq"
              className="transition hover:text-white"
            >
              FAQ
            </Link>

            <Link
              href="/#contact"
              className="transition hover:text-white"
            >
              Contact Us
            </Link>

            <Link
              href="/track-order"
              className="transition hover:text-white"
            >
              Track Order
            </Link>

            {garminProduct && (
              <Link
                href={getProductHref(
                  garminProduct
                )}
                className="transition hover:text-white"
              >
                Garmin Notifications
              </Link>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}