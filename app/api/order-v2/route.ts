import { NextRequest } from "next/server";
import { POST as createOriginalOrder } from "@/app/api/order/route";

type PaymentMethod = "cash_on_delivery" | "instapay_on_delivery";

function getPaymentMethod(request: NextRequest): PaymentMethod {
  const value = request.cookies.get("orvixPaymentMethod")?.value;
  return value === "instapay_on_delivery"
    ? "instapay_on_delivery"
    : "cash_on_delivery";
}

async function savePaymentMethod(orderNumber: string, paymentMethod: PaymentMethod) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("Payment method sync skipped: Supabase environment variables are missing.");
    return;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?order_number=eq.${encodeURIComponent(orderNumber)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        payment_method: paymentMethod,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Could not save payment method:", await response.text());
  }
}

export async function POST(request: NextRequest) {
  const paymentMethod = getPaymentMethod(request);

  const response = await createOriginalOrder(request);

  try {
    const data = await response.clone().json();
    const orderNumber = data?.orderNumber || data?.order?.order_number;

    if (response.ok && data?.success && orderNumber) {
      await savePaymentMethod(String(orderNumber), paymentMethod);
    }
  } catch (error) {
    console.error("Payment method wrapper error:", error);
  }

  return response;
}
