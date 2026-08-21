import "server-only";

import type { NextRequest } from "next/server";
import { ensureCustomerProfile, getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export async function placeOrderForCustomer(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<Response>
) {
  const user = await getCustomerUser(request);
  if (!user) return handler(request);

  await ensureCustomerProfile(user);
  const response = await handler(request);
  if (!response.ok) return response;

  try {
    const result = await response.clone().json() as Record<string, unknown>;
    const orderId = String(result.orderId || (result.order as Record<string, unknown> | undefined)?.id || "").trim();
    if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
      await supabaseAdminJson(`orders?id=eq.${postgrestValue(orderId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          customer_user_id: user.id,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (error) {
    // The order itself already succeeded. Do not turn a valid purchase into an error
    // just because the convenience account-link step failed.
    console.error("Account order linking failed:", error);
  }

  return response;
}
