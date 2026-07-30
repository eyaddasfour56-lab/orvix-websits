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
  "pending",
  "approved",
  "rejected",
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