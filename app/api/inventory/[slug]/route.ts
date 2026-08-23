import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      slug: string;
    }>;
  }
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

    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product slug is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/store_products?slug=eq.${encodeURIComponent(
        slug
      )}&select=id,slug,name,stock_quantity,low_stock_limit,status,allow_purchase,updated_at&limit=1`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Inventory fetch error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load product inventory.",
        },
        {
          status: 500,
        }
      );
    }

    const products =
      await response.json();

    if (
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product inventory was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const product = products[0];

    return NextResponse.json({
      success: true,
      inventory: {
        id: product.id,
        productSlug:
          product.slug,
        productName:
          product.name,
        stockQuantity: Number(
          product.stock_quantity || 0
        ),
        lowStockLimit: Number(
          product.low_stock_limit || 0
        ),
        isAvailable: Boolean(
          product.allow_purchase &&
          ["available", "preorder"].includes(String(product.status)) &&
          (String(product.status) === "preorder" || Number(product.stock_quantity || 0) > 0)
        ),
        updatedAt:
          product.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Inventory API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load product inventory.",
      },
      {
        status: 500,
      }
    );
  }
}
