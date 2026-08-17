import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

const BUCKET = "cashflow-receipts";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

type EntryReceipt = {
  id: string;
  receipt_path?: string | null;
  receipt_name?: string | null;
};

function storageSettings() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function storageHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function encodeObjectPath(path: string) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function ensureBucket(url: string, key: string) {
  const existing = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(BUCKET)}`, {
    headers: storageHeaders(key),
    cache: "no-store",
  });

  if (existing.ok) return;
  if (existing.status !== 404) {
    throw new Error(`Could not check receipt bucket: ${await existing.text()}`);
  }

  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...storageHeaders(key),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: MAX_FILE_SIZE,
      allowed_mime_types: Array.from(ALLOWED_TYPES),
    }),
    cache: "no-store",
  });

  if (!created.ok && created.status !== 409) {
    throw new Error(`Could not create receipt bucket: ${await created.text()}`);
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const settings = storageSettings();
    if (!settings) {
      return NextResponse.json({ success: false, message: "Supabase settings are missing." }, { status: 500 });
    }

    const form = await request.formData();
    const entryId = String(form.get("entryId") || "").trim();
    const fileValue = form.get("file");

    if (!/^[0-9a-f-]{36}$/i.test(entryId)) {
      return NextResponse.json({ success: false, message: "Invalid cash flow entry." }, { status: 400 });
    }
    if (!(fileValue instanceof File) || fileValue.size <= 0) {
      return NextResponse.json({ success: false, message: "Choose a receipt file." }, { status: 400 });
    }
    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "Receipt must be 5 MB or smaller." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(fileValue.type)) {
      return NextResponse.json({ success: false, message: "Receipt must be JPG, PNG, WEBP or PDF." }, { status: 400 });
    }

    const entry = await supabaseAdminJson<EntryReceipt[]>(
      `cashflow_entries?select=id&id=eq.${postgrestValue(entryId)}&limit=1`
    );
    if (!entry?.[0]) {
      return NextResponse.json({ success: false, message: "Cash flow entry was not found." }, { status: 404 });
    }

    await ensureBucket(settings.url, settings.key);

    const objectPath = `${entryId}/receipt`;
    const upload = await fetch(
      `${settings.url}/storage/v1/object/${encodeURIComponent(BUCKET)}/${encodeObjectPath(objectPath)}`,
      {
        method: "POST",
        headers: {
          ...storageHeaders(settings.key),
          "Content-Type": fileValue.type,
          "cache-control": "max-age=3600",
          "x-upsert": "true",
        },
        body: Buffer.from(await fileValue.arrayBuffer()),
        cache: "no-store",
      }
    );

    if (!upload.ok) {
      const details = await upload.text();
      console.error("Receipt upload error:", details);
      return NextResponse.json({ success: false, message: "Could not upload receipt." }, { status: 500 });
    }

    await supabaseAdminJson<EntryReceipt[]>(
      `cashflow_entries?id=eq.${postgrestValue(entryId)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          receipt_path: objectPath,
          receipt_name: fileValue.name.slice(0, 180),
          updated_at: new Date().toISOString(),
        }),
      }
    );

    return NextResponse.json({
      success: true,
      receiptPath: objectPath,
      receiptName: fileValue.name.slice(0, 180),
    });
  } catch (error) {
    console.error("Cash flow receipt POST error:", error);
    return NextResponse.json({ success: false, message: "Could not upload receipt." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const settings = storageSettings();
    if (!settings) {
      return NextResponse.json({ success: false, message: "Supabase settings are missing." }, { status: 500 });
    }

    const path = String(request.nextUrl.searchParams.get("path") || "").trim();
    const name = String(request.nextUrl.searchParams.get("name") || "receipt").replace(/[\r\n"]/g, "").slice(0, 180);
    if (!path || path.includes("..") || !/^[0-9a-f-]{36}\/receipt$/i.test(path)) {
      return NextResponse.json({ success: false, message: "Invalid receipt path." }, { status: 400 });
    }

    const file = await fetch(
      `${settings.url}/storage/v1/object/${encodeURIComponent(BUCKET)}/${encodeObjectPath(path)}`,
      {
        headers: storageHeaders(settings.key),
        cache: "no-store",
      }
    );

    if (!file.ok) {
      return NextResponse.json({ success: false, message: "Receipt was not found." }, { status: file.status === 404 ? 404 : 500 });
    }

    const headers = new Headers();
    headers.set("Content-Type", file.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename="${name}"`);
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(file.body, { status: 200, headers });
  } catch (error) {
    console.error("Cash flow receipt GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load receipt." }, { status: 500 });
  }
}
