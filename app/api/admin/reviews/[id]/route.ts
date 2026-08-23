import { NextRequest, NextResponse } from "next/server";
import { auditAdminAction } from "@/lib/admin-audit";
import { hasAdminPermission } from "@/lib/admin-auth";

const allowedStatuses = [
  "pending",
  "approved",
  "rejected",
];

async function removeReviewPhotos(review: { photo_urls?: unknown }, supabaseUrl: string, secretKey: string) {
  const urls = Array.isArray(review.photo_urls) ? review.photo_urls : [];
  const marker = "/storage/v1/object/public/review-media/";
  const prefixes = urls
    .map((value) => {
      try {
        const pathname = new URL(String(value)).pathname;
        const index = pathname.indexOf(marker);
        return index >= 0 ? decodeURIComponent(pathname.slice(index + marker.length)) : "";
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  if (!prefixes.length) return;

  const response = await fetch(`${supabaseUrl}/storage/v1/object/review-media`, {
    method: "DELETE",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes }),
  });
  if (!response.ok) console.error("Review photo cleanup failed:", await response.text());
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

    const { id } = await context.params;
    const body = await request.json();

    const status = String(
      body.status || ""
    )
      .trim()
      .toLowerCase();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Review ID is required.",
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
            "Invalid review status.",
        },
        {
          status: 400,
        }
      );
    }

    const updateData = {
      status,

      approved_at:
        status === "approved"
          ? new Date().toISOString()
          : null,
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(
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
        "Update review error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not update review.",
        },
        {
          status: 500,
        }
      );
    }

    const updatedReviews =
      await response.json();

    if (
      !Array.isArray(updatedReviews) ||
      updatedReviews.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Review was not found.",
        },
        {
          status: 404,
        }
      );
    }

    await auditAdminAction(request, "moderate_review", "review", id, { status });

    return NextResponse.json({
      success: true,
      message:
        "Review updated successfully.",
      review: updatedReviews[0],
    });
  } catch (error) {
    console.error(
      "Update review API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not update review.",
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Review ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(
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
        "Delete review error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not delete review.",
        },
        {
          status: 500,
        }
      );
    }

    const deletedReviews =
      await response.json();

    if (
      !Array.isArray(deletedReviews) ||
      deletedReviews.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Review was not found.",
        },
        {
          status: 404,
        }
      );
    }

    await removeReviewPhotos(deletedReviews[0], supabaseUrl, supabaseSecretKey);
    await auditAdminAction(request, "delete_review", "review", id, {
      orderNumber: deletedReviews[0]?.order_number || null,
    });

    return NextResponse.json({
      success: true,
      message:
        "Review deleted successfully.",
      review: deletedReviews[0],
    });
  } catch (error) {
    console.error(
      "Delete review API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not delete review.",
      },
      {
        status: 500,
      }
    );
  }
}
