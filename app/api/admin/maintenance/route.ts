import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
} from "@/lib/maintenance-mode";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      message: "Unauthorized.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(
  request: NextRequest
) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedResponse();
  }

  try {
    const status =
      await getMaintenanceStatus();

    return NextResponse.json(
      {
        success: true,
        maintenanceEnabled:
          status.enabled,
        updatedAt: status.updatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Maintenance status GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not load website status.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    if (
      typeof body.enabled !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Website status is invalid.",
        },
        { status: 400 }
      );
    }

    const status =
      await setMaintenanceStatus(
        body.enabled
      );

    return NextResponse.json(
      {
        success: true,
        maintenanceEnabled:
          status.enabled,
        updatedAt: status.updatedAt,
        message: status.enabled
          ? "Website closed. Visitors now see the Under Construction page."
          : "Website opened. Visitors can use the store again.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Maintenance status PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not change website status.",
      },
      { status: 500 }
    );
  }
}
