import { NextResponse } from "next/server";
import { ensureCustomerProfile, getCustomerUser } from "@/lib/customer-auth-server";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_number?: string | null;
  product_name?: string | null;
  product_slug?: string | null;
  product_price?: number | string | null;
  colour?: string | null;
  quantity?: number | null;
  total_price?: number | string | null;
  status?: string | null;
  journey_status?: string | null;
  bosta_tracking_number?: string | null;
  bosta_state_name?: string | null;
  created_at?: string | null;
  return_status?: string | null;
};

type ConversationRow = {
  id: string;
  status?: string | null;
  last_message_preview?: string | null;
  last_sender?: string | null;
  last_message_at?: string | null;
  customer_last_read_at?: string | null;
  created_at?: string | null;
};

function isUnread(conversation: ConversationRow) {
  if (conversation.last_sender !== "admin") return false;
  const messageTime = new Date(String(conversation.last_message_at || "")).getTime();
  const readTime = conversation.customer_last_read_at
    ? new Date(conversation.customer_last_read_at).getTime()
    : 0;
  return Number.isFinite(messageTime) && messageTime > readTime;
}

export async function GET(request: Request) {
  const user = await getCustomerUser(request);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const profile = await ensureCustomerProfile(user);
    const [orders, conversations] = await Promise.all([
      supabaseAdminJson<OrderRow[]>(
        `orders?customer_user_id=eq.${postgrestValue(user.id)}&select=id,order_number,product_name,product_slug,product_price,colour,quantity,total_price,status,journey_status,bosta_tracking_number,bosta_state_name,return_status,created_at&order=created_at.desc&limit=100`
      ),
      supabaseAdminJson<ConversationRow[]>(
        `customer_chat_sessions?user_id=eq.${postgrestValue(user.id)}&select=id,status,last_message_preview,last_sender,last_message_at,customer_last_read_at,created_at&order=last_message_at.desc&limit=100`
      ),
    ]);

    return NextResponse.json({
      success: true,
      account: {
        id: user.id,
        email: user.email || profile?.email || "",
        emailVerified: Boolean(user.email_confirmed_at),
        profile,
      },
      orders,
      conversations: conversations.map((conversation) => ({
        ...conversation,
        unread: isUnread(conversation),
      })),
      unreadMessages: conversations.filter(isUnread).length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer account overview error:", error);
    return NextResponse.json({ success: false, message: "Could not load your account." }, { status: 500 });
  }
}
