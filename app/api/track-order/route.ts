import { NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type TrackOrderRequest = { phone?: string };

type OrderRow = {
  id: string;
  order_number: string;
  phone: string;
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
  payment_status?: string | null;
  order_type?: string | null;
  item_count?: number | null;
  estimated_delivery_from?: string | null;
  estimated_delivery_to?: string | null;
  created_at: string;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
  shipping_status: string | null;
  bosta_tracking_number: string | null;
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
  created_at: string;
};

const privateResponseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

function normalizePhone(phone: string) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) return `0${digits.slice(2)}`;
  if (digits.startsWith("1")) return `0${digits}`;
  return digits;
}

function phoneCandidates(phone: string) {
  const local = normalizePhone(phone);
  if (!/^01\d{9}$/.test(local)) return [];
  const international = `20${local.slice(1)}`;
  return Array.from(new Set([local, international, `+${international}`, `00${international}`]));
}

async function safeOrder(order: OrderRow) {
  const [items, events] = await Promise.all([
    supabaseAdminJson<OrderItemRow[]>(
      `order_items?order_id=eq.${postgrestValue(order.id)}&select=id,product_slug,product_name,variant_key,variant_label,colour,quantity,unit_price,line_total,estimated_delivery_from,estimated_delivery_to&order=created_at.asc,id.asc`
    ),
    supabaseAdminJson<EventRow[]>(
      `order_events?order_id=eq.${postgrestValue(order.id)}&select=id,event_type,title,details,status,created_at&order=created_at.asc,id.asc`
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
    : [
        {
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
        },
      ];

  const customerEvents = events.filter((event) => !String(event.event_type || "").startsWith("supplier_"));
  const safeEvents = customerEvents.length
    ? customerEvents.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        title: event.title,
        details: event.details || null,
        status: event.status || null,
        createdAt: event.created_at,
      }))
    : [
        {
          id: 0,
          eventType: "order_placed",
          title: "Pre-order placed",
          details: "Your pre-order was received by ORVIX.",
          status: order.status,
          createdAt: order.created_at,
        },
      ];

  return {
    orderNumber: order.order_number,
    governorate: order.governorate,
    productsTotal: Number(order.products_total || 0),
    deliveryFee: Number(order.delivery_fee || 0),
    discountAmount: Number(order.discount_amount || 0),
    totalPrice: Number(order.total_price || 0),
    status: order.status,
    paymentStatus: order.payment_status || "pending",
    orderType: "preorder",
    itemCount: Number(order.item_count || safeItems.length),
    estimatedDeliveryFrom: order.estimated_delivery_from || null,
    estimatedDeliveryTo: order.estimated_delivery_to || null,
    createdAt: order.created_at,
    confirmedAt: order.confirmed_at || null,
    shippedAt: order.shipped_at || null,
    outForDeliveryAt: order.out_for_delivery_at || null,
    deliveredAt: order.delivered_at || null,
    shippingStatus: order.shipping_status || null,
    trackingNumber: order.bosta_tracking_number || null,
    carrierStatus: order.bosta_state_name || null,
    lastUpdatedAt: order.bosta_status_updated_at || order.bosta_submitted_at || order.delivered_at || order.created_at,
    items: safeItems,
    timeline: safeEvents,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackOrderRequest;
    const phone = normalizePhone(String(body.phone || ""));
    const candidates = phoneCandidates(phone);

    if (!phone) {
      return response({ success: false, code: "MISSING_PHONE", message: "Please enter your phone number." }, 400);
    }
    if (!candidates.length) {
      return response({ success: false, code: "INVALID_PHONE", message: "Please enter a valid Egyptian mobile number." }, 400);
    }

    const filter = candidates.map((value) => `phone.eq.${postgrestValue(value)}`).join(",");
    const orders = await supabaseAdminJson<OrderRow[]>(
      `orders?or=(${filter})&select=id,order_number,phone,governorate,product_name,product_slug,colour,quantity,product_price,products_total,delivery_fee,discount_amount,total_price,status,payment_status,order_type,item_count,estimated_delivery_from,estimated_delivery_to,created_at,confirmed_at,shipped_at,out_for_delivery_at,delivered_at,shipping_status,bosta_tracking_number,bosta_state_name,bosta_submitted_at,bosta_status_updated_at&order=created_at.desc&limit=20`
    );

    const matching = orders.filter((order) => normalizePhone(order.phone) === phone);
    if (!matching.length) {
      return response({ success: false, code: "ORDER_NOT_FOUND", message: "No orders were found for this phone number." }, 404);
    }

    const trackedOrders = await Promise.all(matching.map(safeOrder));
    return response({ success: true, orders: trackedOrders, order: trackedOrders[0] });
  } catch (error) {
    console.error("Track order API error:", error);
    return response({ success: false, code: "UNKNOWN_ERROR", message: "Could not check your orders right now." }, 500);
  }
}
