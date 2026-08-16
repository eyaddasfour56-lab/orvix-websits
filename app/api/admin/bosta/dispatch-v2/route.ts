import { NextRequest, NextResponse } from "next/server";
import { POST as originalDispatch } from "@/app/api/admin/bosta/dispatch/route";
import { isAdminAuthenticated } from "@/lib/admin-auth";

type OrderSnapshot = {
  id: string | number;
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
    `${supabaseUrl}/rest/v1/orders?select=id,payment_method,delivery_fee,total_price&${filter}`,
    {
      headers: authHeaders,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Could not load payment data for Bosta: ${await response.text()}`);
  }

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
  if (batchId) {
    return queryOrders(`bosta_batch_id=eq.${encodeURIComponent(batchId)}`);
  }

  return [];
}

async function patchOrder(id: string | number, values: Record<string, unknown>) {
  const authHeaders = headers();
  if (!supabaseUrl || !authHeaders) return;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(String(id))}`,
    {
      method: "PATCH",
      headers: {
        ...authHeaders,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(values),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Could not prepare COD order for Bosta: ${await response.text()}`);
  }
}

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  const bodyText = await request.text();
  let body: Record<string, unknown> = {};

  try {
    body = JSON.parse(bodyText || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 }
    );
  }

  const snapshots = await getSnapshots(body);
  const changed = snapshots.filter(
    (order) => order.payment_method === "cash_on_delivery"
  );

  try {
    // The existing Bosta integration uses delivery_fee as its COD amount.
    // For cash-on-delivery orders, temporarily provide the full order total
    // so the courier collects products + delivery in cash.
    for (const order of changed) {
      await patchOrder(order.id, {
        delivery_fee: money(order.total_price),
      });
    }

    const forwardedRequest = new NextRequest(request.url, {
      method: "POST",
      headers: request.headers,
      body: bodyText,
    });

    return await originalDispatch(forwardedRequest);
  } finally {
    // Restore the real delivery fee after Bosta has captured the COD amount,
    // so ORVIX analytics and order totals stay correct.
    for (const order of changed) {
      try {
        await patchOrder(order.id, {
          delivery_fee: money(order.delivery_fee),
        });
      } catch (error) {
        console.error(`Could not restore delivery fee for order ${order.id}:`, error);
      }
    }
  }
}
