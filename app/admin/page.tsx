"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type Order = {
  id: string;
  order_number: string;

  shipping_number?: string | null;
  shipping_status?: string | null;
  label_created_at?: string | null;
  label_printed_at?: string | null;

  customer_name: string;
  phone: string;
  customer_email?: string | null;

  governorate: string;
  address: string;
  notes?: string | null;

  product_name?: string | null;
  colour: string;
  quantity: number;

  products_total: number;
  delivery_fee: number;
  total_price: number;

  payment_method?: string | null;

  status: string;
  created_at: string;
};

type WaitlistEntry = {
  id: string;
  status:
    | "waiting"
    | "notified"
    | "cancelled";
};

type WaitlistStatistics = {
  total: number;
  waiting: number;
  notified: number;
  cancelled: number;
};

const orderStatuses = [
  {
    value: "new",
    label: "New",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "shipped",
    label: "Shipped",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
  },
  {
    value: "delivered",
    label: "Delivered",
  },
  {
    value: "cancelled",
    label: "Cancelled",
  },
];

function formatWhatsAppNumber(phone: string) {
  let digits = String(phone || "").replace(
    /\D/g,
    ""
  );

  if (digits.startsWith("0020")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("20")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `20${digits.slice(1)}`;
  }

  return `20${digits}`;
}

function createWhatsAppLink(order: Order) {
  const phoneNumber =
    formatWhatsAppNumber(order.phone);

  const message = `Hello ${order.customer_name} 👋

Thank you for ordering from ORVIX.

Order Number: ${order.order_number}
Colour: ${order.colour}
Quantity: ${order.quantity}
Governorate: ${order.governorate}
Address: ${order.address}

Products Total: ${Number(
    order.products_total
  ).toLocaleString("en-GB")} EGP

Delivery Fee: ${Number(
    order.delivery_fee
  ).toLocaleString("en-GB")} EGP

Total: ${Number(
    order.total_price
  ).toLocaleString("en-GB")} EGP

Please reply with "Confirm" to confirm your order.

Thank you,
ORVIX`;

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;
}

function getStatusLabel(status: string) {
  const matchingStatus =
    orderStatuses.find(
      (item) => item.value === status
    );

  return (
    matchingStatus?.label ||
    status
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )
  );
}

function getStatusClasses(status: string) {
  if (status === "delivered") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (status === "out_for_delivery") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (status === "shipped") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (status === "confirmed") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  return "border-white/15 bg-white/10 text-white";
}

function getShippingStatusLabel(
  status?: string | null
) {
  if (status === "ready_to_print") {
    return "Ready to Print";
  }

  if (status === "printed") {
    return "Printed";
  }

  if (status === "shipped") {
    return "Shipped";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  if (status === "returned") {
    return "Returned";
  }

  return status
    ? status.replaceAll("_", " ")
    : "Ready to Print";
}

function getPaymentMethodName(
  method?: string | null
) {
  if (method === "instapay_on_delivery") {
    return "InstaPay عند الاستلام";
  }

  if (method === "cash_on_delivery") {
    return "كاش عند الاستلام";
  }

  if (method === "paid") {
    return "مدفوع مسبقًا";
  }

  return method || "الدفع عند الاستلام";
}

function formatMoney(
  value: number | string | null | undefined
) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toLocaleString("en-GB");
}

function splitIntoPages<T>(
  items: T[],
  pageSize: number
) {
  const pages: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += pageSize
  ) {
    pages.push(
      items.slice(index, index + pageSize)
    );
  }

  return pages;
}

