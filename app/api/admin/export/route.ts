import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, readAdminRole } from "@/lib/admin-auth";
import { supabaseAdminJson } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const allowed = new Set(["orders", "products", "inventory", "customers", "cashflow", "audit"]);

function csvCell(value: unknown) {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "No data\n";
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

async function load(type: string) {
  if (type === "orders") {
    return supabaseAdminJson<Array<Record<string, unknown>>>(
      "orders?select=order_number,created_at,status,customer_name,phone,customer_email,product_name,product_slug,variant_label,colour,quantity,product_price,products_total,delivery_fee,discount_code,discount_amount,total_price,shipping_number,shipping_status,bosta_tracking_number,risk_score,processing_status&order=created_at.desc&limit=10000"
    );
  }
  if (type === "products") {
    return supabaseAdminJson<Array<Record<string, unknown>>>(
      "products?select=id,name,slug,status,price,compare_at_price,unit_cost,stock_quantity,low_stock_limit,allow_purchase,show_on_homepage,max_order_quantity,available_from,available_until,created_at,updated_at&order=display_order.asc,created_at.asc"
    );
  }
  if (type === "inventory") {
    return supabaseAdminJson<Array<Record<string, unknown>>>(
      "product_inventory?select=*&order=product_name.asc"
    );
  }
  if (type === "customers") {
    const orders = await supabaseAdminJson<Array<Record<string, unknown>>>(
      "orders?select=phone,customer_name,customer_email,total_price,status,created_at&order=created_at.desc&limit=10000"
    );
    const grouped = new Map<string, Record<string, unknown>>();
    for (const order of orders) {
      const phone = String(order.phone || "").trim();
      if (!phone) continue;
      const current = grouped.get(phone) || {
        phone,
        customer_name: order.customer_name || "",
        customer_email: order.customer_email || "",
        total_orders: 0,
        delivered_orders: 0,
        cancelled_orders: 0,
        lifetime_value: 0,
        last_order_at: order.created_at || "",
      };
      current.total_orders = Number(current.total_orders || 0) + 1;
      if (order.status === "delivered") {
        current.delivered_orders = Number(current.delivered_orders || 0) + 1;
        current.lifetime_value = Number(current.lifetime_value || 0) + Number(order.total_price || 0);
      }
      if (order.status === "cancelled") {
        current.cancelled_orders = Number(current.cancelled_orders || 0) + 1;
      }
      grouped.set(phone, current);
    }
    return Array.from(grouped.values());
  }
  if (type === "cashflow") {
    return supabaseAdminJson<Array<Record<string, unknown>>>(
      "cashflow_entries?select=*&order=entry_date.desc,created_at.desc&limit=10000"
    );
  }
  return supabaseAdminJson<Array<Record<string, unknown>>>(
    "admin_audit_log?select=*&order=created_at.desc&limit=10000"
  );
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type")?.trim().toLowerCase() || "orders";
  if (!allowed.has(type)) {
    return NextResponse.json({ success: false, message: "Unsupported export type." }, { status: 400 });
  }
  if ((type === "cashflow" || type === "audit") && readAdminRole(request) === "orders") {
    return NextResponse.json({ success: false, message: "Owner or Manager access is required." }, { status: 403 });
  }

  try {
    const rows = await load(type);
    const filename = `orvix-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(toCsv(rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Admin export error:", error);
    return NextResponse.json({ success: false, message: "Could not create export." }, { status: 500 });
  }
}
