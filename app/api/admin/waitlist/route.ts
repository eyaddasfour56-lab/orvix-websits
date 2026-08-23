import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest
) {
  try {
    if (!hasAdminPermission(request, "customers")) {
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
      `${supabaseUrl}/rest/v1/product_waitlist?select=*&order=created_at.desc`,
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
        "Admin waitlist error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load waitlist.",
        },
        {
          status: 500,
        }
      );
    }

    const entries =
      await response.json();

    const waitingCount =
      Array.isArray(entries)
        ? entries.filter(
            (entry) =>
              entry.status === "waiting"
          ).length
        : 0;

    const notifiedCount =
      Array.isArray(entries)
        ? entries.filter(
            (entry) =>
              entry.status === "notified"
          ).length
        : 0;

    return NextResponse.json({
      success: true,
      entries,
      statistics: {
        total:
          Array.isArray(entries)
            ? entries.length
            : 0,
        waiting: waitingCount,
        notified: notifiedCount,
      },
    });
  } catch (error) {
    console.error(
      "Admin waitlist API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load waitlist.",
      },
      {
        status: 500,
      }
    );
  }
}
