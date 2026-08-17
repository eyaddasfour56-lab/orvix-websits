import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type Person = "me" | "ahmed_samy";

type Order = {
  id: string;
  status: string;
  products_total?: number | string | null;
  total_price?: number | string | null;
  delivery_fee?: number | string | null;
  created_at: string;
};

type CashflowEntry = {
  id: string;
  entry_type: "income" | "expense";
  category: string;
  amount: number | string;
  description?: string | null;
  paid_by?: Person | null;
  received_by?: Person | null;
  entry_date: string;
  created_at: string;
};

function createAdminSession(secret: string) {
  return createHmac("sha256", secret)
    .update("orvix-admin-session")
    .digest("hex");
}

function isAdminAuthenticated(request: NextRequest) {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const receivedSession = request.cookies.get("orvix_admin_session")?.value;

  if (!sessionSecret || !receivedSession) {
    return false;
  }

  const expectedSession = createAdminSession(sessionSecret);
  const receivedBuffer = Buffer.from(receivedSession);
  const expectedBuffer = Buffer.from(expectedSession);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function getSupabaseSettings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function getOrderProductValue(order: Order) {
  const productsTotal = toNumber(order.products_total);
  if (productsTotal > 0) return productsTotal;

  return Math.max(
    toNumber(order.total_price) - toNumber(order.delivery_fee),
    0
  );
}

function isSameMonth(dateValue: string, now: Date) {
  const date = new Date(dateValue);
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

function sumEntries(entries: CashflowEntry[]) {
  return entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
}

async function loadCashflowData(settings: { url: string; key: string }) {
  const headers = {
    apikey: settings.key,
    "Content-Type": "application/json",
  };

  const [ordersResponse, entriesResponse] = await Promise.all([
    fetch(
      `${settings.url}/rest/v1/orders?select=id,status,products_total,total_price,delivery_fee,created_at&order=created_at.desc`,
      { headers, cache: "no-store" }
    ),
    fetch(
      `${settings.url}/rest/v1/cashflow_entries?select=*&order=entry_date.desc,created_at.desc`,
      { headers, cache: "no-store" }
    ),
  ]);

  if (!ordersResponse.ok || !entriesResponse.ok) {
    const [ordersError, entriesError] = await Promise.all([
      ordersResponse.ok ? Promise.resolve("") : ordersResponse.text(),
      entriesResponse.ok ? Promise.resolve("") : entriesResponse.text(),
    ]);

    console.error("Cashflow load error", { ordersError, entriesError });
    throw new Error("Could not load cash flow data.");
  }

  const orders = (await ordersResponse.json()) as Order[];
  const entries = (await entriesResponse.json()) as CashflowEntry[];
  const now = new Date();

  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const activeOrders = orders.filter(
    (order) => order.status !== "delivered" && order.status !== "cancelled"
  );

  const deliveredSales = deliveredOrders.reduce(
    (sum, order) => sum + getOrderProductValue(order),
    0
  );
  const expectedSales = activeOrders.reduce(
    (sum, order) => sum + getOrderProductValue(order),
    0
  );

  const incomeEntries = entries.filter((entry) => entry.entry_type === "income");
  const expenseEntries = entries.filter((entry) => entry.entry_type === "expense");

  const manualIncome = sumEntries(incomeEntries);
  const incomeToMe = sumEntries(
    incomeEntries.filter((entry) => entry.received_by === "me")
  );
  const incomeToAhmedSamy = sumEntries(
    incomeEntries.filter((entry) => entry.received_by === "ahmed_samy")
  );
  const unassignedIncome = sumEntries(
    incomeEntries.filter((entry) => !entry.received_by)
  );

  const expenses = sumEntries(expenseEntries);
  const expensesFromMe = sumEntries(
    expenseEntries.filter((entry) => entry.paid_by === "me")
  );
  const expensesFromAhmedSamy = sumEntries(
    expenseEntries.filter((entry) => entry.paid_by === "ahmed_samy")
  );
  const unassignedExpenses = sumEntries(
    expenseEntries.filter((entry) => !entry.paid_by)
  );

  const monthDeliveredSales = deliveredOrders
    .filter((order) => isSameMonth(order.created_at, now))
    .reduce((sum, order) => sum + getOrderProductValue(order), 0);

  const monthIncomeEntries = incomeEntries.filter((entry) =>
    isSameMonth(entry.entry_date, now)
  );
  const monthExpenseEntries = expenseEntries.filter((entry) =>
    isSameMonth(entry.entry_date, now)
  );

  const monthManualIncome = sumEntries(monthIncomeEntries);
  const monthIncomeToMe = sumEntries(
    monthIncomeEntries.filter((entry) => entry.received_by === "me")
  );
  const monthIncomeToAhmedSamy = sumEntries(
    monthIncomeEntries.filter((entry) => entry.received_by === "ahmed_samy")
  );
  const monthExpenses = sumEntries(monthExpenseEntries);
  const monthExpensesFromMe = sumEntries(
    monthExpenseEntries.filter((entry) => entry.paid_by === "me")
  );
  const monthExpensesFromAhmedSamy = sumEntries(
    monthExpenseEntries.filter((entry) => entry.paid_by === "ahmed_samy")
  );

  const categoryTotals = expenseEntries.reduce<Record<string, number>>(
    (totals, entry) => {
      totals[entry.category] =
        (totals[entry.category] || 0) + toNumber(entry.amount);
      return totals;
    },
    {}
  );

  const topExpenseCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  return {
    entries,
    summary: {
      deliveredSales,
      manualIncome,
      incomeToMe,
      incomeToAhmedSamy,
      unassignedIncome,
      totalCashIn: deliveredSales + manualIncome,
      expenses,
      expensesFromMe,
      expensesFromAhmedSamy,
      unassignedExpenses,
      netCash: deliveredSales + manualIncome - expenses,
      expectedSales,
      deliveredOrders: deliveredOrders.length,
      activeOrders: activeOrders.length,
      monthCashIn: monthDeliveredSales + monthManualIncome,
      monthIncomeToMe,
      monthIncomeToAhmedSamy,
      monthExpenses,
      monthExpensesFromMe,
      monthExpensesFromAhmedSamy,
      monthNetCash:
        monthDeliveredSales + monthManualIncome - monthExpenses,
      topExpenseCategories,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const data = await loadCashflowData(settings);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Admin cashflow GET error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load cash flow." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const entryType =
      body?.entryType === "income"
        ? "income"
        : body?.entryType === "expense"
          ? "expense"
          : null;
    const category = String(body?.category || "").trim().slice(0, 80);
    const description = String(body?.description || "").trim().slice(0, 300);
    const amount = Number(body?.amount);
    const entryDate = String(body?.entryDate || "").trim();
    const paidBy: Person | null =
      body?.paidBy === "me"
        ? "me"
        : body?.paidBy === "ahmed_samy"
          ? "ahmed_samy"
          : null;
    const receivedBy: Person | null =
      body?.receivedBy === "me"
        ? "me"
        : body?.receivedBy === "ahmed_samy"
          ? "ahmed_samy"
          : null;

    if (!entryType || !category || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a valid type, category and amount." },
        { status: 400 }
      );
    }

    if (entryType === "expense" && !paidBy) {
      return NextResponse.json(
        { success: false, message: "Choose who paid this expense." },
        { status: 400 }
      );
    }

    if (entryType === "income" && !receivedBy) {
      return NextResponse.json(
        { success: false, message: "Choose who received this income." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid date." },
        { status: 400 }
      );
    }

    const response = await fetch(`${settings.url}/rest/v1/cashflow_entries`, {
      method: "POST",
      headers: {
        apikey: settings.key,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        entry_type: entryType,
        category,
        amount: Math.round(amount * 100) / 100,
        description: description || null,
        paid_by: entryType === "expense" ? paidBy : null,
        received_by: entryType === "income" ? receivedBy : null,
        entry_date: entryDate,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cashflow insert error:", errorText);
      return NextResponse.json(
        { success: false, message: "Could not save cash flow entry." },
        { status: 500 }
      );
    }

    const created = await response.json();
    return NextResponse.json({ success: true, entry: created?.[0] || null });
  } catch (error) {
    console.error("Admin cashflow POST error:", error);
    return NextResponse.json(
      { success: false, message: "Could not save cash flow entry." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const settings = getSupabaseSettings();
    if (!settings) {
      return NextResponse.json(
        { success: false, message: "Supabase settings are missing." },
        { status: 500 }
      );
    }

    const id = request.nextUrl.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid entry id." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${settings.url}/rest/v1/cashflow_entries?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: settings.key,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cashflow delete error:", errorText);
      return NextResponse.json(
        { success: false, message: "Could not delete cash flow entry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin cashflow DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "Could not delete cash flow entry." },
      { status: 500 }
    );
  }
}
