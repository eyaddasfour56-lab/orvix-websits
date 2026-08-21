import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import {
  getBostaStateName,
  getOrderStatusForBostaState,
  getShippingStatusForBostaState,
} from "@/lib/bosta-status";
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
  bosta_state_code?: number | null;
};

function secureEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

async function logCourierEvent({
  orderId,
  stateCode,
  stateName,
  trackingNumber,
  statusUpdatedAt,
  errorDetails,
}: {
  orderId: string | number;
  stateCode: number;
  stateName: string;
  trackingNumber: string;
  statusUpdatedAt: string;
  errorDetails: string | null;
}) {
  await supabaseAdminJson<Record<string, unknown>[]>("order_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      order_id: orderId,
      event_type: "courier_status_changed",
      title: stateName,
      details: errorDetails || "Live courier tracking update received from Bosta.",
      status: getOrderStatusForBostaState(stateCode),
      metadata: {
        courier: "Bosta",
        stateCode,
        stateName,
        trackingNumber: trackingNumber || null,
      },
      created_by: "bosta",
      created_at: statusUpdatedAt,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.BOSTA_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      return NextResponse.json(
        { success: false, message: "Webhook secret is not configured." },
        { status: 503 }
      );
    }

    const receivedAuthorization = request.headers.get("authorization") || "";
    const expectedAuthorization = `Bearer ${webhookSecret}`;

    if (!secureEqual(receivedAuthorization, expectedAuthorization)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as BostaWebhookBody;
    const trackingNumber = String(body.trackingNumber || "").trim();
    const businessReference = String(body.businessReference || "").trim();
    const stateCode = Number(body.state);

    if ((!trackingNumber && !businessReference) || !Number.isInteger(stateCode)) {
      return NextResponse.json(
        { success: false, message: "Invalid Bosta webhook payload." },
        { status: 400 }
      );
    }

    let matchingOrders: MatchingOrder[] = [];

    if (trackingNumber) {
      matchingOrders = await supabaseAdminJson<MatchingOrder[]>(
        `orders?select=id,bosta_state_code&bosta_tracking_number=eq.${postgrestValue(trackingNumber)}&limit=1`
      );
    }

    if (matchingOrders.length === 0 && businessReference) {
      matchingOrders = await supabaseAdminJson<MatchingOrder[]>(
        `orders?select=id,bosta_state_code&order_number=eq.${postgrestValue(businessReference)}&limit=1`
      );
    }

    const matchingOrder = matchingOrders[0];

    if (!matchingOrder) {
      console.warn("Bosta webhook order not found:", { trackingNumber, businessReference });
      return NextResponse.json({ success: true, ignored: true });
    }

    const shippingStatus = getShippingStatusForBostaState(stateCode);
    const orderStatus = getOrderStatusForBostaState(stateCode);

    const timestamp = Number(body.timeStamp);
    const timestampInMilliseconds =
      timestamp > 0 && timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
    const parsedTimestamp = new Date(timestampInMilliseconds);
    const statusUpdatedAt =
      Number.isFinite(timestamp) && timestamp > 0 && !Number.isNaN(parsedTimestamp.getTime())
        ? parsedTimestamp.toISOString()
        : new Date().toISOString();

    const stateName = getBostaStateName(stateCode);
    const errorDetails =
      stateCode === 47
        ? [
            body.exceptionReason,
            body.exceptionCode ? `Code ${body.exceptionCode}` : null,
          ]
            .filter(Boolean)
            .join(" - ") || "Bosta delivery exception"
        : null;

    const values: Record<string, unknown> = {
      bosta_delivery_id: body._id || undefined,
      bosta_tracking_number: trackingNumber || undefined,
      bosta_state_code: stateCode,
      bosta_state_name: stateName,
      bosta_status_updated_at: statusUpdatedAt,
      bosta_last_error: errorDetails,
    };

    if (trackingNumber) values.shipping_number = trackingNumber;
    if (shippingStatus) values.shipping_status = shippingStatus;
    if (orderStatus) values.status = orderStatus;

    const updatedOrders = await supabaseAdminJson<MatchingOrder[]>(
      `orders?id=eq.${postgrestValue(matchingOrder.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(values),
      }
    );

    if (updatedOrders.length !== 1) {
      throw new Error("Could not update the matching order.");
    }

    if (Number(matchingOrder.bosta_state_code) !== stateCode) {
      try {
        await logCourierEvent({
          orderId: matchingOrder.id,
          stateCode,
          stateName,
          trackingNumber,
          statusUpdatedAt,
          errorDetails,
        });
      } catch (eventError) {
        console.error("Could not log Bosta timeline event:", eventError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bosta webhook error:", error);

    return NextResponse.json(
      { success: false, message: "Could not process Bosta status update." },
      { status: 500 }
    );
  }
}
