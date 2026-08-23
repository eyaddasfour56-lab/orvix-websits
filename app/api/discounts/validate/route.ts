import { NextResponse } from "next/server";

import { MAINTENANCE_SETTING_CODE } from "@/lib/maintenance-mode";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

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

    const body = await request.json();
    const code = String(body.code || "").trim().toUpperCase();
    const productsTotal = Math.max(0, Number(body.productsTotal || 0));

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a discount code.",
        },
        { status: 400 }
      );
    }

    if (
      code ===
      MAINTENANCE_SETTING_CODE
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid discount code.",
        },
        { status: 404 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/delivery_discount_codes?code=eq.${encodeURIComponent(
        code
      )}&select=*`,
      {
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not validate the discount code.",
        },
        { status: 500 }
      );
    }

    const rows = await response.json();
    const discount = rows?.[0];

    if (!discount) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid discount code.",
        },
        { status: 404 }
      );
    }

    if (!discount.active) {
      return NextResponse.json(
        {
          success: false,
          message: "This discount code is inactive.",
        },
        { status: 400 }
      );
    }

    if (
      discount.starts_at &&
      new Date(discount.starts_at).getTime() > Date.now()
    ) {
      return NextResponse.json(
        { success: false, message: "This discount code is not active yet." },
        { status: 400 }
      );
    }

    if (
      discount.expires_at &&
      new Date(discount.expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This discount code has expired.",
        },
        { status: 400 }
      );
    }

    if (
      discount.usage_limit !== null &&
      Number(discount.times_used) >= Number(discount.usage_limit)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This discount code has reached its usage limit.",
        },
        { status: 400 }
      );
    }

    const minimumOrderValue = Math.max(0, Number(discount.minimum_order_value || 0));
    if (productsTotal > 0 && productsTotal < minimumOrderValue) {
      return NextResponse.json(
        {
          success: false,
          message: `This code requires at least ${minimumOrderValue.toLocaleString("en-GB")} EGP in products.`,
        },
        { status: 400 }
      );
    }

    const type = String(discount.discount_type || "free_delivery");
    const value = Math.max(0, Number(discount.discount_value || 0));
    const message =
      type === "free_delivery"
        ? "Free delivery applied."
        : type === "percentage"
          ? `${value.toLocaleString("en-GB")}% discount applied.`
          : `${value.toLocaleString("en-GB")} EGP discount applied.`;

    return NextResponse.json({
      success: true,
      message,
      code: discount.code,
      discountType: type,
      discountValue: value,
      minimumOrderValue,
      maximumDiscount:
        discount.maximum_discount === null
          ? null
          : Math.max(0, Number(discount.maximum_discount || 0)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not validate the discount code.",
      },
      { status: 500 }
    );
  }
}
