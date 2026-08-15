"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type OrderRow = {
  id?: string | number;
  order_number: string;
  shipping_number: string | null;
  shipping_status: string | null;
  label_created_at: string | null;
  label_printed_at: string | null;

  customer_name: string;
  phone: string;
  customer_email?: string;

  governorate: string;
  address: string;
  notes: string | null;

  product_name: string;
  product_slug?: string;
  colour: string;
  quantity: number;

  product_price?: number;
  products_total?: number;
  delivery_fee?: number;
  discount_amount?: number;
  total_price: number;

  payment_method: string | null;
  status?: string;
  created_at?: string;
};

type EditableOrderField =
  | "shipping_number"
  | "customer_name"
  | "phone"
  | "governorate"
  | "address"
  | "notes"
  | "product_name"
  | "colour"
  | "quantity"
  | "total_price"
  | "payment_method";

type LabelOverrides = Record<
  string,
  Partial<OrderRow>
>;

const OVERRIDES_STORAGE_KEY =
  "orvix-shipping-label-overrides";

const PAGE_SIZE_STORAGE_KEY =
  "orvix-shipping-label-page-size";

function getOrderKey(order: OrderRow) {
  return String(
    order.id ??
      order.order_number ??
      order.shipping_number
  );
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

function formatMoney(
  value: number | string | null | undefined
) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return numberValue.toLocaleString("en-GB");
}

function getPaymentName(
  paymentMethod: string | null
) {
  if (paymentMethod === "pending_contact") {
    return "بانتظار التواصل — لا يوجد دفع";
  }

  if (
    paymentMethod ===
    "instapay_on_delivery"
  ) {
    return "InstaPay عند الاستلام";
  }

  if (paymentMethod === "cash_on_delivery") {
    return "كاش عند الاستلام";
  }

  if (paymentMethod === "paid") {
    return "مدفوع مسبقًا";
  }

  return paymentMethod || "عند الاستلام";
}

function getStatusName(
  shippingStatus: string | null
) {
  switch (shippingStatus) {
    case "pending_contact":
      return "بانتظار التواصل";

    case "ready_to_print":
      return "جاهزة للطباعة";

    case "printed":
      return "تمت الطباعة";

    case "shipped":
      return "تم الشحن";

    case "delivered":
      return "تم التسليم";

    case "returned":
      return "مرتجع";

    default:
      return shippingStatus || "جديدة";
  }
}

function readOverrides(): LabelOverrides {
  try {
    const savedValue =
      window.localStorage.getItem(
        OVERRIDES_STORAGE_KEY
      );

    if (!savedValue) {
      return {};
    }

    const parsedValue =
      JSON.parse(savedValue);

    if (
      !parsedValue ||
      typeof parsedValue !== "object"
    ) {
      return {};
    }

    return parsedValue as LabelOverrides;
  } catch {
    return {};
  }
}

