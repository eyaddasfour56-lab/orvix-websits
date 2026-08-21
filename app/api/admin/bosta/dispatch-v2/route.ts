import { NextRequest, NextResponse } from "next/server";
import { POST as originalDispatch } from "@/app/api/admin/bosta/dispatch/route";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type OrderSnapshot = {
  id: string | number;
  order_number?: string | null;
  status?: string | null;
  supplier_status?: string | null;
  bosta_tracking_number?: string | null;
  payment_method?: string | null;
  delivery_fee?: number | string | null;
  total_price?: number | string | null;
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

function headers() {
  if (!supabaseSecretKey) return null;
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
    "Content-Type": "application/json",
  };
}

async function queryOrders(filter: string) {
  const authHeaders = headers();
  if (!supabaseUrl || !authHeaders) return [] as OrderSnapshot[];

  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=id,order_number,status,supplier_status,bosta_tracking_number,payment_method,delivery_fee,total_price&${filter}`,
    { headers: authHeaders, cache: "no-store" }
  );

  if (!response.ok) throw new Error(`Could not load order data for courier dispatch: ${await response.text()}`);
  return (await response.json()) as OrderSnapshot[];
}

async function getSnapshots(body: Record<string, unknown>) {
  const orderIds = Array.isArray(body.orderIds) ? body.orderIds : [];
  if (orderIds.length > 0) {
    const snapshots: OrderSnapshot[] = [];
    for (const id of orderIds) {
      const rows = await queryOrders(`id=eq.${encodeURIComponent(String(id))}&limit=1`);
      if (rows[0]) snapshots.push(rows[0]);
    }
    return snapshots;
  }

  const batchId = String(body.batchId || "").trim();
  if (batchId) return queryOrders(`bosta_batch_id=eq.${encodeURIComponent(batchId)}`);
  return [];
}

async function patchOrder(id: string | number, values: Record<string, unknown>) {
  const authHeaders = headers();
  if (!supabaseUrl || !authHeaders) return;

  const response = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { ...authHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(values),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Could not prepare order for courier dispatch: ${await response.text()}`);
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function cairoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, weekday: values.weekday };
}

function nextAutomaticPickupDate() {
  let candidate = new Date();
  for (let index = 0; index < 7; index += 1) {
    const current = cairoDateParts(candidate);
    if (current.weekday !== "Fri") return current.date;
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return cairoDateParts(candidate).date;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const bodyText = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body." }, { status: 400 });
  }

  try {
    const snapshots = await getSnapshots(body);
    if (!snapshots.length) {
      return NextResponse.json({ success: false, message: "Choose at least one order." }, { status: 400 });
    }

    for (const order of snapshots) {
      if (order.status === "cancelled") {
        return NextResponse.json({ success: false, message: `${order.order_number || "This order"} is cancelled.` }, { status: 400 });
      }
    }

    // Keep Bosta's existing confirmed-order requirement internal. The admin can
    // simply press Send to Courier without managing supplier workflow first.
    for (const order of snapshots) {
      if (!order.bosta_tracking_number) {
        await patchOrder(order.id, {
          order_type: "preorder",
          supplier_status: "ready_for_courier",
          status: "confirmed",
          ready_for_courier_at: new Date().toISOString(),
        });
      }
    }

    const changedCod = snapshots.filter((order) => order.payment_method === "cash_on_delivery");
    for (const order of changedCod) {
      await patchOrder(order.id, { delivery_fee: money(order.total_price) });
    }

    const forwardedBody = {
      ...body,
      pickupDate: String(body.pickupDate || "").trim() || nextAutomaticPickupDate(),
    };

    const forwardedRequest = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(forwardedBody),
    });

    try {
      return await originalDispatch(forwardedRequest);
    } finally {
      for (const order of changedCod) {
        try {
          await patchOrder(order.id, { delivery_fee: money(order.delivery_fee) });
        } catch (error) {
          console.error(`Could not restore delivery fee for order ${order.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("One-click courier dispatch error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Could not send order to courier." },
      { status: 500 }
    );
  }
}
