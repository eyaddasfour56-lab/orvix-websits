import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  BostaApiError,
  getBostaPickupLocations,
} from "@/lib/bosta";
import {
  SupabaseAdminError,
  supabaseAdminFetch,
} from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  let databaseReady = false;
  let databaseMessage = "";

  try {
    await supabaseAdminFetch(
      "orders?select=id,bosta_city_id,bosta_district_id,bosta_tracking_number,bosta_batch_id,bosta_pickup_id&limit=1"
    );

    databaseReady = true;
  } catch (error) {
    console.error(
      "Bosta database setup check error:",
      error
    );

    databaseMessage =
      error instanceof SupabaseAdminError &&
      /bosta_/i.test(error.details)
        ? "Run the Bosta Supabase migration first."
        : "Could not verify the Supabase setup.";
  }

  let apiConnected = false;
  let apiMessage = "";
  let pickupLocations: Awaited<
    ReturnType<
      typeof getBostaPickupLocations
    >
  > = [];

  if (!process.env.BOSTA_API_KEY?.trim()) {
    apiMessage =
      "BOSTA_API_KEY is missing from the server environment.";
  } else {
    try {
      pickupLocations =
        await getBostaPickupLocations();

      apiConnected = true;

      if (pickupLocations.length === 0) {
        apiMessage =
          "No Bosta pickup location was found on this account.";
      }
    } catch (error) {
      console.error(
        "Bosta connection check error:",
        error
      );

      apiMessage =
        error instanceof BostaApiError
          ? error.message
          : "Could not connect to Bosta.";
    }
  }

  return NextResponse.json({
    success: true,
    setup: {
      databaseReady,
      databaseMessage,
      apiConfigured: Boolean(
        process.env.BOSTA_API_KEY?.trim()
      ),
      apiConnected,
      apiMessage,
      webhookConfigured: Boolean(
        process.env.BOSTA_WEBHOOK_SECRET?.trim()
      ),
      pickupLocations,
    },
  });
}
