import {
  NextRequest,
  NextResponse,
} from "next/server";

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  status: string;
  product_name?: string | null;
  product_slug?: string | null;
};

function normalisePhone(value: string) {
  return value.replace(/\D/g, "");
}

function phonesMatch(
  firstPhone: string,
  secondPhone: string
) {
  const first = normalisePhone(firstPhone);
  const second = normalisePhone(secondPhone);

  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  const firstWithoutCountryCode =
    first.startsWith("20")
      ? `0${first.slice(2)}`
      : first;

  const secondWithoutCountryCode =
    second.startsWith("20")
      ? `0${second.slice(2)}`
      : second;

  return (
    firstWithoutCountryCode ===
    secondWithoutCountryCode
  );
}

export async function POST(
  request: NextRequest
) {
  try {
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

    const body = await request.json();

    const orderNumber = String(
      body.orderNumber || ""
    )
      .trim()
      .toUpperCase();

    const phone = String(
      body.phone || ""
    ).trim();

    const rating = Number(body.rating);

    const reviewText = String(
      body.reviewText || ""
    ).trim();

    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your order number.",
        },
        {
          status: 400,
        }
      );
    }

    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter your phone number.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select a rating from 1 to 5 stars.",
        },
        {
          status: 400,
        }
      );
    }

    if (reviewText.length < 5) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your review must contain at least 5 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (reviewText.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your review is too long.",
        },
        {
          status: 400,
        }
      );
    }

    const orderResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(
        orderNumber
      )}&select=id,order_number,customer_name,phone,status,product_name,product_slug&limit=1`,
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

    if (!orderResponse.ok) {
      const errorText =
        await orderResponse.text();

      console.error(
        "Review order lookup error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not verify your order.",
        },
        {
          status: 500,
        }
      );
    }

    const orders =
      (await orderResponse.json()) as OrderRecord[];

    const order = orders[0];

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order not found. Check your order number.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !phonesMatch(order.phone, phone)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The phone number does not match this order.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      String(order.status)
        .trim()
        .toLowerCase() !== "delivered"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can leave a review after your order has been delivered.",
        },
        {
          status: 400,
        }
      );
    }

    const existingReviewResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/reviews?order_id=eq.${encodeURIComponent(
          order.id
        )}&select=id&limit=1`,
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

    if (!existingReviewResponse.ok) {
      const errorText =
        await existingReviewResponse.text();

      console.error(
        "Existing review lookup error:",
        errorText
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not check your review.",
        },
        {
          status: 500,
        }
      );
    }

    const existingReviews =
      await existingReviewResponse.json();

    if (
      Array.isArray(existingReviews) &&
      existingReviews.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A review has already been submitted for this order.",
        },
        {
          status: 409,
        }
      );
    }

    const productName =
      order.product_name?.trim() ||
      "Google Fitbit Air";

    const productSlug =
      order.product_slug?.trim() ||
      "google-fitbit-air";

    const createReviewResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/reviews`,
        {
          method: "POST",
          headers: {
            apikey: supabaseSecretKey,
            Authorization: `Bearer ${supabaseSecretKey}`,
            "Content-Type":
              "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            order_id: order.id,
            order_number:
              order.order_number,

            product_name: productName,
            product_slug: productSlug,

            customer_name:
              order.customer_name,

            rating,
            review_text: reviewText,
            status: "pending",
          }),
        }
      );

    if (!createReviewResponse.ok) {
      const errorText =
        await createReviewResponse.text();

      console.error(
        "Create review error:",
        errorText
      );

      if (
        errorText
          .toLowerCase()
          .includes("duplicate")
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A review has already been submitted for this order.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not submit your review.",
        },
        {
          status: 500,
        }
      );
    }

    const createdReviews =
      await createReviewResponse.json();

    return NextResponse.json({
      success: true,
      message:
        "Thank you! Your review was submitted and is waiting for approval.",
      review:
        createdReviews[0] || null,
    });
  } catch (error) {
    console.error(
      "Submit review API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not submit your review.",
      },
      {
        status: 500,
      }
    );
  }
}