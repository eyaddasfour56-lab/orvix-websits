import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      app: "ORVIX",
      release: "commerce-perfect-20260817-v1",
      commerceReliability: true,
      atomicOrders: true,
      genericCheckout: true,
      backgroundQueue: true,
      checkoutRecovery: true,
      riskCenter: true,
      featureFlags: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
