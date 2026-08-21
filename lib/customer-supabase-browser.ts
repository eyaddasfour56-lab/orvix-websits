"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CUSTOMER_SUPABASE_PUBLISHABLE_KEY,
  CUSTOMER_SUPABASE_URL,
} from "@/lib/customer-auth-config";

let browserClient: SupabaseClient | null = null;

export function getCustomerSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(
      CUSTOMER_SUPABASE_URL,
      CUSTOMER_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return browserClient;
}

export async function getCustomerAccessToken() {
  const supabase = getCustomerSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}
