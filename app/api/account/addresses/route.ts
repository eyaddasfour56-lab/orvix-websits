import { NextResponse } from "next/server";
import { ensureCustomerProfile, getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AddressInput = {
  id?: unknown;
  label?: unknown;
  fullName?: unknown;
  phone?: unknown;
  governorate?: unknown;
  area?: unknown;
  address?: unknown;
  isDefault?: unknown;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function validId(value: unknown) {
  const id = String(value || "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

function validated(body: AddressInput) {
  const data = {
    label: clean(body.label, 40),
    full_name: clean(body.fullName, 160),
    phone: clean(body.phone, 40),
    governorate: clean(body.governorate, 120),
    area: clean(body.area, 160) || null,
    address: clean(body.address, 500),
    is_default: Boolean(body.isDefault),
  };
  if (!data.label || data.full_name.length < 2 || data.phone.replace(/\D/g, "").length < 10 || data.governorate.length < 2 || data.address.length < 5) {
    return { error: "Complete the address, name and valid phone number.", data };
  }
  return { error: "", data };
}

export async function GET(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    await ensureCustomerProfile(user);
    const addresses = await supabaseAdminJson(
      `customer_addresses?customer_user_id=eq.${postgrestValue(user.id)}&select=*&order=is_default.desc,updated_at.desc`
    );
    return NextResponse.json({ success: true, addresses }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Customer addresses GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load saved addresses." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    await ensureCustomerProfile(user);
    const body = (await request.json()) as AddressInput;
    const { data, error } = validated(body);
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });
    const existing = await supabaseAdminJson<Array<{ id: string }>>(
      `customer_addresses?customer_user_id=eq.${postgrestValue(user.id)}&select=id&limit=1`
    );
    const rows = await supabaseAdminJson("customer_addresses", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...data, customer_user_id: user.id, is_default: data.is_default || existing.length === 0 }),
    });
    return NextResponse.json({ success: true, address: Array.isArray(rows) ? rows[0] : rows }, { status: 201 });
  } catch (error) {
    console.error("Customer addresses POST error:", error);
    return NextResponse.json({ success: false, message: "Could not save this address." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as AddressInput;
    const id = validId(body.id);
    const { data, error } = validated(body);
    if (!id || error) return NextResponse.json({ success: false, message: error || "A valid address is required." }, { status: 400 });
    const rows = await supabaseAdminJson(
      `customer_addresses?id=eq.${postgrestValue(id)}&customer_user_id=eq.${postgrestValue(user.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
      }
    );
    if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ success: false, message: "Address not found." }, { status: 404 });
    return NextResponse.json({ success: true, address: rows[0] });
  } catch (error) {
    console.error("Customer addresses PATCH error:", error);
    return NextResponse.json({ success: false, message: "Could not update this address." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  try {
    const body = (await request.json()) as { id?: unknown };
    const id = validId(body.id);
    if (!id) return NextResponse.json({ success: false, message: "A valid address is required." }, { status: 400 });
    const rows = await supabaseAdminJson(
      `customer_addresses?id=eq.${postgrestValue(id)}&customer_user_id=eq.${postgrestValue(user.id)}`,
      { method: "DELETE", headers: { Prefer: "return=representation" } }
    );
    if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ success: false, message: "Address not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer addresses DELETE error:", error);
    return NextResponse.json({ success: false, message: "Could not remove this address." }, { status: 500 });
  }
}
