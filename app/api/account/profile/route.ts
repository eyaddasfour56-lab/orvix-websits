import { NextResponse } from "next/server";
import {
  ensureCustomerProfile,
  getCustomerUser,
  normalizeCustomerPhone,
} from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    await ensureCustomerProfile(user);
    const body = (await request.json()) as Record<string, unknown>;
    const fullName = String(body.fullName || "").trim().slice(0, 160);
    const phone = String(body.phone || "").trim().slice(0, 40);

    if (fullName.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your full name." }, { status: 400 });
    }

    if (phone && normalizeCustomerPhone(phone).replace(/\D/g, "").length < 10) {
      return NextResponse.json({ success: false, message: "Enter a valid phone number." }, { status: 400 });
    }

    const rows = await supabaseAdminJson(
      `customer_profiles?id=eq.${postgrestValue(user.id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          full_name: fullName,
          phone: phone || null,
          phone_normalized: phone ? normalizeCustomerPhone(phone) : null,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    return NextResponse.json({ success: true, profile: Array.isArray(rows) ? rows[0] : rows });
  } catch (error) {
    console.error("Customer profile update error:", error);
    return NextResponse.json({ success: false, message: "Could not save your profile." }, { status: 500 });
  }
}
