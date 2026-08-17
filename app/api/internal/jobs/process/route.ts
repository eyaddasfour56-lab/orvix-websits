import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

type Job = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
};

type Order = {
  id: string;
  order_number: string;
  shipping_number?: string | null;
  customer_name: string;
  phone: string;
  customer_email?: string | null;
  governorate?: string | null;
  address: string;
  product_name: string;
  product_slug: string;
  colour: string;
  quantity: number;
  product_price: number | string;
  products_total: number | string;
  delivery_fee: number | string;
  discount_amount: number | string;
  total_price: number | string;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString("en-GB") : "0";
}

async function isAuthorized(request: NextRequest) {
  const received = request.headers.get("x-orvix-worker-token")?.trim() || "";
  if (!received) return false;

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && safeEqual(received, cronSecret)) return true;

  const rows = await supabaseAdminJson<{ webhook_token?: string | null }[]>(
    "admin_push_config?id=eq.default&select=webhook_token&limit=1"
  );
  const stored = String(rows[0]?.webhook_token || "");
  return Boolean(stored && safeEqual(received, stored));
}

async function loadOrder(orderId: string) {
  const rows = await supabaseAdminJson<Order[]>(
    `orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,shipping_number,customer_name,phone,customer_email,governorate,address,product_name,product_slug,colour,quantity,product_price,products_total,delivery_fee,discount_amount,total_price&limit=1`
  );
  if (!rows[0]) throw new Error("Order no longer exists.");
  return rows[0];
}

async function completeJob(job: Job) {
  await supabaseAdminJson(
    `commerce_jobs?id=eq.${encodeURIComponent(job.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "completed",
        completed_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }),
    }
  );
}

async function failJob(job: Job, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const isDead = Number(job.attempts || 0) >= Number(job.max_attempts || 5);
  const delaySeconds = Math.min(3600, 60 * Math.pow(2, Math.max(Number(job.attempts || 1) - 1, 0)));
  const runAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();

  await supabaseAdminJson(
    `commerce_jobs?id=eq.${encodeURIComponent(job.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: isDead ? "dead" : "pending",
        run_after: isDead ? new Date().toISOString() : runAfter,
        locked_at: null,
        last_error: message.slice(0, 1500),
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (isDead) {
    await supabaseAdminJson(
      "admin_notifications?on_conflict=event_key",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          kind: "system",
          title: "Commerce job needs attention",
          body: `${job.kind} failed ${job.attempts} time(s).`,
          target_url: "/admin/commerce",
          event_key: `commerce_job_dead:${job.id}`,
          severity: "critical",
          read_at: null,
        }),
      }
    );
  }
}

async function sendAdminEmail(resend: Resend, order: Order, origin: string) {
  const to = process.env.ORDER_NOTIFICATION_EMAIL || process.env.RESEND_TO_EMAIL;
  if (!to) throw new Error("ORDER_NOTIFICATION_EMAIL is missing.");

  const from = process.env.RESEND_FROM_EMAIL || "ORVIX Orders <onboarding@resend.dev>";
  const trackUrl = `${origin}/track-order?orderNumber=${encodeURIComponent(order.order_number)}`;
  const result = await resend.emails.send({
    from,
    to,
    subject: `New ORVIX order — ${order.order_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;color:#111">
        <p style="letter-spacing:5px;font-weight:800">ORVIX</p>
        <h1>New order received</h1>
        <div style="background:#111;color:#fff;border-radius:18px;padding:20px">
          <b>${escapeHtml(order.order_number)}</b><br/>
          Shipping: ${escapeHtml(order.shipping_number || "Pending")}
        </div>
        <div style="background:#f5f5f5;border-radius:18px;padding:20px;margin-top:16px;line-height:1.7">
          <b>Customer:</b> ${escapeHtml(order.customer_name)}<br/>
          <b>Phone:</b> ${escapeHtml(order.phone)}<br/>
          <b>Address:</b> ${escapeHtml(order.governorate)} — ${escapeHtml(order.address)}<br/>
          <b>Product:</b> ${escapeHtml(order.product_name)} — ${escapeHtml(order.colour)} × ${order.quantity}<br/>
          <b>Products:</b> ${money(order.products_total)} EGP<br/>
          <b>Delivery:</b> ${money(order.delivery_fee)} EGP<br/>
          <b>Discount:</b> ${money(order.discount_amount)} EGP<br/>
          <b>Total:</b> ${money(order.total_price)} EGP
        </div>
        <p><a href="${escapeHtml(trackUrl)}">Open tracking page</a></p>
      </div>`,
  });
  if (result.error) throw new Error(result.error.message || "Admin email failed.");
}

