import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  SupabaseAdminError,
  postgrestValue,
  supabaseAdminFetch,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

function readExactCount(response: Response) {
  const contentRange = response.headers.get("content-range");
  if (!contentRange) return 0;

  const count = Number(contentRange.split("/").at(-1));
  return Number.isFinite(count) ? count : 0;
}

async function getExactCount(table: "site_views" | "orders", filters = "") {
  const response = await supabaseAdminFetch(
    `${table}?select=id${filters}`,
    {
      method: "HEAD",
      headers: {
        Prefer: "count=exact",
        Range: "0-0",
      },
    }
  );

  return readExactCount(response);
}

async function getUniqueVisitors(totalRows: number) {
  const ids = new Set<string>();
  const pageSize = 1000;

  for (let offset = 0; offset < totalRows; offset += pageSize) {
    const rows = await supabaseAdminJson<Array<{ visitor_id: string }>>(
      `site_views?select=visitor_id&order=id.asc&limit=${pageSize}&offset=${offset}`
    );

    if (!Array.isArray(rows)) break;

    rows.forEach((row) => {
      if (row.visitor_id) ids.add(row.visitor_id);
    });

    if (rows.length < pageSize) break;
  }

  return ids.size;
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const productPath = postgrestValue("/products/google-fitbit-air");
    const checkoutPath = postgrestValue("/checkout");

    const [
      totalViews,
      productViews,
      checkoutStarts,
      ordersPlaced,
    ] = await Promise.all([
      getExactCount("site_views"),
      getExactCount("site_views", `&path=eq.${productPath}`),
      getExactCount("site_views", `&path=eq.${checkoutPath}`),
      getExactCount("orders"),
    ]);

    const uniqueVisitors = await getUniqueVisitors(totalViews);

    return NextResponse.json({
      success: true,
      funnel: {
        uniqueVisitors,
        totalViews,
        productViews,
        checkoutStarts,
        ordersPlaced,
        visitorToProductRate: percentage(productViews, uniqueVisitors),
        productToCheckoutRate: percentage(checkoutStarts, productViews),
        checkoutToOrderRate: percentage(ordersPlaced, checkoutStarts),
        visitorToOrderRate: percentage(ordersPlaced, uniqueVisitors),
      },
    });
  } catch (error) {
    console.error(
      "Admin conversion analytics API error:",
      error instanceof SupabaseAdminError ? error.details : error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Could not load conversion analytics.",
      },
      { status: 500 }
    );
  }
}
