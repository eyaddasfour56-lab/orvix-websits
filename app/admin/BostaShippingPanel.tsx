"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ORVIX_PICKUP_ADDRESS_AR,
  ORVIX_PICKUP_ADDRESS_EN,
} from "@/lib/orvix-pickup-location";

export type BostaPanelOrder = {
  id: string | number;
  order_number: string;
  status: string;
  created_at: string;

  customer_name: string;
  phone: string;
  address: string;
  delivery_fee: number;

  bosta_city_name?: string | null;
  bosta_district_id?: string | null;
  bosta_district_name?: string | null;
  bosta_tracking_number?: string | null;
  bosta_state_code?: number | null;
  bosta_state_name?: string | null;
  bosta_batch_id?: string | null;
  bosta_pickup_id?: string | null;
  bosta_pickup_date?: string | null;
  bosta_pickup_location_id?: string | null;
  bosta_last_error?: string | null;
};

type PickupLocation = {
  id: string;
  name: string;
  isDefault: boolean;
  matchesOrvixAddress: boolean;
  addressLabel: string;
};

type Setup = {
  databaseReady: boolean;
  databaseMessage: string;
  apiConfigured: boolean;
  apiConnected: boolean;
  apiMessage: string;
  webhookConfigured: boolean;
  pickupLocations: PickupLocation[];
};

type SetupResult = {
  success?: boolean;
  message?: string;
  setup?: Setup;
};

type DispatchResult = {
  success?: boolean;
  partial?: boolean;
  message?: string;
  batchId?: string;
  pickupId?: string;
  deliveryErrors?: {
    orderNumber: string;
    message: string;
  }[];
};

type Batch = {
  id: string;
  orders: BostaPanelOrder[];
  trackingCount: number;
  pickupId: string | null;
  pickupDate: string | null;
  errors: string[];
  createdAt: string;
};

function getCairoToday() {
  const cairoParts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

  const values = Object.fromEntries(
    cairoParts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getDefaultPickupDate() {
  const [year, month, day] =
    getCairoToday()
      .split("-")
      .map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day + 1
    )
  );

  while (date.getUTCDay() === 5) {
    date.setUTCDate(
      date.getUTCDate() + 1
    );
  }

  return date.toISOString().slice(0, 10);
}