async function sendCustomerEmail(resend: Resend, order: Order, origin: string) {
  const to = String(order.customer_email || "").trim();
  if (!to) return;

  const from = process.env.RESEND_FROM_EMAIL || "ORVIX Orders <onboarding@resend.dev>";
  const trackUrl = `${origin}/track-order?orderNumber=${encodeURIComponent(order.order_number)}`;
  const result = await resend.emails.send({
    from,
    to,
    subject: `Your ORVIX order — ${order.order_number}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px;color:#111">
        <p style="letter-spacing:5px;font-weight:800">ORVIX</p>
        <h1>Order received</h1>
        <p>Thank you, ${escapeHtml(order.customer_name)}. Your order is safely registered.</p>
        <div style="background:#111;color:#fff;border-radius:18px;padding:20px;text-align:center">
          <div style="font-size:12px;color:#aaa">ORDER NUMBER</div>
          <div style="font-size:20px;font-weight:800;margin-top:8px">${escapeHtml(order.order_number)}</div>
        </div>
        <div style="background:#f5f5f5;border-radius:18px;padding:20px;margin-top:16px;line-height:1.7">
          <b>${escapeHtml(order.product_name)}</b> — ${escapeHtml(order.colour)} × ${order.quantity}<br/>
          Products: ${money(order.products_total)} EGP<br/>
          Delivery: ${money(order.delivery_fee)} EGP<br/>
          <b>Total: ${money(order.total_price)} EGP</b>
        </div>
        <p><a href="${escapeHtml(trackUrl)}">Track your order</a></p>
      </div>`,
  });
  if (result.error) throw new Error(result.error.message || "Customer email failed.");
}

async function processJob(job: Job, origin: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY is missing.");
  const resend = new Resend(resendKey);
  const orderId = String(job.payload?.orderId || "");
  if (!orderId) throw new Error("Job payload does not include orderId.");
  const order = await loadOrder(orderId);

  if (job.kind === "send_order_admin_email") {
    await sendAdminEmail(resend, order, origin);
  } else if (job.kind === "send_order_customer_email") {
    await sendCustomerEmail(resend, order, origin);
  } else {
    throw new Error(`Unsupported commerce job: ${job.kind}`);
  }

  await completeJob(job);
}

async function run(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const settings = await supabaseAdminJson<{ queue_enabled?: boolean }[]>(
    "commerce_settings?id=eq.default&select=queue_enabled&limit=1"
  );
  if (settings[0]?.queue_enabled === false) {
    return NextResponse.json({ success: true, paused: true, processed: 0 });
  }

  await supabaseAdminJson("rpc/orvix_commerce_housekeeping", {
    method: "POST",
    body: "{}",
  });

  const jobs = await supabaseAdminJson<Job[]>("rpc/orvix_claim_jobs", {
    method: "POST",
    body: JSON.stringify({ p_limit: 10 }),
  });

  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      await processJob(job, request.nextUrl.origin);
      completed += 1;
    } catch (error) {
      console.error("Commerce queue job failed:", job.id, error);
      await failJob(job, error);
      failed += 1;
    }
  }

  return NextResponse.json({
    success: true,
    claimed: jobs.length,
    completed,
    failed,
  });
}

export async function POST(request: NextRequest) {
  try {
    return await run(request);
  } catch (error) {
    console.error("Commerce queue worker error:", error);
    return NextResponse.json({ success: false, message: "Queue worker failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
