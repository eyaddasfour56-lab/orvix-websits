import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { postgrestValue, supabaseAdminJson } from "@/lib/supabase-admin";

type Person = "me" | "ahmed_samy";
type EntryType = "income" | "expense" | "capital" | "settlement";

type Order = {
  id: string;
  status: string;
  product_slug?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  products_total?: number | string | null;
  total_price?: number | string | null;
  delivery_fee?: number | string | null;
  unit_cost_at_sale?: number | string | null;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  unit_cost: number | string;
};

type CashflowEntry = {
  id: string;
  entry_type: EntryType;
  category: string;
  amount: number | string;
  description?: string | null;
  paid_by?: Person | null;
  received_by?: Person | null;
  from_person?: Person | null;
  to_person?: Person | null;
  receipt_path?: string | null;
  receipt_name?: string | null;
  entry_date: string;
  created_at: string;
  updated_at?: string | null;
};

type ParsedEntry = {
  entryType: EntryType;
  category: string;
  amount: number;
  description: string;
  paidBy: Person | null;
  receivedBy: Person | null;
  fromPerson: Person | null;
  toPerson: Person | null;
  entryDate: string;
};

const PEOPLE: Person[] = ["me", "ahmed_samy"];

function isPerson(value: unknown): value is Person {
  return typeof value === "string" && PEOPLE.includes(value as Person);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function sumEntries(entries: CashflowEntry[]) {
  return entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
}

function getOrderProductValue(order: Order) {
  const productsTotal = toNumber(order.products_total);
  if (productsTotal > 0) return productsTotal;
  return Math.max(toNumber(order.total_price) - toNumber(order.delivery_fee), 0);
}

function monthKey(value: string) {
  if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

function isStockExpense(entry: CashflowEntry) {
  return entry.category.trim().toLowerCase().startsWith("stock");
}

function getEffectiveUnitCost(order: Order, productCosts: Record<string, number>) {
  const frozen = Number(order.unit_cost_at_sale);
  if (Number.isFinite(frozen) && frozen > 0) return frozen;
  const slug = String(order.product_slug || "");
  return Math.max(productCosts[slug] || 0, 0);
}

function parseEntryBody(body: Record<string, unknown>): ParsedEntry | { error: string } {
  const rawType = String(body.entryType || "").trim();
  const entryType: EntryType | null =
    rawType === "income" || rawType === "expense" || rawType === "capital" || rawType === "settlement"
      ? rawType
      : null;
  const category = String(body.category || "").trim().slice(0, 80);
  const description = String(body.description || "").trim().slice(0, 300);
  const amount = Number(body.amount);
  const entryDate = String(body.entryDate || "").trim();
  const paidBy = isPerson(body.paidBy) ? body.paidBy : null;
  const receivedBy = isPerson(body.receivedBy) ? body.receivedBy : null;
  const fromPerson = isPerson(body.fromPerson) ? body.fromPerson : null;
  const toPerson = isPerson(body.toPerson) ? body.toPerson : null;

  if (!entryType || !category || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid type, category and amount." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return { error: "Enter a valid date." };
  }
  if ((entryType === "expense" || entryType === "capital") && !paidBy) {
    return { error: entryType === "expense" ? "Choose who paid this expense." : "Choose who invested this capital." };
  }
  if (entryType === "income" && !receivedBy) {
    return { error: "Choose who received this income." };
  }
  if (entryType === "settlement" && (!fromPerson || !toPerson || fromPerson === toPerson)) {
    return { error: "Choose two different people for the settlement." };
  }

  return {
    entryType,
    category,
    amount: Math.round(amount * 100) / 100,
    description,
    paidBy,
    receivedBy,
    fromPerson,
    toPerson,
    entryDate,
  };
}

function entryPayload(parsed: ParsedEntry) {
  return {
    entry_type: parsed.entryType,
    category: parsed.category,
    amount: parsed.amount,
    description: parsed.description || null,
    paid_by: parsed.entryType === "expense" || parsed.entryType === "capital" ? parsed.paidBy : null,
    received_by: parsed.entryType === "income" ? parsed.receivedBy : null,
    from_person: parsed.entryType === "settlement" ? parsed.fromPerson : null,
    to_person: parsed.entryType === "settlement" ? parsed.toPerson : null,
    entry_date: parsed.entryDate,
    updated_at: new Date().toISOString(),
  };
}

async function loadCashflowData() {
  const [orders, entries, products] = await Promise.all([
    supabaseAdminJson<Order[]>(
      "orders?select=id,status,product_slug,product_name,quantity,products_total,total_price,delivery_fee,unit_cost_at_sale,created_at&order=created_at.desc"
    ),
    supabaseAdminJson<CashflowEntry[]>("cashflow_entries?select=*&order=entry_date.desc,created_at.desc"),
    supabaseAdminJson<Product[]>("products?select=id,name,slug,price,unit_cost&order=display_order.asc,created_at.asc"),
  ]);

  const productCosts = Object.fromEntries(products.map((product) => [product.slug, toNumber(product.unit_cost)]));
  const deliveredOrders = orders.filter((order) => order.status === "delivered");
  const activeOrders = orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled");
  const expenseEntries = entries.filter((entry) => entry.entry_type === "expense");
  const incomeEntries = entries.filter((entry) => entry.entry_type === "income");
  const capitalEntries = entries.filter((entry) => entry.entry_type === "capital");
  const settlementEntries = entries.filter((entry) => entry.entry_type === "settlement");
  const operatingExpenses = expenseEntries.filter((entry) => !isStockExpense(entry));

  const deliveredSales = deliveredOrders.reduce((sum, order) => sum + getOrderProductValue(order), 0);
  const manualIncome = sumEntries(incomeEntries);
  const capital = sumEntries(capitalEntries);
  const expenses = sumEntries(expenseEntries);
  const operatingExpenseTotal = sumEntries(operatingExpenses);
  const stockPurchases = expenses - operatingExpenseTotal;
  const cogs = deliveredOrders.reduce(
    (sum, order) => sum + toNumber(order.quantity) * getEffectiveUnitCost(order, productCosts),
    0
  );
  const totalCashIn = deliveredSales + manualIncome + capital;
  const netCash = totalCashIn - expenses;
  const realProfit = deliveredSales + manualIncome - cogs - operatingExpenseTotal;
  const expectedSales = activeOrders.reduce((sum, order) => sum + getOrderProductValue(order), 0);

  const expensesFromMe = sumEntries(expenseEntries.filter((entry) => entry.paid_by === "me"));
  const expensesFromAhmedSamy = sumEntries(expenseEntries.filter((entry) => entry.paid_by === "ahmed_samy"));
  const incomeToMe = sumEntries(incomeEntries.filter((entry) => entry.received_by === "me"));
  const incomeToAhmedSamy = sumEntries(incomeEntries.filter((entry) => entry.received_by === "ahmed_samy"));
  const capitalFromMe = sumEntries(capitalEntries.filter((entry) => entry.paid_by === "me"));
  const capitalFromAhmedSamy = sumEntries(capitalEntries.filter((entry) => entry.paid_by === "ahmed_samy"));

  const settlementsSentByMe = sumEntries(settlementEntries.filter((entry) => entry.from_person === "me"));
  const settlementsSentByAhmed = sumEntries(settlementEntries.filter((entry) => entry.from_person === "ahmed_samy"));
  const settlementsReceivedByMe = sumEntries(settlementEntries.filter((entry) => entry.to_person === "me"));
  const settlementsReceivedByAhmed = sumEntries(settlementEntries.filter((entry) => entry.to_person === "ahmed_samy"));

  const partnerPositionMe =
    expensesFromMe + capitalFromMe + settlementsSentByMe - incomeToMe - settlementsReceivedByMe;
  const partnerPositionAhmed =
    expensesFromAhmedSamy + capitalFromAhmedSamy + settlementsSentByAhmed - incomeToAhmedSamy - settlementsReceivedByAhmed;
  const positionDifference = partnerPositionMe - partnerPositionAhmed;
  const settlementAmount = Math.round((Math.abs(positionDifference) / 2) * 100) / 100;
  const suggestedSettlement =
    settlementAmount < 0.01
      ? null
      : positionDifference > 0
        ? { from: "ahmed_samy" as Person, to: "me" as Person, amount: settlementAmount }
        : { from: "me" as Person, to: "ahmed_samy" as Person, amount: settlementAmount };

  const categoryTotals = expenseEntries.reduce<Record<string, number>>((totals, entry) => {
    totals[entry.category] = (totals[entry.category] || 0) + toNumber(entry.amount);
    return totals;
  }, {});
  const topExpenseCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, amount]) => ({ category, amount }));

  const now = new Date();
  const monthKeys = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    return date.toISOString().slice(0, 7);
  });

  const monthlyReports = monthKeys.map((key) => {
    const monthOrders = deliveredOrders.filter((order) => monthKey(order.created_at) === key);
    const monthIncome = incomeEntries.filter((entry) => monthKey(entry.entry_date) === key);
    const monthExpenses = expenseEntries.filter((entry) => monthKey(entry.entry_date) === key);
    const monthOperatingExpenses = monthExpenses.filter((entry) => !isStockExpense(entry));
    const monthCapital = capitalEntries.filter((entry) => monthKey(entry.entry_date) === key);
    const orderRevenue = monthOrders.reduce((sum, order) => sum + getOrderProductValue(order), 0);
    const extraIncome = sumEntries(monthIncome);
    const revenue = orderRevenue + extraIncome;
    const monthCogs = monthOrders.reduce(
      (sum, order) => sum + toNumber(order.quantity) * getEffectiveUnitCost(order, productCosts),
      0
    );
    const expenseTotal = sumEntries(monthExpenses);
    const operatingTotal = sumEntries(monthOperatingExpenses);
    const monthCategoryTotals = monthExpenses.reduce<Record<string, number>>((totals, entry) => {
      totals[entry.category] = (totals[entry.category] || 0) + toNumber(entry.amount);
      return totals;
    }, {});
    const highest = Object.entries(monthCategoryTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      key,
      label: monthLabel(key),
      revenue,
      orderRevenue,
      extraIncome,
      cogs: monthCogs,
      expenses: expenseTotal,
      operatingExpenses: operatingTotal,
      stockPurchases: expenseTotal - operatingTotal,
      capital: sumEntries(monthCapital),
      profit: revenue - monthCogs - operatingTotal,
      deliveredOrders: monthOrders.length,
      highestExpense: highest ? { category: highest[0], amount: highest[1] } : null,
    };
  });

  const missingCostProducts = Array.from(
    new Map(
      deliveredOrders
        .filter((order) => getEffectiveUnitCost(order, productCosts) <= 0)
        .map((order) => [String(order.product_slug || order.product_name || order.id), {
          slug: String(order.product_slug || ""),
          name: String(order.product_name || order.product_slug || "Unknown product"),
        }])
    ).values()
  );

  return {
    entries,
    products: products.map((product) => ({ ...product, unit_cost: toNumber(product.unit_cost) })),
    summary: {
      deliveredSales,
      manualIncome,
      totalCashIn,
      capital,
      expenses,
      operatingExpenses: operatingExpenseTotal,
      stockPurchases,
      cogs,
      realProfit,
      profitShareMe: realProfit / 2,
      profitShareAhmedSamy: realProfit / 2,
      netCash,
      expectedSales,
      deliveredOrders: deliveredOrders.length,
      activeOrders: activeOrders.length,
      expensesFromMe,
      expensesFromAhmedSamy,
      incomeToMe,
      incomeToAhmedSamy,
      capitalFromMe,
      capitalFromAhmedSamy,
      partnerPositionMe,
      partnerPositionAhmed,
      suggestedSettlement,
      unassignedExpenses: sumEntries(expenseEntries.filter((entry) => !entry.paid_by)),
      unassignedIncome: sumEntries(incomeEntries.filter((entry) => !entry.received_by)),
      topExpenseCategories,
      monthlyReports,
      missingCostProducts,
    },
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const data = await loadCashflowData();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error("Admin cashflow GET error:", error);
    return NextResponse.json({ success: false, message: "Could not load cash flow." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseEntryBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }

    const created = await supabaseAdminJson<CashflowEntry[]>("cashflow_entries", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(entryPayload(parsed)),
    });

    return NextResponse.json({ success: true, entry: created?.[0] || null });
  } catch (error) {
    console.error("Admin cashflow POST error:", error);
    return NextResponse.json({ success: false, message: "Could not save cash flow entry." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "product_cost") {
      const productId = String(body.productId || "").trim();
      const unitCost = Number(body.unitCost);
      if (!/^[0-9a-f-]{36}$/i.test(productId) || !Number.isFinite(unitCost) || unitCost < 0) {
        return NextResponse.json({ success: false, message: "Enter a valid product cost." }, { status: 400 });
      }
      const updated = await supabaseAdminJson<Product[]>(
        `products?id=eq.${postgrestValue(productId)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ unit_cost: Math.round(unitCost * 100) / 100 }),
        }
      );
      if (!updated?.[0]) {
        return NextResponse.json({ success: false, message: "Product was not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, product: updated[0] });
    }

    const id = String(body.id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid entry id." }, { status: 400 });
    }
    const parsed = parseEntryBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }

    const updated = await supabaseAdminJson<CashflowEntry[]>(
      `cashflow_entries?id=eq.${postgrestValue(id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(entryPayload(parsed)),
      }
    );
    if (!updated?.[0]) {
      return NextResponse.json({ success: false, message: "Entry was not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, entry: updated[0] });
  } catch (error) {
    console.error("Admin cashflow PATCH error:", error);
    return NextResponse.json({ success: false, message: "Could not update cash flow." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ success: false, message: "Invalid entry id." }, { status: 400 });
    }
    await supabaseAdminJson<unknown>(`cashflow_entries?id=eq.${postgrestValue(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin cashflow DELETE error:", error);
    return NextResponse.json({ success: false, message: "Could not delete entry." }, { status: 500 });
  }
}
