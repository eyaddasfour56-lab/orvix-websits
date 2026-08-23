import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest
) {
  try {
    if (!hasAdminPermission(request, "inventory")) {
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
      `${supabaseUrl}/rest/v1/product_inventory?select=*&order=product_name.asc`,
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
        "Admin inventory fetch error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load inventory.",
        },
        {
          status: 500,
        }
      );
    }

    const products =
      await response.json();

    return NextResponse.json({
      success: true,
      inventory: Array.isArray(products)
        ? products
        : [],
    });
  } catch (error) {
    console.error(
      "Admin inventory API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load inventory.",
      },
      {
        status: 500,
      }
    );
  }
}
