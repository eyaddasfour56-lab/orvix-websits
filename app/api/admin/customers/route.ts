import { NextRequest, NextResponse } from "next/server";
import { hasAdminPermission, isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type CustomerProfile = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!hasAdminPermission(request, "customers")) {
    return NextResponse.json({ success: false, message: "Customers access is not allowed for this admin role." }, { status: 403 });
  }

  try {
    const customers = await supabaseAdminJson<CustomerProfile[]>(
      "customer_profiles?select=id,email,full_name,phone,phone_normalized,created_at,updated_at&order=created_at.desc&limit=1000"
    );

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const summary = {
      total: customers.length,
      withPhone: customers.filter((customer) => Boolean(customer.phone_normalized || customer.phone)).length,
      newLast7Days: customers.filter((customer) => new Date(customer.created_at).getTime() >= sevenDaysAgo).length,
    };

    return NextResponse.json(
      {
        success: true,
        summary,
        customers,
        phoneDelivery: {
          provider: "Sent",
          configured: Boolean(
            process.env.SENT_API_KEY &&
              (process.env.SENT_SUPPORT_TEMPLATE_ID || process.env.SENT_SUPPORT_TEMPLATE_NAME)
          ),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Admin customers error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load customer accounts." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
