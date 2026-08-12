import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  BostaApiError,
  getBostaCities,
  getBostaDistricts,
} from "@/lib/bosta";

export async function GET(
  request: NextRequest
) {
  try {
    const cityId =
      request.nextUrl.searchParams
        .get("cityId")
        ?.trim() || "";

    if (
      cityId &&
      !/^[A-Za-z0-9_-]{2,80}$/.test(
        cityId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid city ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (cityId) {
      const districts =
        await getBostaDistricts(
          cityId
        );

      return NextResponse.json({
        success: true,
        districts,
      });
    }

    const cities =
      await getBostaCities();

    return NextResponse.json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error(
      "Bosta locations API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof BostaApiError
            ? error.message
            : "Could not load delivery areas. Please try again.",
      },
      {
        status: 502,
      }
    );
  }
}
