import type { NextRequest } from "next/server";
import { POST as placeOrder } from "@/app/api/order-v4/route";
import { placeOrderForCustomer } from "@/lib/account-order-wrapper";

export async function POST(request: NextRequest) {
  return placeOrderForCustomer(request, placeOrder);
}
