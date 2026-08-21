import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import {
  CUSTOMER_SUPABASE_PUBLISHABLE_KEY,
  CUSTOMER_SUPABASE_URL,
} from "@/lib/customer-auth-config";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export type CustomerProfile = {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  phone_normalized?: string | null;
  created_at?: string;
  updated_at?: string;
};

function createVerifier() {
  return createClient(
    CUSTOMER_SUPABASE_URL,
    CUSTOMER_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export function normalizeCustomerPhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("20") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0")) return `+20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `+20${digits}`;
  return digits ? `+${digits}` : "";
}

export async function getCustomerUser(request: Request): Promise<User | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return null;

  const verifier = createVerifier();
  const { data, error } = await verifier.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function ensureCustomerProfile(user: User) {
  const userId = user.id;
  const email = String(user.email || "").trim().toLowerCase();
  const existing = await supabaseAdminJson<CustomerProfile[]>(
    `customer_profiles?id=eq.${postgrestValue(userId)}&select=id,email,full_name,phone,phone_normalized,created_at,updated_at&limit=1`
  );

  let profile = existing[0];

  if (!profile) {
    const fullName = String(user.user_metadata?.full_name || "").trim().slice(0, 160);
    const phone = String(user.user_metadata?.phone || "").trim().slice(0, 40);
    const inserted = await supabaseAdminJson<CustomerProfile[]>("customer_profiles", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
        phone_normalized: phone ? normalizeCustomerPhone(phone) : null,
      }),
    });
    profile = inserted[0];
  }

  if (email && user.email_confirmed_at) {
    try {
      await supabaseAdminJson(
        `orders?customer_user_id=is.null&or=(customer_email.eq.${postgrestValue(email)},email.eq.${postgrestValue(email)})`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ customer_user_id: userId, updated_at: new Date().toISOString() }),
        }
      );
    } catch (error) {
      console.error("Customer historical order linking failed:", error);
    }
  }

  return profile;
}