function hasBostaAddress(
  order: BostaPanelOrder
) {
  return Boolean(
    order.bosta_city_name &&
      order.bosta_district_id &&
      order.bosta_district_name &&
      order.address?.trim().length >= 6 &&
      order.phone?.trim()
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not selected";
  }

  const date = new Date(
    `${value.slice(0, 10)}T12:00:00Z`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(date);
}

function createBatches(
  orders: BostaPanelOrder[]
) {
  const groups = new Map<
    string,
    BostaPanelOrder[]
  >();

  for (const order of orders) {
    if (!order.bosta_batch_id) {
      continue;
    }

    const group =
      groups.get(order.bosta_batch_id) ||
      [];

    group.push(order);
    groups.set(order.bosta_batch_id, group);
  }

  return [...groups.entries()]
    .map(([id, batchOrders]): Batch => {
      const sortedOrders = [
        ...batchOrders,
      ].sort((first, second) =>
        first.created_at.localeCompare(
          second.created_at
        )
      );

      return {
        id,
        orders: sortedOrders,
        trackingCount:
          sortedOrders.filter(
            (order) =>
              order.bosta_tracking_number
          ).length,
        pickupId:
          sortedOrders.find(
            (order) =>
              order.bosta_pickup_id
          )?.bosta_pickup_id || null,
        pickupDate:
          sortedOrders.find(
            (order) =>
              order.bosta_pickup_date
          )?.bosta_pickup_date || null,
        errors: [
          ...new Set(
            sortedOrders
              .map(
                (order) =>
                  order.bosta_last_error
              )
              .filter(
                (error): error is string =>
                  Boolean(error)
              )
          ),
        ],
        createdAt:
          sortedOrders[0]?.created_at ||
          "",
      };
    })
    .sort((first, second) =>
      second.createdAt.localeCompare(
        first.createdAt
      )
    );
}

export default function BostaShippingPanel({
  orders,
  onRefresh,
}: {
  orders: BostaPanelOrder[];
  onRefresh: () => Promise<void>;
}) {
  const [setup, setSetup] =
    useState<Setup | null>(null);

  const [setupLoading, setSetupLoading] =
    useState(true);

  const [pickupDate, setPickupDate] =
    useState("");

  const [
    minimumPickupDate,
    setMinimumPickupDate,
  ] = useState("");

  const [
    pickupLocationId,
    setPickupLocationId,
  ] = useState("");

  const [actionBatchId, setActionBatchId] =
    useState<string | null>(null);

  const [
    selectedOrderIds,
    setSelectedOrderIds,
  ] = useState<string[]>([]);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">(
      ""
    );

  const [
    notificationPermission,
    setNotificationPermission,
  ] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );

  const confirmedUnsubmitted = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "confirmed" &&
          !order.bosta_tracking_number &&
          !order.bosta_batch_id
      ),
    [orders]
  );

  const readyOrders = useMemo(
    () =>
      confirmedUnsubmitted
        .filter(hasBostaAddress)
        .sort((first, second) =>
          first.created_at.localeCompare(
            second.created_at
          )
        ),
    [confirmedUnsubmitted]
  );

  const selectedOrderIdSet = useMemo(
    () => new Set(selectedOrderIds),
    [selectedOrderIds]
  );

  const selectedOrders = useMemo(
    () =>
      readyOrders.filter((order) =>
        selectedOrderIdSet.has(
          String(order.id)
        )
      ),
    [readyOrders, selectedOrderIdSet]
  );

  const allReadyOrdersSelected =
    readyOrders.length > 0 &&
    selectedOrders.length ===
      readyOrders.length;

  const missingAddressOrders = useMemo(
    () =>
      confirmedUnsubmitted.filter(
        (order) =>
          !hasBostaAddress(order)
      ),
    [confirmedUnsubmitted]
  );

  const batches = useMemo(
    () => createBatches(orders),
    [orders]
  );

  async function loadSetup() {
    setSetupLoading(true);

    try {
      const response = await fetch(
        "/api/admin/bosta/setup",
        {
          cache: "no-store",
        }
      );

      const result =
        (await response.json()) as SetupResult;

      if (
        !response.ok ||
        !result.success ||
        !result.setup
      ) {
        throw new Error(
          result.message ||
            "Could not check Bosta setup."
        );
      }

      setSetup(result.setup);

      setPickupLocationId(
        (currentLocationId) => {
          if (
            result.setup?.pickupLocations.some(
              (location) =>
                location.id ===
                currentLocationId
            )
          ) {
            return currentLocationId;
          }

          return (
            result.setup?.pickupLocations.find(
              (location) =>
                location.matchesOrvixAddress
            )?.id ||
            result.setup?.pickupLocations.find(
              (location) =>
                location.isDefault
            )?.id ||
            result.setup?.pickupLocations[0]
              ?.id ||
            ""
          );
        }
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not check Bosta setup."
      );
      setMessageType("error");
    } finally {
      setSetupLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        void loadSetup();

        setMinimumPickupDate(
          getCairoToday()
        );
        setPickupDate(
          getDefaultPickupDate()
        );

        if (
          "Notification" in window &&
          typeof window.Notification ===
            "function"
        ) {
          setNotificationPermission(
            window.Notification.permission
          );
        }
      },
      0
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (
      notificationPermission !==
      "granted"
    ) {
      return;
    }

    const storageKey =
      "orvix-bosta-ready-orders-notified";

    const previousCount = Number(
      window.localStorage.getItem(
        storageKey
      ) || 0
    );

    if (
      readyOrders.length > previousCount
    ) {
      try {
        new window.Notification(
          "ORVIX: Orders ready for Bosta",
          {
            body:
              readyOrders.length === 1
                ? "1 confirmed order is ready. You can send it now."
                : `${readyOrders.length} confirmed orders are ready. Choose any orders to send.`,
          }
        );
      } catch {
        // Some mobile browsers expose the
        // Notifications API but do not allow
        // constructing notifications directly.
      }
    }

    window.localStorage.setItem(
      storageKey,
      String(readyOrders.length)
    );
  }, [
    notificationPermission,
    readyOrders.length,
  ]);

  async function enableNotifications() {
    if (
      !("Notification" in window) ||
      typeof window.Notification !==
        "function"
    ) {
      setNotificationPermission(
        "unsupported"
      );
      return;
    }

    const permission =
      await window.Notification.requestPermission();

    setNotificationPermission(permission);
  }

  function toggleOrderSelection(
    orderId: string | number
  ) {
    const orderKey = String(orderId);

    setSelectedOrderIds(
      (currentOrderIds) =>
        currentOrderIds.includes(orderKey)
          ? currentOrderIds.filter(
              (currentOrderId) =>
                currentOrderId !== orderKey
            )
          : [...currentOrderIds, orderKey]
    );
  }

  function selectAllReadyOrders() {
    setSelectedOrderIds(
      readyOrders.map((order) =>
        String(order.id)
      )
    );
  }

  function clearSelectedOrders() {
    setSelectedOrderIds([]);
  }

  async function dispatchBatch(
    retryBatchId?: string
  ) {
    if (!pickupDate) {
      setMessage(
        "Choose the pickup date first."
      );
      setMessageType("error");
      return;
    }

    if (!pickupLocationId) {
      setMessage(
        "Choose the Bosta pickup location first."
      );
      setMessageType("error");
      return;
    }

    if (
      !retryBatchId &&
      selectedOrders.length === 0
    ) {
      setMessage(
        "Select at least one confirmed order to send to Bosta."
      );
      setMessageType("error");
      return;
    }

    const loadingId =
      retryBatchId || "new";

    setActionBatchId(loadingId);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/bosta/dispatch",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            pickupDate,
            pickupLocationId,
            ...(retryBatchId
              ? {
                  batchId: retryBatchId,
                }
              : {
                  orderIds:
                    selectedOrders.map(
                      (order) => order.id
                    ),
                }),
          }),
        }
      );

      const result =
        (await response.json()) as DispatchResult;

      if (
        !response.ok ||
        !result.success
      ) {
        const detailedErrors =
          result.deliveryErrors
            ?.map(
              (error) =>
                `${error.orderNumber}: ${error.message}`
            )
            .join(" | ");

        throw new Error(
          [result.message, detailedErrors]
            .filter(Boolean)
            .join(" — ") ||
            "Could not send the selected orders to Bosta."
        );
      }

      if (!retryBatchId) {
        clearSelectedOrders();
      }

      setMessage(
        result.message ||
          "Bosta pickup created successfully."
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not send the selected orders to Bosta."
      );
      setMessageType("error");
    } finally {
      await onRefresh();
      setActionBatchId(null);
    }
  }

  function printAwbs(batchId: string) {
    const url =
      `/api/admin/bosta/awb?batchId=${encodeURIComponent(
        batchId
      )}&size=A4&lang=en`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const setupReady = Boolean(
    setup?.databaseReady &&
      setup?.apiConnected &&
      setup?.pickupLocations.length
  );

  const selectedPickupLocation =
    setup?.pickupLocations.find(
      (location) =>
        location.id === pickupLocationId
    );

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-500/10 via-white/[0.04] to-transparent">
      <div className="border-b border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-black uppercase tracking-[0.25em] text-red-300">
                Bosta Shipping
              </p>

              {readyOrders.length > 0 && (
                <span className="animate-pulse rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                  {readyOrders.length}{" "}
                  {readyOrders.length === 1
                    ? "order ready"
                    : "orders ready"}
                </span>
              )}
            </div>

            <h2 className="mt-3 text-3xl font-black">
              Select the orders to send
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-gray-400">
              Choose any confirmed, address-ready
              orders. You can create a Bosta pickup
              for one order or several orders at
              once. Bosta collects only each
              order&apos;s delivery fee.
            </p>
          </div>

          {notificationPermission ===
            "default" && (
            <button
              type="button"
              onClick={enableNotifications}
              className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              Enable ready-order alerts
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="font-bold text-white">
            {readyOrders.length} confirmed and
            address-ready
          </span>

          <span className="font-bold text-red-300">
            {selectedOrders.length} selected to send
          </span>

          {missingAddressOrders.length > 0 && (
            <span className="text-amber-300">
              {missingAddressOrders.length}{" "}
              confirmed order(s) need Bosta city
              and district data
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h3 className="text-lg font-black">
            Connection & pickup
          </h3>

          {setupLoading ? (
            <p className="mt-4 text-sm text-gray-400">
              Checking Bosta connection...
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <SetupBadge
                label="Database"
                ready={
                  setup?.databaseReady === true
                }
                detail={setup?.databaseMessage}
              />

              <SetupBadge
                label="Bosta API"
                ready={
                  setup?.apiConnected === true
                }
                detail={setup?.apiMessage}
              />

              <SetupBadge
                label="Status sync"
                ready={
                  setup?.webhookConfigured ===
                  true
                }
                warning
                detail={
                  setup?.webhookConfigured
                    ? "Webhook secret added"
                    : "Add BOSTA_WEBHOOK_SECRET"
                }
              />
            </div>
          )}

          <div className="mt-6 grid gap-4">
            <label className="text-sm font-bold text-gray-300">
              Pickup date

              <input
                type="date"
                value={pickupDate}
                onChange={(event) =>
                  setPickupDate(
                    event.target.value
                  )
                }
                min={
                  minimumPickupDate
                }
                disabled={
                  actionBatchId !== null
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white disabled:opacity-50"
              />
            </label>

            <label className="text-sm font-bold text-gray-300">
              Pickup location

              <select
                value={pickupLocationId}
                onChange={(event) =>
                  setPickupLocationId(
                    event.target.value
                  )
                }
                disabled={
                  actionBatchId !== null ||
                  !setup?.pickupLocations.length
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white disabled:opacity-50"
              >
                <option value="">
                  Select Bosta location
                </option>

                {setup?.pickupLocations.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name}
                      {location.matchesOrvixAddress
                        ? " (ORVIX address)"
                        : ""}
                      {location.isDefault
                        ? " (Default)"
                        : ""}
                      {location.addressLabel
                        ? ` — ${location.addressLabel}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                ORVIX pickup address
              </p>

              <p
                lang="ar"
                dir="rtl"
                className="mt-3 text-sm font-bold leading-7 text-white"
              >
                {ORVIX_PICKUP_ADDRESS_AR}
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                {ORVIX_PICKUP_ADDRESS_EN}
              </p>

              {selectedPickupLocation &&
                !selectedPickupLocation.matchesOrvixAddress && (
                  <p className="mt-3 text-xs font-bold leading-5 text-amber-300">
                    The selected Bosta location does
                    not contain this full address.
                    Update or add it in Bosta before
                    requesting the pickup.
                  </p>
                )}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void dispatchBatch()
            }
            disabled={
              !setupReady ||
              selectedOrders.length === 0 ||
              actionBatchId !== null ||
              !pickupDate ||
              !pickupLocationId
            }
            className="mt-5 w-full rounded-2xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionBatchId === "new"
              ? `Sending ${selectedOrders.length} ${
                  selectedOrders.length === 1
                    ? "order"
                    : "orders"
                } to Bosta...`
              : selectedOrders.length > 0
                ? `Send selected ${
                    selectedOrders.length
                  } + request pickup`
                : "Select at least one order"}
          </button>

          {message && (
            <p
              className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
                messageType === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-black">
              Choose confirmed orders
            </h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllReadyOrders}
                disabled={
                  readyOrders.length === 0 ||
                  allReadyOrdersSelected ||
                  actionBatchId !== null
                }
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Select all
              </button>

              <button
                type="button"
                onClick={clearSelectedOrders}
                disabled={
                  selectedOrders.length === 0 ||
                  actionBatchId !== null
                }
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          {readyOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-6 text-sm leading-6 text-gray-500">
              Confirm orders from the order list.
              They will appear here automatically
              when their Bosta address is complete.
            </div>
          ) : (
            <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {readyOrders.map((order) => {
                const orderKey = String(
                  order.id
                );
                const isSelected =
                  selectedOrderIdSet.has(
                    orderKey
                  );

                return (
                  <label
                    key={orderKey}
                    className={`grid cursor-pointer gap-3 rounded-2xl border p-4 transition sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                      isSelected
                        ? "border-red-500/60 bg-red-500/10"
                        : "border-white/10 bg-black/30 hover:border-white/25"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        toggleOrderSelection(
                          order.id
                        )
                      }
                      disabled={
                        actionBatchId !== null
                      }
                      className="h-5 w-5 cursor-pointer accent-red-500 disabled:cursor-not-allowed"
                    />

                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {order.order_number} —{" "}
                        {order.customer_name}
                      </p>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {order.bosta_city_name},{" "}
                        {
                          order.bosta_district_name
                        }
                      </p>
                    </div>

                    <p className="text-sm font-black text-blue-300">
                      COD {Number(
                        order.delivery_fee || 0
                      ).toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP
                    </p>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {batches.length > 0 && (
        <div className="border-t border-white/10 p-6 sm:p-8">
          <h3 className="text-lg font-black">
            Recent Bosta batches
          </h3>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {batches
              .slice(0, 6)
              .map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">
                        Batch {batch.id.slice(0, 8)}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Pickup:{" "}
                        {formatDate(
                          batch.pickupDate
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        batch.pickupId
                          ? "bg-green-500/15 text-green-300"
                          : batch.errors.length > 0
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {batch.pickupId
                        ? "Pickup requested"
                        : `${batch.trackingCount}/${batch.orders.length} created`}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                    {batch.orders.map(
                      (order) => (
                        <span
                          key={String(order.id)}
                          className="rounded-full bg-white/5 px-3 py-1"
                        >
                          {order.order_number}
                        </span>
                      )
                    )}
                  </div>

                  {batch.errors.length > 0 && (
                    <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm leading-6 text-red-300">
                      {batch.errors.join(" | ")}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    {batch.orders.length > 0 &&
                      batch.trackingCount ===
                        batch.orders.length && (
                      <button
                        type="button"
                        onClick={() =>
                          printAwbs(batch.id)
                        }
                        className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-gray-200"
                      >
                        Print {batch.orders.length}{" "}
                        Bosta AWB
                        {batch.orders.length === 1
                          ? ""
                          : "s"}
                      </button>
                    )}

                    {!batch.pickupId && (
                      <button
                        type="button"
                        onClick={() =>
                          void dispatchBatch(
                            batch.id
                          )
                        }
                        disabled={
                          actionBatchId !== null ||
                          !setupReady
                        }
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 disabled:opacity-40"
                      >
                        {actionBatchId ===
                        batch.id
                          ? "Retrying..."
                          : "Retry batch / pickup"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SetupBadge({
  label,
  ready,
  detail,
  warning = false,
}: {
  label: string;
  ready: boolean;
  detail?: string;
  warning?: boolean;
}) {
  const colour = ready
    ? "border-green-500/20 bg-green-500/10 text-green-300"
    : warning
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-red-500/20 bg-red-500/10 text-red-300";

  return (
    <div
      className={`rounded-2xl border p-4 ${colour}`}
    >
      <p className="text-sm font-black">
        {ready ? "✓" : warning ? "!" : "×"}{" "}
        {label}
      </p>

      {detail && (
        <p className="mt-2 text-xs leading-5 opacity-70">
          {detail}
        </p>
      )}
    </div>
  );
}
