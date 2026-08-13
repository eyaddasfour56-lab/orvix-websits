import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  BostaApiError,
  getBostaDelivery,
} from "@/lib/bosta";
import {
  getBostaStateName,
  getOrderStatusForBostaState,
  getShippingStatusForBostaState,
} from "@/lib/bosta-status";
import {
  postgrestValue,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

type StatusRefreshBody = {
  orderId?: unknown;
};

type StatusOrder = {
  id: string | number;
  order_number: string;
  bosta_tracking_number?: string | null;
};

function getFriendlyError(error: unknown) {
  if (error instanceof BostaApiError) {
    return error.message;
  }

  return "Could not refresh the Bosta status.";
}

export async function POST(
  request: NextRequest
) {
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

  try {
    const body =
      (await request.json()) as StatusRefreshBody;

    const orderId = String(
      body.orderId || ""
    ).trim();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const orders =
      await supabaseAdminJson<
        StatusOrder[]
      >(
        `orders?select=id,order_number,bosta_tracking_number&id=eq.${postgrestValue(
          orderId
        )}&limit=1`
      );

    const order = orders[0];

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const trackingNumber = String(
      order.bosta_tracking_number || ""
    ).trim();

    if (!trackingNumber) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Create the Bosta shipment first. This order is still with ORVIX.",
        },
        {
          status: 400,
        }
      );
    }

    const delivery =
      await getBostaDelivery(
        trackingNumber
      );

    if (delivery.stateCode === null) {
      throw new BostaApiError(
        "Bosta did not return a shipment state.",
        502,
        null,
        delivery
      );
    }

    const stateCode = delivery.stateCode;
    const shippingStatus =
      getShippingStatusForBostaState(
        stateCode
      );
    const orderStatus =
      getOrderStatusForBostaState(
        stateCode
      );
    const statusUpdatedAt =
      new Date().toISOString();

    const values: Record<
      string,
      unknown
    > = {
      bosta_delivery_id:
        delivery.id || undefined,
      bosta_tracking_number:
        delivery.trackingNumber,
      shipping_number:
        delivery.trackingNumber,
      bosta_state_code: stateCode,
      bosta_state_name:
        delivery.stateName ||
        getBostaStateName(stateCode),
      bosta_status_updated_at:
        statusUpdatedAt,
      bosta_last_error: null,
    };

    if (shippingStatus) {
      values.shipping_status =
        shippingStatus;
    }

    if (orderStatus) {
      values.status = orderStatus;
    }

    const updatedOrders =
      await supabaseAdminJson<
        Record<string, unknown>[]
      >(
        `orders?id=eq.${postgrestValue(
          order.id
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

    const updatedOrder =
      updatedOrders[0];

    if (!updatedOrder) {
      throw new Error(
        "Could not save the refreshed Bosta status."
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bosta status refreshed.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Bosta status refresh error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: getFriendlyError(error),
      },
      {
        status:
          error instanceof BostaApiError &&
          error.status < 500
            ? error.status
            : 500,
      }
    );
  }
}
