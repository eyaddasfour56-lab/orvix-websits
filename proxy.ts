import type { NextRequest } from "next/server";
import {
  NextResponse,
} from "next/server";

import { getMaintenanceStatus } from "@/lib/maintenance-mode";

const ALWAYS_AVAILABLE_PATHS = [
  "/admin",
  "/api/admin",
  "/api/bosta",
  "/api/view",
  "/under-construction",
];

function isAlwaysAvailable(
  pathname: string
) {
  return ALWAYS_AVAILABLE_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(
        `${path}/`
      )
  );
}

export async function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  // Keep the public checkout endpoint stable while routing POSTs through
  // the payment-aware wrapper that stores the selected payment method.
  if (
    request.method === "POST" &&
    pathname === "/api/order"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/order-v2";
    return NextResponse.rewrite(url);
  }

  // Keep the admin UI endpoint stable while allowing Bosta COD amounts to
  // follow each order's selected payment method.
  if (
    request.method === "POST" &&
    pathname === "/api/admin/bosta/dispatch"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/admin/bosta/dispatch-v2";
    return NextResponse.rewrite(url);
  }

  if (isAlwaysAvailable(pathname)) {
    return NextResponse.next();
  }

  try {
    const status =
      await getMaintenanceStatus();

    if (!status.enabled) {
      return NextResponse.next();
    }
  } catch (error) {
    /*
      Fail open if the database is temporarily unavailable so a database
      outage cannot accidentally lock the entire store and the dashboard.
    */
    console.error(
      "Maintenance gate error:",
      error
    );

    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        maintenance: true,
        message:
          "The ORVIX store is temporarily under construction.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
          "Retry-After": "3600",
        },
      }
    );
  }

  const maintenanceUrl =
    request.nextUrl.clone();

  maintenanceUrl.pathname =
    "/under-construction";
  maintenanceUrl.search = "";

  const response =
    NextResponse.rewrite(
      maintenanceUrl,
      {
        status: 503,
      }
    );

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );
  response.headers.set(
    "Retry-After",
    "3600"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf)$).*)",
  ],
};