export default function AdminPage() {
  const [password, setPassword] =
    useState("");

  const [orders, setOrders] = useState<
    Order[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] = useState<
    "success" | "error" | ""
  >("");

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState<string | null>(null);

  const [totalViews, setTotalViews] =
    useState(0);

  const [viewsToday, setViewsToday] =
    useState(0);

  const [
    waitlistStatistics,
    setWaitlistStatistics,
  ] = useState<WaitlistStatistics>({
    total: 0,
    waiting: 0,
    notified: 0,
    cancelled: 0,
  });

  const [
    resettingOrders,
    setResettingOrders,
  ] = useState(false);

  const [
    selectedOrderIds,
    setSelectedOrderIds,
  ] = useState<string[]>([]);

  const [
    labelsPerPage,
    setLabelsPerPage,
  ] = useState<2 | 3>(3);

  const [
    printOrders,
    setPrintOrders,
  ] = useState<Order[]>([]);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const ordersResponse = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store",
        }
      );

      if (
        ordersResponse.status === 401
      ) {
        setAuthenticated(false);
        setOrders([]);
        setSelectedOrderIds([]);

        setWaitlistStatistics({
          total: 0,
          waiting: 0,
          notified: 0,
          cancelled: 0,
        });

        return;
      }

      const ordersResult =
        await ordersResponse.json();

      if (
        !ordersResponse.ok ||
        !ordersResult.success
      ) {
        throw new Error(
          ordersResult.message ||
            "Could not load orders."
        );
      }

      const receivedOrders: Order[] =
        Array.isArray(ordersResult.orders)
          ? ordersResult.orders
          : [];

      setAuthenticated(true);
      setOrders(receivedOrders);

      setSelectedOrderIds((currentIds) =>
        currentIds.filter((id) =>
          receivedOrders.some(
            (order) => order.id === id
          )
        )
      );

      const viewsResponse = await fetch(
        "/api/admin/views",
        {
          cache: "no-store",
        }
      );

      if (viewsResponse.ok) {
        const viewsResult =
          await viewsResponse.json();

        if (viewsResult.success) {
          setTotalViews(
            Number(
              viewsResult.totalViews || 0
            )
          );

          setViewsToday(
            Number(
              viewsResult.viewsToday || 0
            )
          );
        }
      }

      const waitlistResponse =
        await fetch(
          "/api/admin/waitlist",
          {
            cache: "no-store",
          }
        );

      if (waitlistResponse.ok) {
        const waitlistResult =
          await waitlistResponse.json();

        if (waitlistResult.success) {
          const entries: WaitlistEntry[] =
            Array.isArray(
              waitlistResult.entries
            )
              ? waitlistResult.entries
              : [];

          setWaitlistStatistics({
            total: entries.length,

            waiting: entries.filter(
              (entry) =>
                entry.status ===
                "waiting"
            ).length,

            notified: entries.filter(
              (entry) =>
                entry.status ===
                "notified"
            ).length,

            cancelled: entries.filter(
              (entry) =>
                entry.status ===
                "cancelled"
            ).length,
          });
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load dashboard."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const savedPageSize =
      window.localStorage.getItem(
        "orvix-dashboard-labels-per-page"
      );

    if (
      savedPageSize === "2" ||
      savedPageSize === "3"
    ) {
      setLabelsPerPage(
        Number(savedPageSize) as 2 | 3
      );
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "orvix-dashboard-labels-per-page",
      String(labelsPerPage)
    );
  }, [labelsPerPage]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoginLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            password,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Incorrect password."
        );
      }

      setPassword("");
      setAuthenticated(true);

      await loadDashboard();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not log in."
      );

      setMessageType("error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function updateOrderStatus(
    orderId: string,
    status: string
  ) {
    const isValidStatus =
      orderStatuses.some(
        (item) => item.value === status
      );

    if (!isValidStatus) {
      setMessage(
        "This order status is not valid."
      );

      setMessageType("error");

      return;
    }

    setUpdatingOrderId(orderId);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/order-status",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            orderId,
            status,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not update order status."
        );
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order
        )
      );

      setMessage(
        `Order status updated to ${getStatusLabel(
          status
        )}.`
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update order status."
      );

      setMessageType("error");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function resetAllOrders() {
    const confirmation = window.prompt(
      "To delete all orders permanently, type: DELETE ALL ORDERS"
    );

    if (
      confirmation !==
      "DELETE ALL ORDERS"
    ) {
      if (confirmation !== null) {
        setMessage(
          "Orders were not deleted. Confirmation text was incorrect."
        );

        setMessageType("error");
      }

      return;
    }

    setResettingOrders(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/reset-orders",
        {
          method: "DELETE",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            confirmation,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not delete the orders."
        );
      }

      setOrders([]);
      setSelectedOrderIds([]);
      setPrintOrders([]);

      setMessage(
        "All old orders were deleted successfully."
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the orders."
      );

      setMessageType("error");
    } finally {
      setResettingOrders(false);
    }
  }

  function toggleOrderSelection(
    orderId: string
  ) {
    setSelectedOrderIds(
      (currentIds) =>
        currentIds.includes(orderId)
          ? currentIds.filter(
              (id) => id !== orderId
            )
          : [...currentIds, orderId]
    );
  }

  function selectAllOrders() {
    setSelectedOrderIds(
      orders.map((order) => order.id)
    );
  }

  function clearSelectedOrders() {
    setSelectedOrderIds([]);
  }

  function printOneOrder(order: Order) {
    setPrintOrders([order]);

    window.setTimeout(() => {
      window.print();
    }, 200);
  }

  function printSelectedLabels() {
    const selectedOrders =
      orders.filter((order) =>
        selectedOrderIds.includes(order.id)
      );

    if (selectedOrders.length === 0) {
      window.alert(
        "Select at least one order first."
      );

      return;
    }

    setPrintOrders(selectedOrders);

    window.setTimeout(() => {
      window.print();
    }, 200);
  }

  function saveOrderAsPng(order: Order) {
    const canvas =
      document.createElement("canvas");

    canvas.width = 1600;
    canvas.height = 900;

    const context =
      canvas.getContext("2d");

    if (!context) {
      window.alert(
        "Your browser cannot save this image."
      );

      return;
    }

    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.strokeStyle = "#111111";
    context.lineWidth = 8;

    context.strokeRect(
      20,
      20,
      canvas.width - 40,
      canvas.height - 40
    );

    context.fillStyle = "#111111";

    context.direction = "ltr";
    context.textAlign = "left";
    context.font = "900 70px Arial";

    context.fillText(
      "ORVIX",
      60,
      105
    );

    context.direction = "rtl";
    context.textAlign = "right";

    context.font = "bold 31px Arial";

    context.fillText(
      `رقم الطلب: ${
        order.order_number || "-"
      }`,
      canvas.width - 60,
      75
    );

    context.font = "29px Arial";

    context.fillText(
      `رقم الشحنة: ${
        order.shipping_number || "-"
      }`,
      canvas.width - 60,
      120
    );

    context.beginPath();

    context.moveTo(55, 155);

    context.lineTo(
      canvas.width - 55,
      155
    );

    context.lineWidth = 5;
    context.stroke();

    const rows: Array<{
      title: string;
      value: string;
      direction?: "rtl" | "ltr";
    }> = [
      {
        title: "اسم العميل",
        value:
          order.customer_name || "-",
      },
      {
        title: "رقم الهاتف",
        value: order.phone || "-",
        direction: "ltr",
      },
      {
        title: "المحافظة",
        value:
          order.governorate || "-",
      },
      {
        title: "العنوان",
        value: order.address || "-",
      },
      {
        title: "المنتج",
        value: `${
          order.product_name ||
          "Google Fitbit Air"
        } - ${order.colour}`,
      },
      {
        title: "الكمية",
        value: String(order.quantity),
      },
      {
        title: "طريقة الدفع",
        value: getPaymentMethodName(
          order.payment_method
        ),
      },
      {
        title: "ملاحظات",
        value: order.notes || "-",
      },
    ];

    let currentY = 220;

    rows.forEach(
      ({
        title,
        value,
        direction = "rtl",
      }) => {
        context.direction = "rtl";
        context.textAlign = "right";
        context.font =
          "bold 31px Arial";

        context.fillText(
          `${title}:`,
          canvas.width - 60,
          currentY
        );

        context.direction = direction;
        context.textAlign = "right";
        context.font = "29px Arial";

        context.fillText(
          value || "-",
          canvas.width - 310,
          currentY,
          canvas.width - 390
        );

        currentY += 60;
      }
    );

    const totalBoxY =
      canvas.height - 145;

    context.fillStyle = "#f3f3f3";

    context.fillRect(
      55,
      totalBoxY,
      canvas.width - 110,
      90
    );

    context.strokeStyle = "#111111";
    context.lineWidth = 5;

    context.strokeRect(
      55,
      totalBoxY,
      canvas.width - 110,
      90
    );

    context.fillStyle = "#111111";
    context.direction = "rtl";
    context.textAlign = "center";

    context.font = "bold 39px Arial";

    context.fillText(
      `المبلغ المطلوب تحصيله: ${formatMoney(
        order.total_price
      )} جنيه`,
      canvas.width / 2,
      totalBoxY + 58
    );

    const imageUrl =
      canvas.toDataURL("image/png");

    const downloadLink =
      document.createElement("a");

    downloadLink.href = imageUrl;

    downloadLink.download = `${
      order.order_number ||
      "shipping-label"
    }.png`;

    document.body.appendChild(
      downloadLink
    );

    downloadLink.click();

    document.body.removeChild(
      downloadLink
    );
  }

  const totalSales = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.total_price || 0
          ),
        0
      ),
    [orders]
  );

  const todayOrders = useMemo(() => {
    const today =
      new Date().toDateString();

    return orders.filter(
      (order) =>
        new Date(
          order.created_at
        ).toDateString() === today
    ).length;
  }, [orders]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !==
            "delivered" &&
          order.status !== "cancelled"
      ).length,
    [orders]
  );

  const readyToPrintOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            !order.shipping_status ||
            order.shipping_status ===
              "ready_to_print"
        ).length,
      [orders]
    );

  const selectedOrders = useMemo(
    () =>
      orders.filter((order) =>
        selectedOrderIds.includes(
          order.id
        )
      ),
    [orders, selectedOrderIds]
  );

  const printPages = useMemo(
    () =>
      splitIntoPages(
        printOrders,
        labelsPerPage
      ),
    [printOrders, labelsPerPage]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7"
        >
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            ORVIX Admin
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Dashboard Login
          </h1>

          <p className="mt-4 leading-7 text-gray-400">
            Enter the admin password to
            manage products, orders,
            reviews, discount codes and
            shipping labels.
          </p>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value
              );

              setMessage("");
              setMessageType("");
            }}
            placeholder="Enter admin password"
            autoComplete="current-password"
            className="mt-8 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white"
          />

          {message && (
            <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={
              loginLoading ||
              !password.trim()
            }
            className="mt-6 w-full rounded-2xl bg-white px-5 py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loginLoading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      <main className="screenOnly min-h-screen bg-[#070707] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Dashboard
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              Manage products, orders,
              shipping labels, reviews and
              website activity.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/orders"
                className="inline-flex items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-center font-bold text-blue-300 transition hover:bg-blue-500/20"
              >
                Manage Shipping Labels
              </Link>

              <Link
                href="/admin/discounts"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-4 text-center font-bold text-black transition hover:bg-gray-200"
              >
                Manage Discount Codes
              </Link>

              <Link
                href="/admin/reviews"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-bold text-white transition hover:bg-white/10"
              >
                Manage Reviews
              </Link>

              <Link
                href="/admin/waitlist"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-bold text-white transition hover:bg-white/10"
              >
                Manage Garmin Waitlist
              </Link>

              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-center font-bold text-green-300 transition hover:bg-green-500/20"
              >
                Manage Products
              </Link>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="rounded-2xl border border-white/15 px-5 py-4 font-semibold transition hover:bg-white/10 disabled:opacity-50"
              >
                Refresh Dashboard
              </button>

              <button
                type="button"
                onClick={resetAllOrders}
                disabled={
                  resettingOrders ||
                  orders.length === 0
                }
                className="rounded-2xl bg-red-600 px-5 py-4 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resettingOrders
                  ? "Deleting..."
                  : "Reset All Orders"}
              </button>
            </div>
          </header>

          {message && (
            <p
              className={`mt-6 rounded-2xl border p-4 ${
                messageType === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Total views
              </p>

              <p className="mt-3 text-4xl font-black">
                {totalViews}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Views today
              </p>

              <p className="mt-3 text-4xl font-black">
                {viewsToday}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Total orders
              </p>

              <p className="mt-3 text-4xl font-black">
                {orders.length}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Orders today
              </p>

              <p className="mt-3 text-4xl font-black">
                {todayOrders}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Active orders
              </p>

              <p className="mt-3 text-4xl font-black">
                {activeOrders}
              </p>
            </div>

            <div className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
              <p className="text-blue-200">
                Ready to print
              </p>

              <p className="mt-3 text-4xl font-black text-blue-300">
                {readyToPrintOrders}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-gray-400">
                Total sales
              </p>

              <p className="mt-3 text-3xl font-black">
                {totalSales.toLocaleString(
                  "en-GB"
                )}{" "}
                EGP
              </p>
            </div>

            <Link
              href="/admin/products"
              className="rounded-3xl border border-green-500/20 bg-green-500/10 p-6 transition hover:-translate-y-1 hover:bg-green-500/15"
            >
              <p className="text-green-200">
                Products
              </p>

              <p className="mt-3 text-xl font-black text-green-300">
                Manage Everything
              </p>

              <p className="mt-4 text-sm font-bold text-green-200/60">
                Add, edit and control →
              </p>
            </Link>

            <Link
              href="/admin/waitlist"
              className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/10"
            >
              <p className="text-gray-400">
                Garmin Waitlist
              </p>

              <p className="mt-3 text-4xl font-black">
                {waitlistStatistics.total}
              </p>
            </Link>

            <Link
              href="/admin/waitlist"
              className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 transition hover:-translate-y-1 hover:bg-yellow-500/15"
            >
              <p className="text-yellow-200">
                Waiting
              </p>

              <p className="mt-3 text-4xl font-black text-yellow-300">
                {waitlistStatistics.waiting}
              </p>
            </Link>

            <Link
              href="/admin/waitlist"
              className="rounded-3xl border border-green-500/20 bg-green-500/10 p-6 transition hover:-translate-y-1 hover:bg-green-500/15"
            >
              <p className="text-green-200">
                Notified
              </p>

              <p className="mt-3 text-4xl font-black text-green-300">
                {waitlistStatistics.notified}
              </p>
            </Link>

            <Link
              href="/admin/waitlist"
              className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 transition hover:-translate-y-1 hover:bg-red-500/15"
            >
              <p className="text-red-200">
                Cancelled
              </p>

              <p className="mt-3 text-4xl font-black text-red-300">
                {waitlistStatistics.cancelled}
              </p>
            </Link>
          </section>

          <section className="mt-8 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
                  Shipping Labels
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Print selected orders
                </h2>

                <p className="mt-2 text-sm text-blue-100/60">
                  Selected{" "}
                  {selectedOrders.length} of{" "}
                  {orders.length} orders.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:flex">
                <label className="flex flex-col gap-2 text-sm font-bold">
                  Labels per A4

                  <select
                    value={labelsPerPage}
                    onChange={(event) =>
                      setLabelsPerPage(
                        Number(
                          event.target.value
                        ) as 2 | 3
                      )
                    }
                    className="rounded-xl bg-white px-4 py-3 text-black outline-none"
                  >
                    <option value="3">
                      3 labels
                    </option>

                    <option value="2">
                      2 labels
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={selectAllOrders}
                  disabled={
                    orders.length === 0
                  }
                  className="rounded-xl border border-white/15 px-4 py-3 font-bold transition hover:bg-white/10 disabled:opacity-40"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={
                    clearSelectedOrders
                  }
                  disabled={
                    selectedOrderIds.length ===
                    0
                  }
                  className="rounded-xl border border-white/15 px-4 py-3 font-bold transition hover:bg-white/10 disabled:opacity-40"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={
                    printSelectedLabels
                  }
                  disabled={
                    selectedOrders.length ===
                    0
                  }
                  className="rounded-xl bg-blue-500 px-5 py-3 font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Print Selected
                </button>
              </div>
            </div>
          </section>

          <section className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Orders
              </h2>

              <p className="text-sm text-gray-500">
                {orders.length} total
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-gray-400">
                No orders yet.
              </div>
            ) : (
              orders.map((order) => {
                const isUpdating =
                  updatingOrderId ===
                  order.id;

                const isSelected =
                  selectedOrderIds.includes(
                    order.id
                  );

                return (
                  <article
                    key={order.id}
                    className={`rounded-3xl border p-5 transition sm:p-6 ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          toggleOrderSelection(
                            order.id
                          )
                        }
                        className="h-5 w-5 cursor-pointer accent-blue-500"
                      />

                      <span className="text-sm font-bold text-gray-300">
                        Select for printing
                      </span>
                    </div>

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          Order #
                          {order.order_number}
                        </p>

                        <h3 className="mt-1 text-2xl font-bold">
                          {
                            order.customer_name
                          }
                        </h3>

                        <p
                          dir="ltr"
                          className="mt-1 text-left text-gray-400"
                        >
                          {order.phone}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <div
                            className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${getStatusClasses(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </div>

                          <div className="w-fit rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-300">
                            {getShippingStatusLabel(
                              order.shipping_status
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-64">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                          Order Status
                        </label>

                        <select
                          value={order.status}
                          disabled={isUpdating}
                          onChange={(event) =>
                            updateOrderStatus(
                              order.id,
                              event.target.value
                            )
                          }
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {orderStatuses.map(
                            (status) => (
                              <option
                                key={
                                  status.value
                                }
                                value={
                                  status.value
                                }
                              >
                                {status.label}
                              </option>
                            )
                          )}
                        </select>

                        {isUpdating && (
                          <p className="mt-2 text-xs text-gray-500">
                            Updating status...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-black/40 p-4">
                        <p className="text-gray-500">
                          Shipping Number
                        </p>

                        <p className="mt-1 break-all font-semibold">
                          {order.shipping_number ||
                            "Not available"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-black/40 p-4">
                        <p className="text-gray-500">
                          Colour
                        </p>

                        <p className="mt-1 font-semibold">
                          {order.colour}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-black/40 p-4">
                        <p className="text-gray-500">
                          Quantity
                        </p>

                        <p className="mt-1 font-semibold">
                          {order.quantity}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-black/40 p-4">
                        <p className="text-gray-500">
                          Governorate
                        </p>

                        <p className="mt-1 font-semibold">
                          {
                            order.governorate
                          }
                        </p>
                      </div>

                      <div className="rounded-2xl bg-black/40 p-4">
                        <p className="text-gray-500">
                          Total
                        </p>

                        <p className="mt-1 font-semibold">
                          {formatMoney(
                            order.total_price
                          )}{" "}
                          EGP
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-gray-500">
                        Address
                      </p>

                      <p className="mt-2 leading-7">
                        {order.address}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          printOneOrder(order)
                        }
                        className="flex w-full items-center justify-center rounded-2xl bg-blue-500 px-5 py-4 text-center font-black text-white transition hover:bg-blue-400"
                      >
                        Print Shipping Label
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          saveOrderAsPng(order)
                        }
                        className="flex w-full items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-center font-black text-blue-300 transition hover:bg-blue-500/20"
                      >
                        Save Label PNG
                      </button>

                      <Link
                        href="/admin/orders"
                        className="flex w-full items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-black text-white transition hover:bg-white/10"
                      >
                        Edit Shipping Label
                      </Link>

                      <a
                        href={createWhatsAppLink(
                          order
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center rounded-2xl bg-[#25D366] px-5 py-4 text-center font-black text-black transition hover:brightness-110"
                      >
                        Confirm on WhatsApp
                      </a>

                      <Link
                        href={`/track-order?orderNumber=${encodeURIComponent(
                          order.order_number
                        )}`}
                        target="_blank"
                        className="flex w-full items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-black text-white transition hover:bg-white/10"
                      >
                        Open Tracking Page
                      </Link>
                    </div>

                    <p className="mt-4 text-xs text-gray-500">
                      {new Date(
                        order.created_at
                      ).toLocaleString(
                        "en-GB"
                      )}
                    </p>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </main>

      <section className="printArea">
        {printPages.map(
          (pageOrders, pageIndex) => (
            <div
              className="a4Sheet"
              key={`page-${pageIndex}`}
              style={{
                gridTemplateRows: `repeat(${labelsPerPage}, minmax(0, 1fr))`,
              }}
            >
              {pageOrders.map((order) => (
                <ShippingLabel
                  key={order.id}
                  order={order}
                />
              ))}
            </div>
          )
        )}
      </section>

      <style jsx global>{`
        .printArea {
          display: none;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          html,
          body {
            width: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .screenOnly {
            display: none !important;
          }

          .printArea {
            display: block !important;
            margin: 0;
            padding: 0;
            background: white;
          }

          .a4Sheet {
            display: grid;
            gap: 4mm;
            width: 210mm;
            height: 297mm;
            padding: 7mm;
            background: white;
            break-after: page;
            page-break-after: always;
          }

          .a4Sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </>
  );
}

function ShippingLabel({
  order,
}: {
  order: Order;
}) {
  return (
    <article
      className="shippingLabel"
      dir="rtl"
    >
      <header className="shippingHeader">
        <div className="brand">
          ORVIX
        </div>

        <div className="numbers">
          <strong>
            رقم الطلب:{" "}
            {order.order_number || "-"}
          </strong>

          <span>
            رقم الشحنة:{" "}
            {order.shipping_number || "-"}
          </span>
        </div>
      </header>

      <div className="informationGrid">
        <LabelInformation
          title="اسم العميل"
          value={order.customer_name}
        />

        <LabelInformation
          title="رقم الهاتف"
          value={order.phone}
          direction="ltr"
        />

        <LabelInformation
          title="المحافظة"
          value={order.governorate}
        />

        <LabelInformation
          title="العنوان"
          value={order.address}
        />

        <LabelInformation
          title="المنتج"
          value={`${
            order.product_name ||
            "Google Fitbit Air"
          } - ${order.colour}`}
        />

        <LabelInformation
          title="الكمية"
          value={String(order.quantity)}
        />

        <LabelInformation
          title="طريقة الدفع"
          value={getPaymentMethodName(
            order.payment_method
          )}
        />

        <LabelInformation
          title="ملاحظات"
          value={order.notes || "-"}
        />
      </div>

      <footer className="shippingFooter">
        <span>
          المبلغ المطلوب تحصيله
        </span>

        <strong>
          {formatMoney(
            order.total_price
          )}{" "}
          جنيه
        </strong>
      </footer>

      <style jsx>{`
        .shippingLabel {
          display: flex;
          flex-direction: column;
          min-height: 0;
          padding: 4mm;
          border: 0.7mm solid #111111;
          border-radius: 2mm;
          background: white;
          color: #111111;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }

        .shippingHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5mm;
          padding-bottom: 2.5mm;
          border-bottom: 0.7mm solid
            #111111;
        }

        .brand {
          direction: ltr;
          font-size: 8mm;
          font-weight: 900;
          letter-spacing: 1mm;
        }

        .numbers {
          display: flex;
          flex-direction: column;
          gap: 1mm;
          text-align: right;
          font-size: 3.6mm;
          overflow-wrap: anywhere;
        }

        .numbers strong {
          font-size: 4.1mm;
        }

        .informationGrid {
          display: grid;
          grid-template-columns: repeat(
            2,
            minmax(0, 1fr)
          );
          gap: 2mm 5mm;
          flex: 1;
          padding: 3mm 0;
          overflow: hidden;
        }

        .shippingFooter {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2mm;
          padding: 2.5mm;
          border: 0.6mm solid #111111;
          background: #f2f2f2;
          font-size: 4.1mm;
          font-weight: bold;
        }

        .shippingFooter strong {
          font-size: 5mm;
        }
      `}</style>
    </article>
  );
}

function LabelInformation({
  title,
  value,
  direction = "rtl",
}: {
  title: string;
  value: string;
  direction?: "rtl" | "ltr";
}) {
  return (
    <div className="information">
      <strong>{title}:</strong>

      <span
        dir={direction}
        className={
          direction === "ltr"
            ? "ltrValue"
            : ""
        }
      >
        {value || "-"}
      </span>

      <style jsx>{`
        .information {
          display: flex;
          gap: 1.5mm;
          min-width: 0;
          font-size: 3.7mm;
          line-height: 1.35;
        }

        strong {
          flex-shrink: 0;
        }

        span {
          overflow-wrap: anywhere;
        }

        .ltrValue {
          direction: ltr;
          unicode-bidi: isolate;
          display: inline-block;
          text-align: right;
        }
      `}</style>
    </div>
  );
}