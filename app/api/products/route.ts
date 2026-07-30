import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function GET(
  request: NextRequest
) {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase settings are missing.",
        },
        {
          status: 500,
        }
      );
    }

    const url = new URL(request.url);

    const homepageOnly =
      url.searchParams.get(
        "homepage"
      ) === "true";

    const productSlug =
      url.searchParams.get("slug");

    let query =
      `${supabaseUrl}/rest/v1/products` +
      `?select=*`;

    if (productSlug) {
      query +=
        `&slug=eq.${encodeURIComponent(
          productSlug
        )}`;
    } else {
      query +=
        `&status=neq.hidden`;

      if (homepageOnly) {
        query +=
          `&show_on_homepage=eq.true`;
      }
    }

    query +=
      `&order=display_order.asc,created_at.asc`;

    const response = await fetch(query, {
      headers: {
        apikey: supabaseSecretKey,
        Authorization:
          `Bearer ${supabaseSecretKey}`,
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Public products fetch error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load products.",
        },
        {
          status: 500,
        }
      );
    }

    const products =
      await response.json();

    const formattedProducts =
      Array.isArray(products)
        ? products.map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,

            shortDescription:
              product.short_description,

            description:
              product.description,

            price: Number(
              product.price || 0
            ),

            image:
              product.image ||
              "/black.png",

            status:
              product.status,

            stockQuantity: Number(
              product.stock_quantity || 0
            ),

            lowStockLimit: Number(
              product.low_stock_limit || 0
            ),

            showOnHomepage: Boolean(
              product.show_on_homepage
            ),

            allowWishlist: Boolean(
              product.allow_wishlist
            ),

            allowPurchase: Boolean(
              product.allow_purchase
            ),

            displayOrder: Number(
              product.display_order || 0
            ),

            createdAt:
              product.created_at,

            updatedAt:
              product.updated_at,
          }))
        : [];

    if (
      productSlug &&
      formattedProducts.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      products:
        productSlug
          ? undefined
          : formattedProducts,

      product:
        productSlug
          ? formattedProducts[0]
          : undefined,
    });
  } catch (error) {
    console.error(
      "Public products API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load products.",
      },
      {
        status: 500,
      }
    );
  }
}