function getEditableValues(
  order: OrderRow
): Partial<OrderRow> {
  return {
    shipping_number:
      order.shipping_number,

    customer_name:
      order.customer_name,

    phone: order.phone,

    governorate:
      order.governorate,

    address: order.address,

    notes: order.notes,

    product_name:
      order.product_name,

    colour: order.colour,

    quantity: order.quantity,

    total_price:
      order.total_price,

    payment_method:
      order.payment_method,
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<
    OrderRow[]
  >([]);

  const [
    selectedOrderKeys,
    setSelectedOrderKeys,
  ] = useState<string[]>([]);

  const [labelsPerPage, setLabelsPerPage] =
    useState<2 | 3>(3);

  const [searchValue, setSearchValue] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const loadOrders = useCallback(
    async (keepSelection = false) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          "/api/admin/orders",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "تعذر تحميل الطلبات."
          );
        }

        const receivedOrders = Array.isArray(
          result.orders
        )
          ? (result.orders as OrderRow[])
          : [];

        const savedOverrides =
          readOverrides();

        const mergedOrders =
          receivedOrders.map((order) => {
            const orderKey =
              getOrderKey(order);

            return {
              ...order,
              ...(savedOverrides[orderKey] ||
                {}),
            };
          });

        setOrders(mergedOrders);

        if (!keepSelection) {
          setSelectedOrderKeys(
            mergedOrders
              .filter(
                (order) =>
                  order.shipping_status ===
                  "ready_to_print"
              )
              .map(getOrderKey)
          );
        }

        setLastUpdated(new Date());
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "تعذر تحميل الطلبات."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const savedPageSize =
      window.localStorage.getItem(
        PAGE_SIZE_STORAGE_KEY
      );

    if (
      savedPageSize === "2" ||
      savedPageSize === "3"
    ) {
      setLabelsPerPage(
        Number(savedPageSize) as 2 | 3
      );
    }

    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    window.localStorage.setItem(
      PAGE_SIZE_STORAGE_KEY,
      String(labelsPerPage)
    );
  }, [labelsPerPage]);

  const filteredOrders = useMemo(() => {
    const cleanSearch =
      searchValue.trim().toLowerCase();

    if (!cleanSearch) {
      return orders;
    }

    return orders.filter((order) => {
      const searchableText = [
        order.order_number,
        order.shipping_number,
        order.customer_name,
        order.phone,
        order.customer_email,
        order.governorate,
        order.address,
        order.product_name,
        order.colour,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        cleanSearch
      );
    });
  }, [orders, searchValue]);

  const selectedOrders = useMemo(
    () =>
      orders.filter((order) =>
        selectedOrderKeys.includes(
          getOrderKey(order)
        )
      ),
    [orders, selectedOrderKeys]
  );

  const printedPages = useMemo(
    () =>
      splitIntoPages(
        selectedOrders,
        labelsPerPage
      ),
    [selectedOrders, labelsPerPage]
  );

  function updateOrder(
    orderKey: string,
    field: EditableOrderField,
    value: string | number
  ) {
    setOrders((currentOrders) => {
      const updatedOrders =
        currentOrders.map((order) =>
          getOrderKey(order) === orderKey
            ? {
                ...order,
                [field]: value,
              }
            : order
        );

      const editedOrder =
        updatedOrders.find(
          (order) =>
            getOrderKey(order) ===
            orderKey
        );

      if (editedOrder) {
        const savedOverrides =
          readOverrides();

        savedOverrides[orderKey] =
          getEditableValues(
            editedOrder
          );

        window.localStorage.setItem(
          OVERRIDES_STORAGE_KEY,
          JSON.stringify(savedOverrides)
        );
      }

      return updatedOrders;
    });
  }

  function resetOrderEdits(
    orderKey: string
  ) {
    const approved =
      window.confirm(
        "هل تريد إلغاء تعديلات هذه البوليصة؟"
      );

    if (!approved) {
      return;
    }

    const savedOverrides =
      readOverrides();

    delete savedOverrides[orderKey];

    window.localStorage.setItem(
      OVERRIDES_STORAGE_KEY,
      JSON.stringify(savedOverrides)
    );

    loadOrders(true);
  }

  function toggleOrderSelection(
    orderKey: string
  ) {
    setSelectedOrderKeys(
      (currentSelected) =>
        currentSelected.includes(
          orderKey
        )
          ? currentSelected.filter(
              (key) =>
                key !== orderKey
            )
          : [
              ...currentSelected,
              orderKey,
            ]
    );
  }

  function selectAllVisible() {
    const visibleKeys =
      filteredOrders.map(getOrderKey);

    setSelectedOrderKeys(
      (currentSelected) =>
        Array.from(
          new Set([
            ...currentSelected,
            ...visibleKeys,
          ])
        )
    );
  }

  function clearSelection() {
    setSelectedOrderKeys([]);
  }

  function printSelectedOrders() {
    if (
      selectedOrders.length === 0
    ) {
      window.alert(
        "حدد بوليصة واحدة على الأقل قبل الطباعة."
      );

      return;
    }

    window.print();
  }

  function printOneOrder(
    orderKey: string
  ) {
    setSelectedOrderKeys([orderKey]);

    window.setTimeout(() => {
      window.print();
    }, 150);
  }

  function saveOrderAsPng(
    order: OrderRow
  ) {
    const canvas =
      document.createElement("canvas");

    canvas.width = 1600;
    canvas.height = 900;

    const context =
      canvas.getContext("2d");

    if (!context) {
      window.alert(
        "المتصفح لا يدعم حفظ الصورة."
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
    context.font =
      "900 70px Arial";

    context.fillText(
      "ORVIX",
      60,
      105
    );

    context.direction = "rtl";
    context.textAlign = "right";

    context.font =
      "bold 31px Arial";

    context.fillText(
      `رقم الطلب: ${
        order.order_number || "-"
      }`,
      canvas.width - 60,
      75
    );

    context.font =
      "29px Arial";

    context.fillText(
      `رقم الشحنة: ${
        order.shipping_number || "-"
      }`,
      canvas.width - 60,
      120
    );

    context.beginPath();

    context.moveTo(
      55,
      155
    );

    context.lineTo(
      canvas.width - 55,
      155
    );

    context.lineWidth = 5;
    context.stroke();

    const rows = [
      [
        "اسم العميل",
        order.customer_name,
      ],
      ["رقم الهاتف", order.phone],
      [
        "المحافظة",
        order.governorate,
      ],
      ["العنوان", order.address],
      [
        "المنتج",
        `${order.product_name} - ${order.colour}`,
      ],
      [
        "الكمية",
        String(order.quantity),
      ],
      [
        "طريقة الدفع",
        getPaymentName(
          order.payment_method
        ),
      ],
      [
        "ملاحظات",
        order.notes || "-",
      ],
    ];

    let currentY = 220;

    rows.forEach(
      ([title, value]) => {
        context.font =
          "bold 31px Arial";

        context.fillText(
          `${title}:`,
          canvas.width - 60,
          currentY
        );

        context.font =
          "29px Arial";

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

    context.fillStyle =
      "#f3f3f3";

    context.fillRect(
      55,
      totalBoxY,
      canvas.width - 110,
      90
    );

    context.strokeStyle =
      "#111111";

    context.lineWidth = 5;

    context.strokeRect(
      55,
      totalBoxY,
      canvas.width - 110,
      90
    );

    context.fillStyle =
      "#111111";

    context.textAlign = "center";

    context.font =
      "bold 39px Arial";

    context.fillText(
      `المبلغ المطلوب تحصيله: ${formatMoney(
        order.total_price
      )} جنيه`,
      canvas.width / 2,
      totalBoxY + 58
    );

    const imageUrl =
      canvas.toDataURL(
        "image/png"
      );

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

  return (
    <main dir="rtl">
      <section className="screenOnly dashboard">
        <header className="pageHeader">
          <div>
            <p className="eyebrow">
              ORVIX ADMIN
            </p>

            <h1>
              بوالص الشحن
            </h1>

            <p className="description">
              أي طلب جديد يظهر هنا
              تلقائيًا جاهزًا للطباعة.
            </p>
          </div>

          <button
            className="refreshButton"
            onClick={() =>
              loadOrders(true)
            }
            disabled={isLoading}
          >
            {isLoading
              ? "جاري التحميل..."
              : "تحديث الطلبات"}
          </button>
        </header>

        <section className="statistics">
          <div>
            <span>
              كل الطلبات
            </span>

            <strong>
              {orders.length}
            </strong>
          </div>

          <div>
            <span>
              جاهزة للطباعة
            </span>

            <strong>
              {
                orders.filter(
                  (order) =>
                    order.shipping_status ===
                    "ready_to_print"
                ).length
              }
            </strong>
          </div>

          <div>
            <span>
              المحددة
            </span>

            <strong>
              {
                selectedOrders.length
              }
            </strong>
          </div>
        </section>

        <section className="toolbar">
          <label className="searchBox">
            بحث

            <input
              type="search"
              value={searchValue}
              onChange={(event) =>
                setSearchValue(
                  event.target.value
                )
              }
              placeholder="رقم الطلب، الاسم أو الهاتف"
            />
          </label>

          <label>
            عدد البوالص في A4

            <select
              value={labelsPerPage}
              onChange={(event) =>
                setLabelsPerPage(
                  Number(
                    event.target.value
                  ) as 2 | 3
                )
              }
            >
              <option value="3">
                3 بوالص
              </option>

              <option value="2">
                بوليصتان
              </option>
            </select>
          </label>

          <button
            onClick={selectAllVisible}
          >
            تحديد الظاهر
          </button>

          <button
            onClick={clearSelection}
          >
            إلغاء التحديد
          </button>

          <button
            className="printButton"
            onClick={
              printSelectedOrders
            }
          >
            طباعة المحدد
          </button>
        </section>

        {lastUpdated && (
          <p className="lastUpdated">
            آخر تحديث:{" "}
            {lastUpdated.toLocaleTimeString(
              "ar-EG"
            )}
          </p>
        )}

        {errorMessage && (
          <div
            className="errorMessage"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {isLoading &&
          orders.length === 0 && (
            <div className="emptyState">
              جاري تحميل الطلبات...
            </div>
          )}

        {!isLoading &&
          orders.length === 0 &&
          !errorMessage && (
            <div className="emptyState">
              لا توجد طلبات حتى الآن.
              جرّب إنشاء طلب من الموقع.
            </div>
          )}

        <section className="orderEditors">
          {filteredOrders.map(
            (order) => {
              const orderKey =
                getOrderKey(order);

              const isSelected =
                selectedOrderKeys.includes(
                  orderKey
                );

              return (
                <details
                  className="orderCard"
                  key={orderKey}
                >
                  <summary>
                    <div className="summaryRow">
                      <input
                        type="checkbox"
                        checked={
                          isSelected
                        }
                        onClick={(
                          event
                        ) =>
                          event.stopPropagation()
                        }
                        onChange={() =>
                          toggleOrderSelection(
                            orderKey
                          )
                        }
                      />

                      <div className="summaryInfo">
                        <strong>
                          {
                            order.order_number
                          }
                        </strong>

                        <span>
                          {
                            order.customer_name
                          }{" "}
                          — {order.phone}
                        </span>
                      </div>

                      <span
                        className={`statusBadge ${
                          order.shipping_status ===
                          "ready_to_print"
                            ? "ready"
                            : ""
                        }`}
                      >
                        {getStatusName(
                          order.shipping_status
                        )}
                      </span>
                    </div>
                  </summary>

                  <div className="formGrid">
                    <InputField
                      label="رقم الطلب"
                      value={
                        order.order_number
                      }
                      disabled
                    />

                    <InputField
                      label="رقم الشحنة"
                      value={
                        order.shipping_number ||
                        ""
                      }
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "shipping_number",
                          value
                        )
                      }
                    />

                    <InputField
                      label="اسم العميل"
                      value={
                        order.customer_name
                      }
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "customer_name",
                          value
                        )
                      }
                    />

                    <InputField
                      label="رقم الهاتف"
                      value={
                        order.phone
                      }
                      type="tel"
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "phone",
                          value
                        )
                      }
                    />

                    <InputField
                      label="المحافظة"
                      value={
                        order.governorate
                      }
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "governorate",
                          value
                        )
                      }
                    />

                    <InputField
                      label="اسم المنتج"
                      value={
                        order.product_name
                      }
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "product_name",
                          value
                        )
                      }
                    />

                    <InputField
                      label="اللون"
                      value={
                        order.colour
                      }
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "colour",
                          value
                        )
                      }
                    />

                    <InputField
                      label="الكمية"
                      value={String(
                        order.quantity
                      )}
                      type="number"
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "quantity",
                          Math.max(
                            1,
                            Number(value) ||
                              1
                          )
                        )
                      }
                    />

                    <InputField
                      label="المبلغ المطلوب"
                      value={String(
                        order.total_price
                      )}
                      type="number"
                      onChange={(
                        value
                      ) =>
                        updateOrder(
                          orderKey,
                          "total_price",
                          Math.max(
                            0,
                            Number(value) ||
                              0
                          )
                        )
                      }
                    />

                    <label className="inputGroup">
                      طريقة الدفع

                      <select
                        value={
                          order.payment_method ||
                          "instapay_on_delivery"
                        }
                        onChange={(
                          event
                        ) =>
                          updateOrder(
                            orderKey,
                            "payment_method",
                            event.target
                              .value
                          )
                        }
                      >
                        <option value="instapay_on_delivery">
                          InstaPay عند
                          الاستلام
                        </option>

                        <option value="cash_on_delivery">
                          كاش عند
                          الاستلام
                        </option>

                        <option value="paid">
                          مدفوع مسبقًا
                        </option>
                      </select>
                    </label>

                    <label className="inputGroup fullWidth">
                      العنوان

                      <textarea
                        rows={3}
                        value={
                          order.address
                        }
                        onChange={(
                          event
                        ) =>
                          updateOrder(
                            orderKey,
                            "address",
                            event.target
                              .value
                          )
                        }
                      />
                    </label>

                    <label className="inputGroup fullWidth">
                      ملاحظات

                      <textarea
                        rows={2}
                        value={
                          order.notes ||
                          ""
                        }
                        onChange={(
                          event
                        ) =>
                          updateOrder(
                            orderKey,
                            "notes",
                            event.target
                              .value
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="cardActions">
                    <button
                      className="printButton"
                      onClick={() =>
                        printOneOrder(
                          orderKey
                        )
                      }
                    >
                      طباعة البوليصة
                    </button>

                    <button
                      onClick={() =>
                        saveOrderAsPng(
                          order
                        )
                      }
                    >
                      حفظ PNG
                    </button>

                    <button
                      className="resetButton"
                      onClick={() =>
                        resetOrderEdits(
                          orderKey
                        )
                      }
                    >
                      إلغاء التعديلات
                    </button>
                  </div>
                </details>
              );
            }
          )}
        </section>

        {selectedOrders.length >
          0 && (
          <div className="previewHeader">
            <div>
              <h2>
                معاينة الطباعة
              </h2>

              <p>
                سيتم طباعة{" "}
                {
                  selectedOrders.length
                }{" "}
                بوليصة.
              </p>
            </div>

            <button
              className="printButton"
              onClick={
                printSelectedOrders
              }
            >
              طباعة الآن
            </button>
          </div>
        )}
      </section>

      <section className="printArea">
        {printedPages.map(
          (
            pageOrders,
            pageIndex
          ) => (
            <div
              className="a4Sheet"
              key={`page-${pageIndex}`}
              style={{
                gridTemplateRows: `repeat(${labelsPerPage}, minmax(0, 1fr))`,
              }}
            >
              {pageOrders.map(
                (order) => (
                  <ShippingLabel
                    key={getOrderKey(
                      order
                    )}
                    order={order}
                  />
                )
              )}
            </div>
          )
        )}
      </section>

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          background: #eeeeee;
        }

        :global(body) {
          margin: 0;
          background: #eeeeee;
          color: #111111;
          font-family: Arial, sans-serif;
        }

        main {
          min-height: 100vh;
        }

        .dashboard {
          width: min(
            1150px,
            calc(100% - 24px)
          );
          margin: 20px auto 35px;
        }

        .pageHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px;
          border-radius: 18px;
          background: #111111;
          color: white;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #999999;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 3px;
        }

        .pageHeader h1 {
          margin: 0;
          font-size: 32px;
        }

        .description {
          margin: 9px 0 0;
          color: #bbbbbb;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        button {
          padding: 11px 16px;
          border: 1px solid #cccccc;
          border-radius: 10px;
          background: white;
          color: #111111;
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .refreshButton {
          border-color: white;
          background: white;
          color: black;
          font-weight: bold;
        }

        .printButton {
          border-color: #111111;
          background: #111111;
          color: white;
          font-weight: bold;
        }

        .statistics {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-top: 15px;
        }

        .statistics div {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px;
          border-radius: 14px;
          background: white;
        }

        .statistics span {
          color: #666666;
          font-size: 14px;
        }

        .statistics strong {
          font-size: 27px;
        }

        .toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: end;
          gap: 10px;
          margin-top: 15px;
          padding: 17px;
          border-radius: 14px;
          background: white;
        }

        .toolbar label,
        .inputGroup {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: bold;
        }

        .searchBox {
          flex: 1;
          min-width: 230px;
        }

        input,
        select,
        textarea {
          width: 100%;
          padding: 11px;
          border: 1px solid #cccccc;
          border-radius: 9px;
          background: white;
          color: #111111;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #111111;
        }

        textarea {
          resize: vertical;
        }

        .lastUpdated {
          margin: 11px 4px;
          color: #666666;
          font-size: 13px;
        }

        .errorMessage {
          margin-top: 15px;
          padding: 15px;
          border: 1px solid #e57373;
          border-radius: 12px;
          background: #ffebee;
          color: #b71c1c;
        }

        .emptyState {
          margin-top: 15px;
          padding: 40px 20px;
          border-radius: 15px;
          background: white;
          text-align: center;
          color: #666666;
        }

        .orderEditors {
          display: grid;
          gap: 12px;
          margin-top: 15px;
        }

        .orderCard {
          overflow: hidden;
          border: 1px solid #dddddd;
          border-radius: 14px;
          background: white;
        }

        .orderCard summary {
          padding: 18px;
          cursor: pointer;
        }

        .summaryRow {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .summaryRow input {
          width: 21px;
          height: 21px;
          flex-shrink: 0;
        }

        .summaryInfo {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .summaryInfo strong,
        .summaryInfo span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summaryInfo span {
          color: #666666;
          font-size: 14px;
        }

        .statusBadge {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eeeeee;
          color: #444444;
          font-size: 12px;
          font-weight: bold;
        }

        .statusBadge.ready {
          background: #e8f5e9;
          color: #1b5e20;
        }

        .formGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
          padding: 20px;
          border-top: 1px solid #eeeeee;
        }

        .fullWidth {
          grid-column: 1 / -1;
        }

        .cardActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 0 20px 20px;
        }

        .resetButton {
          border-color: #d32f2f;
          color: #c62828;
        }

        .previewHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 30px;
        }

        .previewHeader h2 {
          margin: 0;
        }

        .previewHeader p {
          margin: 7px 0 0;
          color: #666666;
        }

        .printArea {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding-bottom: 40px;
          overflow-x: auto;
        }

        .a4Sheet {
          display: grid;
          gap: 4mm;
          flex-shrink: 0;
          width: 210mm;
          height: 297mm;
          padding: 7mm;
          background: white;
          box-shadow: 0 6px 25px
            rgba(0, 0, 0, 0.2);
        }

        @media (
          max-width: 720px
        ) {
          .pageHeader,
          .previewHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .statistics {
            grid-template-columns: 1fr;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .fullWidth {
            grid-column: auto;
          }

          .statusBadge {
            display: none;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          :global(html),
          :global(body) {
            width: 210mm;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .screenOnly {
            display: none !important;
          }

          .printArea {
            display: block;
            margin: 0;
            padding: 0;
            overflow: visible;
          }

          .a4Sheet {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 7mm;
            box-shadow: none;
            break-after: page;
            page-break-after: always;
          }

          .a4Sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </main>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: (
    value: string
  ) => void;
};

function InputField({
  label,
  value,
  type = "text",
  disabled = false,
  onChange,
}: InputFieldProps) {
  return (
    <label className="inputGroup">
      {label}

      <input
        type={type}
        value={value}
        disabled={disabled}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        onChange={(event) =>
          onChange?.(
            event.target.value
          )
        }
      />

      <style jsx>{`
        .inputGroup {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: bold;
        }

        input {
          width: 100%;
          padding: 11px;
          border: 1px solid #cccccc;
          border-radius: 9px;
          background: white;
          color: #111111;
          font: inherit;
        }

        input:disabled {
          background: #eeeeee;
          color: #777777;
        }
      `}</style>
    </label>
  );
}

function ShippingLabel({
  order,
}: {
  order: OrderRow;
}) {
  return (
    <article
      className="shippingLabel"
      dir="rtl"
    >
      <header>
        <div className="brand">
          ORVIX
        </div>

        <div className="numbers">
          <strong>
            رقم الطلب:{" "}
            {order.order_number ||
              "-"}
          </strong>

          <span>
            رقم الشحنة:{" "}
            {order.shipping_number ||
              "-"}
          </span>
        </div>
      </header>

      <div className="informationGrid">
        <Information
          title="اسم العميل"
          value={
            order.customer_name
          }
        />

        <Information
          title="رقم الهاتف"
          value={order.phone}
        />

        <Information
          title="المحافظة"
          value={
            order.governorate
          }
        />

        <Information
          title="العنوان"
          value={order.address}
        />

        <Information
          title="المنتج"
          value={`${order.product_name} - ${order.colour}`}
        />

        <Information
          title="الكمية"
          value={String(
            order.quantity
          )}
        />

        <Information
          title="طريقة الدفع"
          value={getPaymentName(
            order.payment_method
          )}
        />

        <Information
          title="ملاحظات"
          value={
            order.notes || "-"
          }
        />
      </div>

      <footer>
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
          border: 0.7mm solid
            #111111;
          border-radius: 2mm;
          background: white;
          overflow: hidden;
        }

        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5mm;
          padding-bottom: 2.5mm;
          border-bottom: 0.7mm
            solid #111111;
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
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 2mm 5mm;
          flex: 1;
          padding: 3mm 0;
          overflow: hidden;
        }

        footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2mm;
          padding: 2.5mm;
          border: 0.6mm solid
            #111111;
          background: #f2f2f2;
          font-size: 4.1mm;
          font-weight: bold;
        }

        footer strong {
          font-size: 5mm;
        }
      `}</style>
    </article>
  );
}

function Information({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="information">
      <strong>
        {title}:
      </strong>

      <span>
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
      `}</style>
    </div>
  );
}
