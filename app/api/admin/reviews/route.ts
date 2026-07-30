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
      `${supabaseUrl}/rest/v1/reviews?select=*&order=created_at.desc`,
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
        "Load admin reviews error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not load reviews.",
        },
        {
          status: 500,
        }
      );
    }

    const reviews =
      await response.json();

    const pendingReviews =
      Array.isArray(reviews)
        ? reviews.filter(
            (review) =>
              review.status === "pending"
          ).length
        : 0;

    const approvedReviews =
      Array.isArray(reviews)
        ? reviews.filter(
            (review) =>
              review.status === "approved"
          ).length
        : 0;

    const averageRating =
      Array.isArray(reviews) &&
      reviews.length > 0
        ? reviews.reduce(
            (
              total: number,
              review: {
                rating?: number;
              }
            ) =>
              total +
              Number(review.rating || 0),
            0
          ) / reviews.length
        : 0;

    return NextResponse.json({
      success: true,
      reviews,
      statistics: {
        totalReviews:
          Array.isArray(reviews)
            ? reviews.length
            : 0,

        pendingReviews,
        approvedReviews,

        averageRating: Number(
          averageRating.toFixed(1)
        ),
      },
    });
  } catch (error) {
    console.error(
      "Admin reviews API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load reviews.",
      },
      {
        status: 500,
      }
    );
  }
}