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

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID is required.",
        },
        {
          status: 400,
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

    const image = String(
      body.image || "/black.png"
    ).trim();

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
      body.lowStockLimit || 0
    );

    const displayOrder = Number(
      body.displayOrder || 0
    );

    const showOnHomepage =
      Boolean(body.showOnHomepage);

    const allowWishlist =
      Boolean(body.allowWishlist);

    const allowPurchase =
      Boolean(body.allowPurchase);

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

    const updateData = {
      name,
      slug,
      short_description:
        shortDescription,
      description,
      price,
      image,
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
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(
          updateData
        ),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Product update error:",
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
              "Another product already uses this slug.",
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
            "Could not update product.",
        },
        {
          status: 500,
        }
      );
    }

    const updatedProducts =
      await response.json();

    if (
      !Array.isArray(updatedProducts) ||
      updatedProducts.length === 0
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
      message:
        "Product updated successfully.",
      product: updatedProducts[0],
    });
  } catch (error) {
    console.error(
      "Admin product PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update product.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type":
            "application/json",
          Prefer: "return=representation",
        },
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Product delete error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not delete product.",
        },
        {
          status: 500,
        }
      );
    }

    const deletedProducts =
      await response.json();

    if (
      !Array.isArray(deletedProducts) ||
      deletedProducts.length === 0
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
      message:
        "Product deleted successfully.",
      product: deletedProducts[0],
    });
  } catch (error) {
    console.error(
      "Admin product DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not delete product.",
      },
      {
        status: 500,
      }
    );
  }
}