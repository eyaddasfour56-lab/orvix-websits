import { NextRequest, NextResponse } from "next/server";

function cleanImages(images: unknown, fallbackImage = ""): string[] {
  const imageList = Array.isArray(images)
    ? images.map((image) => String(image || "").trim()).filter(Boolean)
    : [];
  const uniqueImages = Array.from(new Set(imageList));
  if (uniqueImages.length === 0 && fallbackImage.trim()) return [fallbackImage.trim()];
  if (uniqueImages.length === 0) return ["/black.png"];
  return uniqueImages;
}

const publicCacheHeaders = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
};

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const url = new URL(request.url);
    const homepageOnly = url.searchParams.get("homepage") === "true";
    const productSlug = url.searchParams.get("slug")?.trim() || "";

    let query = `${supabaseUrl}/rest/v1/store_products?select=*`;
    if (productSlug) {
      query += `&slug=eq.${encodeURIComponent(productSlug)}`;
    } else {
      query += `&status=neq.hidden`;
      if (homepageOnly) query += `&show_on_homepage=eq.true`;
    }
    query += `&order=display_order.asc,created_at.asc`;

    const response = await fetch(query, {
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      console.error("Public products fetch error:", await response.text());
      return NextResponse.json(
        { success: false, message: "Could not load products." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const products = await response.json();
    const formattedProducts = Array.isArray(products)
      ? products.map((product) => {
          const images = cleanImages(product.images, product.image);
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            shortDescription: product.short_description || "",
            description: product.description || "",
            price: Number(product.effective_price || 0),
            basePrice: Number(product.base_price || 0),
            compareAtPrice:
              product.effective_compare_at_price === null
                ? null
                : Number(product.effective_compare_at_price || 0),
            saleActive: Boolean(product.sale_active),
            saleStartsAt: product.sale_starts_at || null,
            saleEndsAt: product.sale_ends_at || null,
            image: images[0] || "/black.png",
            images,
            status: product.status,
            stockQuantity: Number(product.stock_quantity || 0),
            lowStockLimit: Number(product.low_stock_limit || 0),
            showOnHomepage: Boolean(product.show_on_homepage),
            allowWishlist: Boolean(product.allow_wishlist),
            allowPurchase: Boolean(product.allow_purchase),
            displayOrder: Number(product.display_order || 0),
            maxOrderQuantity: Number(product.max_order_quantity || 10),
            availableFrom: product.available_from || null,
            availableUntil: product.available_until || null,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
          };
        })
      : [];

    if (productSlug && formattedProducts.length === 0) {
      return NextResponse.json(
        { success: false, message: "Product was not found." },
        { status: 404, headers: publicCacheHeaders }
      );
    }

    let variants: Array<Record<string, unknown>> = [];
    if (productSlug && formattedProducts[0]?.id) {
      const variantsResponse = await fetch(
        `${supabaseUrl}/rest/v1/product_variants?product_id=eq.${encodeURIComponent(
          String(formattedProducts[0].id)
        )}&active=eq.true&select=id,variant_key,label,stock_quantity,low_stock_limit,allow_purchase,display_order&order=display_order.asc,created_at.asc`,
        {
          headers: {
            apikey: supabaseSecretKey,
            Authorization: `Bearer ${supabaseSecretKey}`,
            "Content-Type": "application/json",
          },
          next: { revalidate: 10 },
        }
      );

      if (variantsResponse.ok) {
        const rows = await variantsResponse.json();
        variants = Array.isArray(rows)
          ? rows.map((variant) => ({
              id: variant.id,
              variantKey: variant.variant_key,
              label: variant.label,
              stockQuantity: Number(variant.stock_quantity || 0),
              lowStockLimit: Number(variant.low_stock_limit || 0),
              allowPurchase: Boolean(variant.allow_purchase),
              displayOrder: Number(variant.display_order || 0),
            }))
          : [];
      } else {
        console.error("Public variants fetch error:", await variantsResponse.text());
      }
    }

    return NextResponse.json(
      {
        success: true,
        products: productSlug ? undefined : formattedProducts,
        product: productSlug
          ? { ...formattedProducts[0], variants }
          : undefined,
      },
      { headers: publicCacheHeaders }
    );
  } catch (error) {
    console.error("Public products API error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load products." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
