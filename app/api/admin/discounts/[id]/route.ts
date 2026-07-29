import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY;

type DiscountPayload = {
  code?: string;
  discountType?:
    | "free_delivery"
    | "percentage"
    | "fixed_amount";
  discountValue?: number;
  minimumOrderValue?: number;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getHeaders() {
  return {
    apikey: supabaseSecretKey || "",
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
  };
}

function normalizeCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function validatePayload(
  payload: DiscountPayload
) {
  const code = normalizeCode(payload.code);
  const discountType = payload.discountType;
  const discountValue = Number(
    payload.discountValue
  );

  if (!code) {
    return "Discount code is required.";
  }

  if (
    discountType !== "free_delivery" &&
    discountType !== "percentage" &&
    discountType !== "fixed_amount"
  ) {
    return "Invalid discount type.";
  }

  if (
    !Number.isFinite(discountValue) ||
    discountValue < 0
  ) {
    return "Invalid discount value.";
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    return "Percentage discount cannot exceed 100%.";
  }

  const minimumOrderValue = Number(
    payload.minimumOrderValue || 0
  );

  if (
    !Number.isFinite(minimumOrderValue) ||
    minimumOrderValue < 0
  ) {
    return "Minimum order value cannot be negative.";
  }

  if (
    payload.maximumDiscount !== null &&
    payload.maximumDiscount !== undefined &&
    Number(payload.maximumDiscount) < 0
  ) {
    return "Maximum discount cannot be negative.";
  }

  if (
    payload.usageLimit !== null &&
    payload.usageLimit !== undefined &&
    (!Number.isInteger(
      Number(payload.usageLimit)
    ) ||
      Number(payload.usageLimit) < 1)
  ) {
    return "Usage limit must be at least 1.";
  }

  if (
    payload.startsAt &&
    payload.expiresAt &&
    new Date(payload.expiresAt).getTime() <=
      new Date(payload.startsAt).getTime()
  ) {
    return "Expiry time must be after the start time.";
  }

  return null;
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    const numericId = Number(id);

    if (
      !Number.isInteger(numericId) ||
      numericId < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid discount ID.",
        },
        { status: 400 }
      );
    }

    const payload =
      (await request.json()) as DiscountPayload;

    const validationError =
      validatePayload(payload);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    const code = normalizeCode(payload.code);

    const response = await fetch(
      `${supabaseUrl}/rest/v1/delivery_discount_codes?id=eq.${numericId}`,
      {
        method: "PATCH",
        headers: {
          ...getHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          code,
          discount_type: payload.discountType,
          discount_value:
            payload.discountType ===
            "free_delivery"
              ? 100
              : Number(
                  payload.discountValue
                ),
          minimum_order_value: Number(
            payload.minimumOrderValue || 0
          ),
          maximum_discount:
            payload.maximumDiscount ===
              null ||
            payload.maximumDiscount ===
              undefined ||
            payload.maximumDiscount === 0
              ? null
              : Number(
                  payload.maximumDiscount
                ),
          usage_limit:
            payload.usageLimit === null ||
            payload.usageLimit === undefined
              ? null
              : Number(payload.usageLimit),
          active:
            payload.active === undefined
              ? true
              : Boolean(payload.active),
          starts_at:
            payload.startsAt || null,
          expires_at:
            payload.expiresAt || null,
          updated_at:
            new Date().toISOString(),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result?.code === "23505"
          ? "This discount code already exists."
          : result?.message ||
            "Could not update discount code.";

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(result) ||
      result.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Discount code was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: result[0],
    });
  } catch (error) {
    console.error(
      "Update discount error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update discount code.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    const numericId = Number(id);

    if (
      !Number.isInteger(numericId) ||
      numericId < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid discount ID.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/delivery_discount_codes?id=eq.${numericId}`,
      {
        method: "DELETE",
        headers: {
          ...getHeaders(),
          Prefer: "return=representation",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Could not delete discount code.",
        },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(result) ||
      result.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Discount code was not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Discount code deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete discount error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not delete discount code.",
      },
      { status: 500 }
    );
  }
}