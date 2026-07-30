import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

function createAdminSession(
  secret: string
) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(
  request: NextRequest
) {
  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET;

  const receivedSession =
    request.cookies.get(
      "orvix_admin_session"
    )?.value;

  if (
    !sessionSecret ||
    !receivedSession
  ) {
    return false;
  }

  const expectedSession =
    createAdminSession(sessionSecret);

  const receivedBuffer = Buffer.from(
    receivedSession
  );

  const expectedBuffer = Buffer.from(
    expectedSession
  );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    )
  );
}

const allowedStatuses = [
  "available",
  "coming_soon",
  "out_of_stock",
  "hidden",
];

function cleanImages(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      String(item || "").trim()
    )
    .filter(Boolean);
}

export async function GET(
  request: NextRequest
) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?select=*&order=display_order.asc,created_at.asc`,
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
        "Products fetch error:",
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

    const normalisedProducts =
      Array.isArray(products)
        ? products.map((product) => {
            const storedImages =
              Array.isArray(product.images)
                ? product.images
                    .map((item: unknown) =>
                      String(
                        item || ""
                      ).trim()
                    )
                    .filter(Boolean)
                : [];

            const fallbackImage =
              String(
                product.image || ""
              ).trim();

            const images =
              storedImages.length > 0
                ? storedImages
                : fallbackImage
                  ? [fallbackImage]
                  : [];

            return {
              ...product,
              image:
                images[0] ||
                fallbackImage ||
                "",
              images,
            };
          })
        : [];

    return NextResponse.json({
      success: true,
      products: normalisedProducts,
    });
  } catch (error) {
    console.error(
      "Admin products GET error:",
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

export async function POST(
  request: NextRequest
) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

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

    const body = await request.json();

    const name = String(
      body.name || ""
    ).trim();

    const slug = String(
      body.slug || ""
    )
      .trim()
      .toLowerCase();

    const shortDescription = String(
      body.shortDescription || ""
    ).trim();

    const description = String(
      body.description || ""
    ).trim();

    const submittedImages =
      cleanImages(body.images);

    const submittedMainImage =
      String(body.image || "").trim();

    const images =
      submittedImages.length > 0
        ? submittedImages
        : submittedMainImage
          ? [submittedMainImage]
          : [];

    const image =
      images[0] || "/black.png";

    const status = String(
      body.status || "available"
    )
      .trim()
      .toLowerCase();

    const price = Number(
      body.price || 0
    );

    const stockQuantity = Number(
      body.stockQuantity || 0
    );

    const lowStockLimit = Number(
      body.lowStockLimit || 5
    );

    const displayOrder = Number(
      body.displayOrder || 0
    );

    const showOnHomepage =
      body.showOnHomepage !== false;

    const allowWishlist =
      body.allowWishlist !== false;

    const allowPurchase =
      body.allowPurchase !== false;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name is required.",
        },
        {
          status: 400,
        }
      );
    }

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

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        slug
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Slug can only contain lowercase letters, numbers and hyphens.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid product status.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Price must be a whole number of zero or more.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        stockQuantity
      ) ||
      stockQuantity < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Stock quantity must be a whole number of zero or more.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        lowStockLimit
      ) ||
      lowStockLimit < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Low stock limit must be a whole number of zero or more.",
        },
        {
          status: 400,
        }
      );
    }

    const productData = {
      name,
      slug,
      short_description:
        shortDescription,
      description,
      price,
      image,
      images,
      status,
      stock_quantity:
        stockQuantity,
      low_stock_limit:
        lowStockLimit,
      show_on_homepage:
        showOnHomepage,
      allow_wishlist:
        allowWishlist,
      allow_purchase:
        allowPurchase,
      display_order:
        Number.isInteger(displayOrder)
          ? displayOrder
          : 0,
      updated_at:
        new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products`,
      {
        method: "POST",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(
          productData
        ),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Product creation error:",
        errorText
      );

      if (
        errorText.includes(
          "products_slug_key"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A product with this slug already exists.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not create product.",
        },
        {
          status: 500,
        }
      );
    }

    const createdProducts =
      await response.json();

    const createdProduct =
      Array.isArray(createdProducts)
        ? createdProducts[0]
        : null;

    return NextResponse.json({
      success: true,
      message:
        "Product created successfully.",
      product: createdProduct
        ? {
            ...createdProduct,
            images:
              Array.isArray(
                createdProduct.images
              )
                ? createdProduct.images
                : createdProduct.image
                  ? [
                      createdProduct.image,
                    ]
                  : [],
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Admin products POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not create product.",
      },
      {
        status: 500,
      }
    );
  }
}