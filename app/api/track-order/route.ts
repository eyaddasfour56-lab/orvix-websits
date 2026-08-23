import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";
import {
  normalizeTrackingPhone,
  trackingPhoneCandidates,
  trackingSessionHash,
  TRACKING_SESSION_COOKIE,
} from "@/lib/tracking-security";

type OrderRow = {
  id: string;
  order_number: string;
  phone: string;
  customer_email?: string | null;
  governorate: string;
  product_name?: string | null;
  product_slug?: string | null;
  colour: string;
  quantity: number;
  product_price?: number | string | null;
  products_total: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  total_price: number | string;
  status: string;
  journey_status?: string | null;
  journey_updated_at?: string | null;
  payment_status?: string | null;
  order_type?: string | null;
  item_count?: number | null;
  estimated_delivery_from?: string | null;
  estimated_delivery_to?: string | null;
  created_at: string;
  updated_at?: string | null;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  shipping_status: string | null;
  bosta_tracking_number: string | null;
  bosta_state_code?: number | null;
  bosta_state_name: string | null;
  bosta_submitted_at: string | null;
  bosta_status_updated_at: string | null;
};

type OrderItemRow = {
  id: string;
  product_slug: string;
  product_name: string;
  variant_key?: string | null;
  variant_label?: string | null;
  colour: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  estimated_delivery_from?: string | null;
  estimated_delivery_to?: string | null;
};

type EventRow = {
  id: number;
  event_type: string;
  title: string;
  details?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type PublicTimelineEvent = {
  id: number | string;
  eventType: string;
  title: string;
  details: string;
  status: string;
  createdAt: string;
};

const privateResponseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

const importMilestones = [
  { status: "new", title: "Pre-Ordered", details: "Your pre-order has been received and the import journey has started." },
  { status: "international_transit", title: "In Transit to Egypt", details: "Your item is travelling to Egypt from abroad." },
  { status: "arrived_egypt", title: "Arrived in Egypt", details: "Your item has arrived in Egypt and is moving through the import process." },
  { status: "in_customs", title: "In Customs", details: "Your item is currently being processed by Egyptian customs." },
  { status: "customs_cleared", title: "Customs Cleared", details: "Customs clearance is complete and your item is moving to ORVIX." },
  { status: "received_at_orvix", title: "Received at ORVIX", details: "ORVIX has received your item and is preparing it for local delivery." },
  { status: "ready_for_courier", title: "Ready for Courier", details: "Your package is packed and ready to be handed to the courier." },
] as const;

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

function bostaCustomerStatus(codeValue: unknown) {
  const code = Number(codeValue);
  if (code === 10) return "courier_requested";
  if (code === 11) return "waiting_for_route";
  if (code === 20) return "route_assigned";
  if ([21, 22, 23].includes(code)) return "picked_up";
  if ([24, 25].includes(code)) return "bosta_warehouse";
  if ([30, 40].includes(code)) return "in_transit";
  if (code === 41) return "out_for_delivery";
  if (code === 45) return "delivered";
  if ([46, 60].includes(code)) return "returned";
  if ([48, 49].includes(code)) return "cancelled";
  if (code === 47) return "delivery_exception";
  if (code === 100) return "lost";
  if (code === 101) return "damaged";
  if (code === 102) return "investigation";
  if (code === 103) return "action_required";
  if (code === 104) return "archived";
  if (code === 105) return "on_hold";
  return "courier_tracking";
}

function bostaCustomerLabel(codeValue: unknown, fallback = "Courier Tracking") {
  const status = bostaCustomerStatus(codeValue);
  const labels: Record<string, string> = {
    courier_requested: "Courier Requested",
    waiting_for_route: "Waiting for Pickup Route",
    route_assigned: "Courier Route Assigned",
    picked_up: "Picked Up from ORVIX",
    bosta_warehouse: "Received at Bosta Warehouse",
    in_transit: "In Transit with Bosta",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    returned: "Returning to ORVIX",
    cancelled: "Delivery Cancelled",
    delivery_exception: "Delivery Exception",
    lost: "Shipment Issue - Lost",
    damaged: "Shipment Issue - Damaged",
    investigation: "Shipment Under Investigation",
    action_required: "Action Required",
    archived: "Shipment Archived",
    on_hold: "Shipment On Hold",
  };
  return labels[status] || fallback;
}

function orderState(order: OrderRow) {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "delivered") return "delivered";
  return "active";
}

function currentJourneyStatus(order: OrderRow) {
  return String(order.journey_status || "new");
}

