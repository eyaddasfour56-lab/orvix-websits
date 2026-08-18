import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AnalyticsEvent = {
  event_name: string;
  visitor_id?: string | null;
  session_id?: string | null;
  path?: string | null;
  product_slug?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type SiteView = {
  path?: string | null;
  visitor_id?: string | null;
  session_id?: string | null;
  created_at: string;
};

type Order = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  total_price?: number | string | null;
  discount_code?: string | null;
  colour?: string | null;
  order_type?: string | null;
  item_count?: number | null;
  created_at: string;
};

type OrderItem = {
  product_slug?: string | null;
  product_name?: string | null;
  colour?: string | null;
  quantity?: number | null;
  is_preorder?: boolean | null;
  created_at: string;
};

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function safeDays(value: string | null) {
  const parsed = Number(value || 30);
  if (![7, 30, 90].includes(parsed)) return 30;
  return parsed;
}

function addCount(map: Map<string, number>, key: string, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function ranked(map: Map<string, number>, limit = 8) {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function productSlugFromPath(path: string | null | undefined) {
  const match = String(path || "").match(/^\/products\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const days = safeDays(new URL(request.url).searchParams.get("days"));
    const since = isoDaysAgo(days);
    const encodedSince = encodeURIComponent(since);

    const [events, views, orders, items] = await Promise.all([
      supabaseAdminJson<AnalyticsEvent[]>(
        `analytics_events?created_at=gte.${encodedSince}&select=event_name,visitor_id,session_id,path,product_slug,metadata,created_at&order=created_at.asc&limit=20000`
      ),
      supabaseAdminJson<SiteView[]>(
        `site_views?created_at=gte.${encodedSince}&select=path,visitor_id,session_id,created_at&order=created_at.asc&limit=20000`
      ),
      supabaseAdminJson<Order[]>(
        `orders?created_at=gte.${encodedSince}&select=id,order_number,status,total_price,discount_code,colour,order_type,item_count,created_at&order=created_at.asc&limit=5000`
      ),
      supabaseAdminJson<OrderItem[]>(
        `order_items?created_at=gte.${encodedSince}&select=product_slug,product_name,colour,quantity,is_preorder,created_at&order=created_at.asc&limit=10000`
      ),
    ]);

    const visitorIds = new Set<string>();
    const productViewBySlug = new Map<string, number>();
    const addToCartBySlug = new Map<string, number>();
    const colourCounts = new Map<string, number>();
    const productOrderCounts = new Map<string, number>();
    const promoCounts = new Map<string, number>();
    const daily = new Map<string, { visitors: Set<string>; productViews: number; addToCart: number; checkout: number; orders: number; revenue: number }>();

    function dailyBucket(value: string) {
      const key = value.slice(0, 10);
      let bucket = daily.get(key);
      if (!bucket) {
        bucket = { visitors: new Set<string>(), productViews: 0, addToCart: 0, checkout: 0, orders: 0, revenue: 0 };
        daily.set(key, bucket);
      }
      return bucket;
    }

    let productViews = 0;
    for (const view of views) {
      const identity = String(view.visitor_id || view.session_id || "").trim();
      if (identity) {
        visitorIds.add(identity);
        dailyBucket(view.created_at).visitors.add(identity);
      }
      const slug = productSlugFromPath(view.path);
      if (slug) {
        productViews += 1;
        addCount(productViewBySlug, slug);
        dailyBucket(view.created_at).productViews += 1;
      }
    }

    let addToCart = 0;
    let checkoutStarted = 0;
    for (const event of events) {
      const identity = String(event.visitor_id || event.session_id || "").trim();
      if (identity) {
        visitorIds.add(identity);
        dailyBucket(event.created_at).visitors.add(identity);
      }

      if (event.event_name === "add_to_cart") {
        const quantity = Math.max(1, Number(event.metadata?.quantity || 1));
        addToCart += quantity;
        addCount(addToCartBySlug, String(event.product_slug || "Unknown"), quantity);
        dailyBucket(event.created_at).addToCart += quantity;
      }
      if (event.event_name === "checkout_started") {
        checkoutStarted += 1;
        dailyBucket(event.created_at).checkout += 1;
      }
    }

    const nonCancelledOrders = orders.filter((order) => order.status !== "cancelled");
    const cancelledOrders = orders.length - nonCancelledOrders.length;
    const revenue = nonCancelledOrders.reduce((sum, order) => sum + Math.max(0, Number(order.total_price || 0)), 0);
    const averageOrderValue = nonCancelledOrders.length ? revenue / nonCancelledOrders.length : 0;
    const preorderOrders = nonCancelledOrders.filter((order) => ["preorder", "mixed"].includes(String(order.order_type || ""))).length;

    for (const order of nonCancelledOrders) {
      const bucket = dailyBucket(order.created_at);
      bucket.orders += 1;
      bucket.revenue += Math.max(0, Number(order.total_price || 0));
      const code = String(order.discount_code || "").trim().toUpperCase();
      if (code) addCount(promoCounts, code);
    }

    for (const item of items) {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const colour = String(item.colour || "Standard").trim() || "Standard";
      const product = String(item.product_name || item.product_slug || "Product").trim();
      addCount(colourCounts, colour, quantity);
      addCount(productOrderCounts, product, quantity);
    }

    const visitors = visitorIds.size || views.length;
    const orderCount = nonCancelledOrders.length;
    const conversionRate = visitors > 0 ? (orderCount / visitors) * 100 : 0;
    const checkoutConversion = checkoutStarted > 0 ? (orderCount / checkoutStarted) * 100 : 0;

    const timeline = Array.from(daily.entries())
      .map(([date, bucket]) => ({
        date,
        visitors: bucket.visitors.size,
        productViews: bucket.productViews,
        addToCart: bucket.addToCart,
        checkoutStarted: bucket.checkout,
        orders: bucket.orders,
        revenue: Math.round(bucket.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      {
        success: true,
        days,
        metrics: {
          visitors,
          productViews,
          addToCart,
          checkoutStarted,
          orders: orderCount,
          cancelledOrders,
          revenue: Math.round(revenue * 100) / 100,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          checkoutConversion: Math.round(checkoutConversion * 100) / 100,
          preorderOrders,
        },
        funnel: [
          { key: "visitors", label: "Visitors", value: visitors },
          { key: "product_views", label: "Product views", value: productViews },
          { key: "add_to_cart", label: "Add to cart", value: addToCart },
          { key: "checkout", label: "Checkout started", value: checkoutStarted },
          { key: "orders", label: "Orders", value: orderCount },
        ],
        topViewedProducts: ranked(productViewBySlug),
        topCartProducts: ranked(addToCartBySlug),
        topOrderedProducts: ranked(productOrderCounts),
        topColours: ranked(colourCounts),
        promoCodes: ranked(promoCounts),
        timeline,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Analytics V2 API error:", error);
    return NextResponse.json({ success: false, message: "Could not load commerce analytics." }, { status: 500 });
  }
}
