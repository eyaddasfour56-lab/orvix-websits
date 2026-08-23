import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type OrderRecord = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  status: string;
  product_name?: string | null;
  product_slug?: string | null;
};

const MAX_FILES = 3;
// Keep the complete multipart request below common serverless request limits.
const MAX_FILE_SIZE = 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20")) return `0${digits.slice(2)}`;
  if (digits.startsWith("1")) return `0${digits}`;
  return digits;
}

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function allowed(request: Request) {
  const key = `verified-review:${hash(clientIp(request)).slice(0, 32)}`;
  return supabaseAdminJson<boolean>("rpc/orvix_take_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_key: key, p_limit: 8, p_window_seconds: 30 * 60 }),
  });
}

function signatureMatches(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((value, index) => bytes[index] === value);
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    return {
      orderNumber: String(data.get("orderNumber") || ""),
      phone: String(data.get("phone") || ""),
      rating: Number(data.get("rating")),
      reviewText: String(data.get("reviewText") || ""),
      photos: data.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0),
    };
  }

  const body = (await request.json()) as Record<string, unknown>;
  return {
    orderNumber: String(body.orderNumber || ""),
    phone: String(body.phone || ""),
    rating: Number(body.rating),
    reviewText: String(body.reviewText || ""),
    photos: [] as File[],
  };
}

async function uploadPhotos(orderId: string, photos: File[]) {
  if (!photos.length) return { urls: [] as string[], paths: [] as string[] };
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("Review media storage is unavailable.");

  const folder = hash(orderId).slice(0, 24);
  const urls: string[] = [];
  const paths: string[] = [];

  for (const photo of photos) {
    const extension = allowedTypes[photo.type];
    if (!extension || photo.size > MAX_FILE_SIZE) {
      throw new Error("Each photo must be a JPG, PNG or WebP image no larger than 1 MB.");
    }
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!signatureMatches(photo.type, bytes)) {
      throw new Error("One of the selected files is not a valid image.");
    }

    const path = `${folder}/${randomUUID()}.${extension}`;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${supabaseUrl}/storage/v1/object/review-media/${encodedPath}`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": photo.type,
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!response.ok) throw new Error("Could not upload one of the review photos.");
    paths.push(path);
    urls.push(`${supabaseUrl}/storage/v1/object/public/review-media/${encodedPath}`);
  }

  return { urls, paths };
}

async function removeUploads(paths: string[]) {
  if (!paths.length) return;
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return;
  await fetch(`${supabaseUrl}/storage/v1/object/review-media`, {
    method: "DELETE",
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => undefined);
}

export async function POST(request: Request) {
  let uploadedPaths: string[] = [];
  try {
    if (!(await allowed(request))) {
      return NextResponse.json({ success: false, message: "Too many review attempts. Please wait and try again." }, { status: 429 });
    }

    const input = await readInput(request);
    const orderNumber = input.orderNumber.trim().toUpperCase().slice(0, 80);
    const phone = input.phone.trim().slice(0, 40);
    const reviewText = input.reviewText.trim();
    const rating = input.rating;
    const photos = input.photos.slice(0, MAX_FILES + 1);

    if (!orderNumber) return NextResponse.json({ success: false, message: "Please enter your order number." }, { status: 400 });
    if (!phone) return NextResponse.json({ success: false, message: "Please enter your phone number." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ success: false, message: "Please select a rating from 1 to 5 stars." }, { status: 400 });
    if (reviewText.length < 5 || reviewText.length > 1000) return NextResponse.json({ success: false, message: "Your review must contain 5 to 1,000 characters." }, { status: 400 });
    if (photos.length > MAX_FILES) return NextResponse.json({ success: false, message: "You can attach up to 3 photos." }, { status: 400 });

    const orders = await supabaseAdminJson<OrderRecord[]>(
      `orders?order_number=eq.${postgrestValue(orderNumber)}&select=id,order_number,customer_name,phone,status,product_name,product_slug&limit=1`
    );
    const order = orders[0];
    if (!order) return NextResponse.json({ success: false, message: "Order not found. Check your order number." }, { status: 404 });
    if (normalizePhone(order.phone) !== normalizePhone(phone)) return NextResponse.json({ success: false, message: "The phone number does not match this order." }, { status: 403 });
    if (String(order.status).toLowerCase() !== "delivered") return NextResponse.json({ success: false, message: "You can leave a review after your order has been delivered." }, { status: 400 });

    const existing = await supabaseAdminJson<Array<{ id: string }>>(
      `reviews?order_id=eq.${postgrestValue(order.id)}&select=id&limit=1`
    );
    if (existing.length) return NextResponse.json({ success: false, message: "A review has already been submitted for this order." }, { status: 409 });

    const uploaded = await uploadPhotos(order.id, photos);
    uploadedPaths = uploaded.paths;
    const created = await supabaseAdminJson<Array<Record<string, unknown>>>("reviews", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        product_name: order.product_name?.trim() || "Google Fitbit Air",
        product_slug: order.product_slug?.trim() || "google-fitbit-air",
        customer_name: order.customer_name,
        rating,
        review_text: reviewText,
        photo_urls: uploaded.urls,
        status: "pending",
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your verified review was submitted and is waiting for approval.",
      review: created[0] || null,
    });
  } catch (error) {
    await removeUploads(uploadedPaths);
    const message = error instanceof Error ? error.message : "Could not submit your review.";
    const duplicate = message.toLowerCase().includes("duplicate");
    console.error("Submit verified review API error:", error);
    return NextResponse.json(
      { success: false, message: duplicate ? "A review has already been submitted for this order." : message },
      { status: duplicate ? 409 : 500 }
    );
  }
}
