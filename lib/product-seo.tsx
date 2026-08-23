import "server-only";

import type { Metadata } from "next";
import { loadSiteSettings } from "@/lib/site-settings-server";

export type SeoProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: string[];
  status: string;
  stockQuantity: number;
  allowPurchase: boolean;
  updatedAt?: string;
  ratingValue?: number | null;
  reviewCount?: number;
};

type ProductRow = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  short_description?: unknown;
  description?: unknown;
  effective_price?: unknown;
  effective_compare_at_price?: unknown;
  image?: unknown;
  images?: unknown;
  status?: unknown;
  stock_quantity?: unknown;
  allow_purchase?: unknown;
  updated_at?: unknown;
};

type ReviewRow = { rating?: unknown };

export async function loadSeoProduct(slug: string): Promise<SeoProduct | null> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;

  try {
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const [productResponse, reviewsResponse] = await Promise.all([
      fetch(
        `${url}/rest/v1/store_products?slug=eq.${encodeURIComponent(slug)}&status=neq.hidden&select=*&limit=1`,
        { headers, next: { revalidate: 60 } }
      ),
      fetch(
        `${url}/rest/v1/reviews?product_slug=eq.${encodeURIComponent(slug)}&status=eq.approved&select=rating`,
        { headers, next: { revalidate: 300 } }
      ),
    ]);
    if (!productResponse.ok) return null;
    const products = (await productResponse.json()) as ProductRow[];
    const row = products[0];
    if (!row) return null;

    const imageValues = Array.isArray(row.images)
      ? row.images.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const fallbackImage = String(row.image || "").trim() || "/black.png";
    const images = Array.from(new Set(imageValues.length ? imageValues : [fallbackImage]));
    const reviews = reviewsResponse.ok ? ((await reviewsResponse.json()) as ReviewRow[]) : [];
    const ratings = reviews.map((review) => Number(review.rating)).filter(Number.isFinite);

    return {
      id: String(row.id || ""),
      name: String(row.name || "Product"),
      slug: String(row.slug || slug),
      shortDescription: String(row.short_description || ""),
      description: String(row.description || row.short_description || ""),
      price: Number(row.effective_price || 0),
      compareAtPrice: row.effective_compare_at_price == null ? null : Number(row.effective_compare_at_price || 0),
      image: images[0] || fallbackImage,
      images,
      status: String(row.status || "available"),
      stockQuantity: Number(row.stock_quantity || 0),
      allowPurchase: Boolean(row.allow_purchase),
      updatedAt: row.updated_at ? String(row.updated_at) : undefined,
      ratingValue: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : null,
      reviewCount: ratings.length,
    };
  } catch {
    return null;
  }
}

export async function productMetadata(slug: string): Promise<Metadata> {
  const [settings, product] = await Promise.all([loadSiteSettings(), loadSeoProduct(slug)]);
  if (!product) {
    return {
      title: "Product",
      robots: { index: false, follow: true },
    };
  }

  const title = `${product.name} in Egypt`;
  const description = (product.shortDescription || product.description || settings.seoDescription).slice(0, 180);
  const canonical = `/products/${encodeURIComponent(product.slug)}`;
  const images = product.images.map((image) => ({ url: image, alt: product.name }));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} | ${settings.shortName}`,
      description,
      siteName: settings.brandName,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${settings.shortName}`,
      description,
      images: product.images,
    },
  };
}

function schemaAvailability(product: SeoProduct) {
  if (!product.allowPurchase || product.status === "out_of_stock" || product.stockQuantity <= 0) {
    return "https://schema.org/OutOfStock";
  }
  if (product.status === "preorder") return "https://schema.org/PreOrder";
  return "https://schema.org/InStock";
}

export async function ProductStructuredData({ slug }: { slug: string }) {
  const [settings, product] = await Promise.all([loadSiteSettings(), loadSeoProduct(slug)]);
  if (!product) return null;

  const productUrl = `${settings.siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description || product.shortDescription,
    image: product.images.map((image) => new URL(image, settings.siteUrl).toString()),
    sku: product.slug,
    brand: { "@type": "Brand", name: settings.brandName },
    url: productUrl,
    offers:
      product.price > 0
        ? {
            "@type": "Offer",
            url: productUrl,
            priceCurrency: "EGP",
            price: product.price,
            itemCondition: "https://schema.org/NewCondition",
            availability: schemaAvailability(product),
            seller: { "@type": "Organization", name: settings.brandName },
          }
        : undefined,
    aggregateRating:
      product.reviewCount && product.ratingValue
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(product.ratingValue.toFixed(1)),
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replaceAll("<", "\\u003c") }}
    />
  );
}
