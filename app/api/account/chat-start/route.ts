import type { NextRequest } from "next/server";
import { POST as startChat } from "@/app/api/chat-start/route";
import { ensureCustomerProfile, getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const user = await getCustomerUser(request);
  if (!user) return startChat(request);

  const profile = await ensureCustomerProfile(user);
  const response = await startChat(request);
  if (!response.ok) return response;

  try {
    const result = await response.clone().json() as Record<string, unknown>;
    const token = String(result.token || "").trim();
    if (token) {
      await supabaseAdminJson(`customer_chat_sessions?public_token=eq.${postgrestValue(token)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          user_id: user.id,
          customer_email: user.email || profile?.email || null,
          customer_name: profile?.full_name || undefined,
          customer_phone: profile?.phone || undefined,
          updated_at: new Date().toISOString(),
        }),
      });
    }
  } catch (error) {
    console.error("Account chat linking failed:", error);
  }

  return response;
}