function latestJourneyEvent(events: EventRow[], status: string) {
  return events
    .filter((event) =>
      ["journey_stage_changed", "status_changed"].includes(event.event_type) &&
      String(event.status || "") === status
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function latestLifecycleEvent(events: EventRow[], status: string) {
  return events
    .filter((event) => event.event_type === "status_changed" && String(event.status || "") === status)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function buildCustomerTimeline(order: OrderRow, events: EventRow[]) {
  const timeline: PublicTimelineEvent[] = [];
  const currentJourney = currentJourneyStatus(order);
  const currentJourneyIndex = Math.max(0, importMilestones.findIndex((milestone) => milestone.status === currentJourney));

  for (let index = 0; index <= currentJourneyIndex; index += 1) {
    const milestone = importMilestones[index];
    const matching = latestJourneyEvent(events, milestone.status);
    timeline.push({
      id: matching?.id ?? `${milestone.status}-${order.id}`,
      eventType: "journey_milestone",
      title: milestone.title,
      details: milestone.details,
      status: milestone.status,
      createdAt:
        matching?.created_at ||
        (milestone.status === "new" ? order.created_at : milestone.status === currentJourney ? order.journey_updated_at || order.updated_at || order.created_at : order.created_at),
    });
  }

  if (order.bosta_tracking_number && order.bosta_submitted_at) {
    timeline.push({
      id: `courier-requested-${order.id}`,
      eventType: "courier_milestone",
      title: "Courier Requested",
      details: "ORVIX created the Bosta shipment and requested pickup for your package.",
      status: "courier_requested",
      createdAt: order.bosta_submitted_at,
    });
  }

  const seenCourierStates = new Set<string>();
  const courierEvents = events
    .filter((event) => event.event_type === "courier_status_changed")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const event of courierEvents) {
    const stateCode = Number(event.metadata?.stateCode);
    const status = bostaCustomerStatus(stateCode);
    if (status === "courier_requested") continue;
    const key = Number.isFinite(stateCode) ? String(stateCode) : `${status}:${event.title}`;
    if (seenCourierStates.has(key)) continue;
    seenCourierStates.add(key);
    timeline.push({
      id: event.id,
      eventType: "courier_milestone",
      title: bostaCustomerLabel(stateCode, event.title || "Courier Update"),
      details: event.details && event.details !== "Live courier tracking update received from Bosta."
        ? event.details
        : "Live shipping update received from Bosta.",
      status,
      createdAt: event.created_at,
    });
  }

  const hasCourierCancellation = courierEvents.some((event) => [48, 49].includes(Number(event.metadata?.stateCode)));
  if (order.status === "cancelled" && !hasCourierCancellation) {
    const cancelled = latestLifecycleEvent(events, "cancelled");
    timeline.push({
      id: cancelled?.id ?? `cancelled-${order.id}`,
      eventType: "order_cancelled",
      title: "Order Cancelled",
      details: "This order has been cancelled. The journey milestone above is preserved.",
      status: "cancelled",
      createdAt: cancelled?.created_at || order.updated_at || order.created_at,
    });
  }

  return timeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function safeOrder(order: OrderRow) {
  const [items, events] = await Promise.all([
    supabaseAdminJson<OrderItemRow[]>(
      `order_items?order_id=eq.${postgrestValue(order.id)}&select=id,product_slug,product_name,variant_key,variant_label,colour,quantity,unit_price,line_total,estimated_delivery_from,estimated_delivery_to&order=created_at.asc,id.asc`
    ),
    supabaseAdminJson<EventRow[]>(
      `order_events?order_id=eq.${postgrestValue(order.id)}&select=id,event_type,title,details,status,metadata,created_at&order=created_at.asc,id.asc`
    ),
  ]);

  const safeItems = items.length
    ? items.map((item) => ({
        id: item.id,
        productSlug: item.product_slug,
        productName: item.product_name,
        variantKey: item.variant_key || null,
        variantLabel: item.variant_label || null,
        colour: item.colour,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unit_price || 0),
        lineTotal: Number(item.line_total || 0),
        isPreorder: true,
        estimatedDeliveryFrom: item.estimated_delivery_from || order.estimated_delivery_from || null,
        estimatedDeliveryTo: item.estimated_delivery_to || order.estimated_delivery_to || null,
      }))
    : [{
        id: `legacy-${order.id}`,
        productSlug: order.product_slug || "google-fitbit-air",
        productName: order.product_name || "ORVIX Product",
        variantKey: null,
        variantLabel: null,
        colour: order.colour || "Standard",
        quantity: Number(order.quantity || 1),
        unitPrice: Number(order.product_price || 0),
        lineTotal: Number(order.products_total || 0),
        isPreorder: true,
        estimatedDeliveryFrom: order.estimated_delivery_from || null,
        estimatedDeliveryTo: order.estimated_delivery_to || null,
      }];

  const carrierStatus = order.bosta_tracking_number
    ? bostaCustomerLabel(order.bosta_state_code, order.bosta_state_name || "Courier Tracking")
    : null;
  const journeyStatus = currentJourneyStatus(order);

  return {
    orderNumber: order.order_number,
    governorate: order.governorate,
    productsTotal: Number(order.products_total || 0),
    deliveryFee: Number(order.delivery_fee || 0),
    discountAmount: Number(order.discount_amount || 0),
    totalPrice: Number(order.total_price || 0),
    status: journeyStatus,
    journeyStatus,
    orderState: orderState(order),
    paymentStatus: order.payment_status || "pending",
    orderType: "preorder",
    itemCount: Number(order.item_count || safeItems.length),
    estimatedDeliveryFrom: order.estimated_delivery_from || null,
    estimatedDeliveryTo: order.estimated_delivery_to || null,
    createdAt: order.created_at,
    journeyUpdatedAt: order.journey_updated_at || order.updated_at || order.created_at,
    confirmedAt: order.confirmed_at || null,
    shippedAt: order.shipped_at || null,
    outForDeliveryAt: order.out_for_delivery_at || null,
    deliveredAt: order.delivered_at || null,
    shippingStatus: order.shipping_status || null,
    trackingNumber: order.bosta_tracking_number || null,
    carrierStatus,
    courierStatus: order.bosta_tracking_number ? bostaCustomerStatus(order.bosta_state_code) : null,
    lastUpdatedAt: order.bosta_status_updated_at || order.bosta_submitted_at || order.journey_updated_at || order.updated_at || order.created_at,
    items: safeItems,
    timeline: buildCustomerTimeline(order, events),
  };
}

type TrackingSessionRow = {
  id: string;
  phone_normalized: string;
  email_normalized: string;
  expires_at: string;
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TRACKING_SESSION_COOKIE)?.value || "";
    if (token.length < 32 || token.length > 128) {
      return response(
        { success: false, code: "TRACKING_VERIFICATION_REQUIRED", message: "Verify the email code to view this order." },
        401
      );
    }

    const tokenHash = trackingSessionHash(token);
    const sessions = await supabaseAdminJson<TrackingSessionRow[]>(
      `order_tracking_sessions?token_hash=eq.${postgrestValue(tokenHash)}&revoked_at=is.null&expires_at=gt.${postgrestValue(new Date().toISOString())}&select=id,phone_normalized,email_normalized,expires_at&limit=1`
    );
    const session = sessions[0];
    if (!session) {
      return response(
        { success: false, code: "TRACKING_VERIFICATION_REQUIRED", message: "Your secure tracking session expired. Request a new code." },
        401
      );
    }

    const phone = normalizeTrackingPhone(session.phone_normalized);
    const email = String(session.email_normalized || "").trim().toLowerCase();
    const candidates = trackingPhoneCandidates(phone);

    const filter = candidates.map((value) => `phone.eq.${postgrestValue(value)}`).join(",");
    const orders = await supabaseAdminJson<OrderRow[]>(
      `orders?or=(${filter})&select=id,order_number,phone,customer_email,governorate,product_name,product_slug,colour,quantity,product_price,products_total,delivery_fee,discount_amount,total_price,status,journey_status,journey_updated_at,payment_status,order_type,item_count,estimated_delivery_from,estimated_delivery_to,created_at,updated_at,confirmed_at,shipped_at,out_for_delivery_at,delivered_at,shipping_status,bosta_tracking_number,bosta_state_code,bosta_state_name,bosta_submitted_at,bosta_status_updated_at&order=created_at.desc&limit=20`
    );

    const matching = orders.filter(
      (order) =>
        normalizeTrackingPhone(order.phone) === phone &&
        String(order.customer_email || "").trim().toLowerCase() === email
    );
    if (!matching.length) {
      return response({ success: false, code: "ORDER_NOT_FOUND", message: "No orders were found for this verified email and phone number." }, 404);
    }

    await supabaseAdminJson(
      `order_tracking_sessions?id=eq.${postgrestValue(session.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ last_used_at: new Date().toISOString() }),
      }
    );

    const trackedOrders = await Promise.all(matching.map(safeOrder));
    return response({ success: true, orders: trackedOrders, order: trackedOrders[0] });
  } catch (error) {
    console.error("Track order API error:", error);
    return response({ success: false, code: "UNKNOWN_ERROR", message: "Could not check your orders right now." }, 500);
  }
}
