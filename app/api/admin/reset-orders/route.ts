import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-auth";

export async function DELETE(request: NextRequest) {
  try {
    if (!hasAdminPermission(request, "roles")) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    if (body.confirmation !== "DELETE ALL ORDERS") {
      return NextResponse.json(
        {
          success: false,
          message: "Confirmation text is incorrect.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase settings are missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=not.is.null`,
      {
        method: "DELETE",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Reset orders Supabase error:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: "Could not delete the orders.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All orders were deleted.",
    });
  } catch (error) {
    console.error("Reset orders API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not delete the orders.",
      },
      { status: 500 }
    );
  }
}
