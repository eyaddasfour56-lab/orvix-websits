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
            "Inventory item ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const stockQuantity = Number(
      body.stockQuantity
    );

    const lowStockLimit = Number(
      body.lowStockLimit
    );

    const isAvailable = Boolean(
      body.isAvailable
    );

    if (
      !Number.isInteger(stockQuantity) ||
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
      !Number.isInteger(lowStockLimit) ||
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
      stock_quantity: stockQuantity,
      low_stock_limit: lowStockLimit,
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/product_inventory?id=eq.${encodeURIComponent(
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
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Inventory update error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not update inventory.",
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
            "Inventory item was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Inventory updated successfully.",
      inventory: updatedProducts[0],
    });
  } catch (error) {
    console.error(
      "Admin inventory update API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update inventory.",
      },
      {
        status: 500,
      }
    );
  }
}