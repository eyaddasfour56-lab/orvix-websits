import { NextResponse } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

type DiscountPayload = {
  code?: string;
  discountType?: "free_delivery" | "percentage" | "fixed_amount";
  discountValue?: number;
  minimumOrderValue?: number;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  active?: boolean;
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

function validatePayload(payload: DiscountPayload) {
  const code = normalizeCode(payload.code);
  const discountType = payload.discountType;
  const discountValue = Number(payload.discountValue);

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

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return "Invalid discount value.";
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    return "Percentage discount cannot exceed 100%.";
  }

  if (
    payload.usageLimit !== null &&
    payload.usageLimit !== undefined &&
    (!Number.isInteger(Number(payload.usageLimit)) ||
      Number(payload.usageLimit) < 1)
  ) {
    return "Usage limit must be at least 1.";
  }

  return null;
}

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/delivery_discount_codes?select=*&order=created_at.desc`,
      {
        headers: getHeaders(),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not load discount codes.",
        },
        { status: 500 }
      );
    }

    const discounts = await response.json();

    return NextResponse.json({
      success: true,
      discounts,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Could not load discount codes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const payload = (await request.json()) as DiscountPayload;
    const validationError = validatePayload(payload);

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
      `${supabaseUrl}/rest/v1/delivery_discount_codes`,
      {
        method: "POST",
        headers: {
          ...getHeaders(),
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          code,
          discount_type: payload.discountType,
          discount_value:
            payload.discountType === "free_delivery"
              ? 100
              : Number(payload.discountValue),
          minimum_order_value: Number(
            payload.minimumOrderValue || 0
          ),
          maximum_discount:
            payload.maximumDiscount === null ||
            payload.maximumDiscount === undefined ||
            payload.maximumDiscount === 0
              ? null
              : Number(payload.maximumDiscount),
          usage_limit:
            payload.usageLimit === null ||
            payload.usageLimit === undefined
              ? null
              : Number(payload.usageLimit),
          times_used: 0,
          active:
            payload.active === undefined
              ? true
              : Boolean(payload.active),
          starts_at: payload.startsAt || null,
          expires_at: payload.expiresAt || null,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const message =
        result?.code === "23505"
          ? "This discount code already exists."
          : result?.message || "Could not create discount code.";

      return NextResponse.json(
        {
          success: false,
          message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: result?.[0] || null,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Could not create discount code.",
      },
      { status: 500 }
    );
  }
}