import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { getBostaStateName } from "@/lib/bosta";
import {
  postgrestValue,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

type BostaWebhookBody = {
  _id?: string;
  trackingNumber?: string | number;
  state?: string | number;
  timeStamp?: string | number;
  businessReference?: string;
  exceptionReason?: string;
  exceptionCode?: string | number;
};

type MatchingOrder = {
  id: string | number;
};

function secureEqual(
  first: string,
  second: string
) {
  const firstBuffer =
    Buffer.from(first);
  const secondBuffer =
    Buffer.from(second);

  return (
    firstBuffer.length ===
      secondBuffer.length &&
    timingSafeEqual(
      firstBuffer,
      secondBuffer
    )
  );
}

function getShippingStatus(
  stateCode: number
) {
  if ([10, 11, 20].includes(stateCode)) {
    return "pickup_requested";
  }

  if (
    [21, 23, 24, 30, 40].includes(
      stateCode
    )
  ) {
    return "shipped";
  }

  if (stateCode === 41) {
    return "out_for_delivery";
  }

  if (stateCode === 45) {
    return "delivered";
  }

  if ([46, 60].includes(stateCode)) {
    return "returned";
  }

  if (stateCode === 49) {
    return "cancelled";
  }

  if (stateCode === 47) {
    return "exception";
  }

  if (
    [48, 100, 101, 102, 103, 105].includes(
      stateCode
    )
  ) {
    return "shipping_issue";
  }

  return null;
}

function getOrderStatus(
  stateCode: number
) {
  if (
    [21, 23, 24, 30, 40].includes(
      stateCode
    )
  ) {
    return "shipped";
  }

  if (stateCode === 41) {
    return "out_for_delivery";
  }

  if (stateCode === 45) {
    return "delivered";
  }

  if (stateCode === 49) {
    return "cancelled";
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    const webhookSecret =
      process.env.BOSTA_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Webhook secret is not configured.",
        },
        {
          status: 503,
        }
      );
    }

    const receivedAuthorization =
      request.headers.get(
        "authorization"
      ) || "";

    const expectedAuthorization =
      `Bearer ${webhookSecret}`;

    if (
      !secureEqual(
        receivedAuthorization,
        expectedAuthorization
      )
    ) {
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

    const body =
      (await request.json()) as BostaWebhookBody;

    const trackingNumber = String(
      body.trackingNumber || ""
    ).trim();

    const businessReference = String(
      body.businessReference || ""
    ).trim();

    const stateCode = Number(body.state);

    if (
      (!trackingNumber &&
        !businessReference) ||
      !Number.isInteger(stateCode)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Bosta webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    let matchingOrders:
      MatchingOrder[] = [];

    if (trackingNumber) {
      matchingOrders =
        await supabaseAdminJson<
          MatchingOrder[]
        >(
          `orders?select=id&bosta_tracking_number=eq.${postgrestValue(
            trackingNumber
          )}&limit=1`
        );
    }

    if (
      matchingOrders.length === 0 &&
      businessReference
    ) {
      matchingOrders =
        await supabaseAdminJson<
          MatchingOrder[]
        >(
          `orders?select=id&order_number=eq.${postgrestValue(
            businessReference
          )}&limit=1`
        );
    }

    const matchingOrder =
      matchingOrders[0];

    if (!matchingOrder) {
      console.warn(
        "Bosta webhook order not found:",
        {
          trackingNumber,
          businessReference,
        }
      );

      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const shippingStatus =
      getShippingStatus(stateCode);

    const orderStatus =
      getOrderStatus(stateCode);

    const timestamp = Number(
      body.timeStamp
    );

    const statusUpdatedAt =
      Number.isFinite(timestamp) &&
      timestamp > 0
        ? new Date(timestamp).toISOString()
        : new Date().toISOString();

    const stateName =
      getBostaStateName(stateCode);

    const errorDetails =
      stateCode === 47
        ? [
            body.exceptionReason,
            body.exceptionCode
              ? `Code ${body.exceptionCode}`
              : null,
          ]
            .filter(Boolean)
            .join(" - ") ||
          "Bosta delivery exception"
        : null;

    const values: Record<
      string,
      unknown
    > = {
      bosta_delivery_id:
        body._id || undefined,
      bosta_tracking_number:
        trackingNumber || undefined,
      bosta_state_code: stateCode,
      bosta_state_name: stateName,
      bosta_status_updated_at:
        statusUpdatedAt,
      bosta_last_error: errorDetails,
    };

    if (trackingNumber) {
      values.shipping_number =
        trackingNumber;
    }

    if (shippingStatus) {
      values.shipping_status =
        shippingStatus;
    }

    if (orderStatus) {
      values.status = orderStatus;
    }

    const updatedOrders =
      await supabaseAdminJson<
        MatchingOrder[]
      >(
        `orders?id=eq.${postgrestValue(
          matchingOrder.id
        )}`,
        {
          method: "PATCH",
          headers: {
            Prefer:
              "return=representation",
          },
          body: JSON.stringify(values),
        }
      );

    if (updatedOrders.length !== 1) {
      throw new Error(
        "Could not update the matching order."
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Bosta webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not process Bosta status update.",
      },
      {
        status: 500,
      }
    );
  }
}
