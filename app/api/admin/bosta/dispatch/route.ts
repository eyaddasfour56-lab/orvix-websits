import { randomUUID } from "crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  BostaApiError,
  BostaDelivery,
  BostaPickupLocation,
  createBostaDelivery,
  createBostaPickup,
  findBostaDelivery,
  getBostaPickupLocations,
} from "@/lib/bosta";
import {
  SupabaseAdminError,
  postgrestValue,
  supabaseAdminJson,
} from "@/lib/supabase-admin";

const MAX_BATCH_SIZE = 50;

type ShippingOrder = {
  id: string | number;
  order_number: string;
  status: string;
  created_at: string;

  customer_name: string;
  phone: string;
  customer_email?: string | null;

  address: string;
  notes?: string | null;

  product_name?: string | null;
  colour?: string | null;
  quantity: number;
  products_total: number;
  delivery_fee: number;

  bosta_city_id?: string | null;
  bosta_city_name?: string | null;
  bosta_city_sector?: number | null;
  bosta_zone_id?: string | null;
  bosta_zone_name?: string | null;
  bosta_district_id?: string | null;
  bosta_district_name?: string | null;

  bosta_delivery_id?: string | null;
  bosta_tracking_number?: string | null;
  bosta_state_code?: number | null;
  bosta_state_name?: string | null;
  bosta_batch_id?: string | null;
  bosta_pickup_id?: string | null;
  bosta_pickup_date?: string | null;
  bosta_pickup_location_id?: string | null;
  bosta_last_error?: string | null;
};

type DispatchBody = {
  orderIds?: unknown;
  pickupDate?: unknown;
  pickupLocationId?: unknown;
  batchId?: unknown;
};

function cairoDateString() {
  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function validatePickupDate(value: unknown) {
  const date = String(value || "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    throw new Error(
      "Choose a valid pickup date."
    );
  }

  const parsedDate = new Date(
    `${date}T12:00:00Z`
  );

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !==
      date
  ) {
    throw new Error(
      "Choose a valid pickup date."
    );
  }

  if (date < cairoDateString()) {
    throw new Error(
      "The pickup date cannot be in the past."
    );
  }

  if (parsedDate.getUTCDay() === 5) {
    throw new Error(
      "Bosta pickups are not available on Friday."
    );
  }

  return date;
}

function safeIdentifier(
  value: unknown,
  label: string
) {
  const cleanValue = String(
    value || ""
  ).trim();

  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(
      cleanValue
    )
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return cleanValue;
}

function cleanMoney(value: unknown) {
  const numberValue = Number(value || 0);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(
    Math.round(numberValue * 100) / 100,
    0
  );
}

function getOrderValidationError(
  order: ShippingOrder
) {
  if (order.status !== "confirmed") {
    return `${order.order_number} is not confirmed.`;
  }

  if (
    order.bosta_tracking_number ||
    order.bosta_batch_id
  ) {
    return `${order.order_number} was already submitted to Bosta.`;
  }

  if (
    !order.bosta_city_name ||
    !order.bosta_district_id ||
    !order.bosta_district_name
  ) {
    return `${order.order_number} is missing its Bosta city or district.`;
  }

  if (
    !String(order.address || "").trim() ||
    String(order.address).trim().length < 6
  ) {
    return `${order.order_number} needs a fuller delivery address.`;
  }

  if (!String(order.phone || "").trim()) {
    return `${order.order_number} is missing a phone number.`;
  }

  if (
    cleanMoney(order.delivery_fee) >
    30000
  ) {
    return `${order.order_number} exceeds Bosta's COD limit.`;
  }

  return null;
}

async function getOrderById(
  orderId: string
) {
  const rows = await supabaseAdminJson<
    ShippingOrder[]
  >(
    `orders?select=*&id=eq.${postgrestValue(
      orderId
    )}&limit=1`
  );

  return rows[0] ?? null;
}

async function getBatchOrders(
  batchId: string
) {
  return supabaseAdminJson<
    ShippingOrder[]
  >(
    `orders?select=*&bosta_batch_id=eq.${postgrestValue(
      batchId
    )}&order=created_at.asc`
  );
}

async function patchOrder(
  orderId: string | number,
  values: Record<string, unknown>,
  extraFilters = ""
) {
  return supabaseAdminJson<
    ShippingOrder[]
  >(
    `orders?id=eq.${postgrestValue(
      orderId
    )}${extraFilters}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(values),
    }
  );
}

async function patchBatch(
  batchId: string,
  values: Record<string, unknown>
) {
  return supabaseAdminJson<
    ShippingOrder[]
  >(
    `orders?bosta_batch_id=eq.${postgrestValue(
      batchId
    )}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(values),
    }
  );
}

function getFriendlyError(error: unknown) {
  if (error instanceof BostaApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected shipping error.";
}

function buildDeliveryPayload(
  order: ShippingOrder,
  pickupLocationId: string,
  webhookUrl: string | null,
  webhookSecret: string | null
) {
  const quantity = Math.max(
    Math.round(Number(order.quantity) || 1),
    1
  );

  const description = [
    order.product_name || "ORVIX product",
    order.colour
      ? `Colour: ${order.colour}`
      : null,
  ]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 250);

  const courierCollection =
    cleanMoney(order.delivery_fee);

  const customerNotes = String(
    order.notes || ""
  ).trim();

  const notes = [
    customerNotes &&
    customerNotes.toLowerCase() !==
      "no notes"
      ? customerNotes
      : null,
    `ORVIX products are paid via InstaPay. Courier collects delivery fee only: ${courierCollection} EGP.`,
  ]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 500);

  const dropOffAddress: Record<
    string,
    unknown
  > = {
    city: order.bosta_city_name,
    districtId:
      order.bosta_district_id,
    firstLine: String(order.address)
      .trim()
      .slice(0, 300),
  };

  if (order.bosta_zone_id) {
    dropOffAddress.zoneId =
      order.bosta_zone_id;
  }

  if (order.bosta_district_name) {
    dropOffAddress.secondLine =
      order.bosta_district_name;
  }

  const payload: Record<string, unknown> = {
    type: 10,
    specs: {
      packageType: "Parcel",
      size: "SMALL",
      packageDetails: {
        itemsCount: quantity,
        description,
      },
    },
    goodsInfo: {
      amount: cleanMoney(
        order.products_total
      ),
    },
    notes,
    cod: courierCollection,
    dropOffAddress,
    allowToOpenPackage: false,
    businessReference:
      order.order_number,
    uniqueBusinessReference:
      order.order_number,
    businessLocationId:
      pickupLocationId,
    receiver: {
      firstName: String(
        order.customer_name || "Customer"
      )
        .trim()
        .slice(0, 100),
      fullName: String(
        order.customer_name || "Customer"
      )
        .trim()
        .slice(0, 150),
      phone: String(order.phone).trim(),
      ...(order.customer_email
        ? {
            email: String(
              order.customer_email
            )
              .trim()
              .toLowerCase(),
          }
        : {}),
    },
  };

  if (webhookUrl && webhookSecret) {
    payload.webhookUrl = webhookUrl;
    payload.webhookCustomHeaders = {
      Authorization:
        `Bearer ${webhookSecret}`,
    };
  }

  return payload;
}

async function saveDelivery(
  order: ShippingOrder,
  delivery: BostaDelivery
) {
  const updatedRows = await patchOrder(
    order.id,
    {
      shipping_number:
        delivery.trackingNumber,
      shipping_status:
        "pickup_requested",
      bosta_delivery_id:
        delivery.id || null,
      bosta_tracking_number:
        delivery.trackingNumber,
      bosta_state_code:
        delivery.stateCode ?? 10,
      bosta_state_name:
        delivery.stateName ||
        "Pickup requested",
      bosta_submitted_at:
        new Date().toISOString(),
      bosta_status_updated_at:
        new Date().toISOString(),
      bosta_last_error: null,
    }
  );

  if (updatedRows.length !== 1) {
    throw new Error(
      `Could not save Bosta tracking for ${order.order_number}.`
    );
  }

  return updatedRows[0];
}

async function processBatch({
  batchId,
  pickupDate,
  pickupLocation,
  webhookUrl,
  webhookSecret,
}: {
  batchId: string;
  pickupDate: string;
  pickupLocation: BostaPickupLocation;
  webhookUrl: string | null;
  webhookSecret: string | null;
}) {
  let orders =
    await getBatchOrders(batchId);

  if (
    orders.length === 0 ||
    orders.length > MAX_BATCH_SIZE
  ) {
    throw new Error(
      "This Bosta batch is empty or too large."
    );
  }

  const batchSize = orders.length;

  const deliveryErrors: {
    orderNumber: string;
    message: string;
  }[] = [];

  for (const order of orders) {
    if (order.bosta_tracking_number) {
      continue;
    }

    try {
      const existingDelivery =
        await findBostaDelivery(
          order.order_number
        );

      const delivery =
        existingDelivery ||
        (await createBostaDelivery(
          buildDeliveryPayload(
            order,
            pickupLocation.id,
            webhookUrl,
            webhookSecret
          )
        ));

      await saveDelivery(
        order,
        delivery
      );
    } catch (error) {
      const message =
        getFriendlyError(error);

      console.error(
        `Bosta delivery error for ${order.order_number}:`,
        error
      );

      deliveryErrors.push({
        orderNumber:
          order.order_number,
        message,
      });

      try {
        await patchOrder(order.id, {
          bosta_last_error: message,
        });
      } catch (saveError) {
        console.error(
          "Could not save Bosta delivery error:",
          saveError
        );
      }
    }
  }

  orders = await getBatchOrders(batchId);

  const trackingNumbers = orders
    .map(
      (order) =>
        order.bosta_tracking_number
    )
    .filter(
      (trackingNumber): trackingNumber is string =>
        Boolean(trackingNumber)
    );

  if (
    deliveryErrors.length > 0 ||
    trackingNumbers.length !== batchSize
  ) {
    return {
      success: false as const,
      partial: true,
      batchId,
      createdDeliveries:
        trackingNumbers.length,
      deliveryErrors,
      message:
        `${trackingNumbers.length}/${batchSize} Bosta deliveries were created. Fix the shown error, then retry this batch.`,
    };
  }

  const existingPickupId =
    orders.find(
      (order) => order.bosta_pickup_id
    )?.bosta_pickup_id;

  if (existingPickupId) {
    return {
      success: true as const,
      batchId,
      pickupId: existingPickupId,
      pickupDate,
      trackingNumbers,
      message:
        "This batch was already sent to Bosta.",
    };
  }

  try {
    const contactPerson =
      pickupLocation.contactPerson;

    const pickup =
      await createBostaPickup({
        businessLocationId:
          pickupLocation.id,
        scheduledDate: pickupDate,
        notes:
          `ORVIX batch ${batchId} - ${batchSize} confirmed ${
            batchSize === 1
              ? "order"
              : "orders"
          }`,
        numberOfParcels: batchSize,
        packageType: "Normal",
        hasFragileItems: false,
        hasBigItems: false,
        trackingNumbers,
        ...(contactPerson.name &&
        contactPerson.phone
          ? {
              contactPerson: {
                name: contactPerson.name,
                phone:
                  contactPerson.phone,
                ...(contactPerson.email
                  ? {
                      email:
                        contactPerson.email,
                    }
                  : {}),
              },
            }
          : {}),
      });

    await patchBatch(batchId, {
      bosta_pickup_id: pickup.id,
      bosta_pickup_date: pickupDate,
      bosta_pickup_location_id:
        pickupLocation.id,
      bosta_last_error: null,
    });

    return {
      success: true as const,
      batchId,
      pickupId: pickup.id,
      pickupDate,
      trackingNumbers,
      message:
        `${batchSize} Bosta ${
          batchSize === 1
            ? "delivery"
            : "deliveries"
        } and one pickup were created successfully.`,
    };
  } catch (error) {
    const message =
      getFriendlyError(error);

    console.error(
      `Bosta pickup error for batch ${batchId}:`,
      error
    );

    await patchBatch(batchId, {
      bosta_last_error:
        `Pickup: ${message}`,
    });

    return {
      success: false as const,
      partial: true,
      batchId,
      createdDeliveries:
        trackingNumbers.length,
      deliveryErrors: [],
      message:
        `All ${batchSize} ${
          batchSize === 1
            ? "delivery was"
            : "deliveries were"
        } created, but the pickup failed: ${message}`,
    };
  }
}

export async function POST(
  request: NextRequest
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const body =
      (await request.json()) as DispatchBody;

    const retryBatchId = body.batchId
      ? safeIdentifier(
          body.batchId,
          "Batch ID"
        )
      : null;

    const pickupDate =
      validatePickupDate(
        body.pickupDate
      );

    const pickupLocations =
      await getBostaPickupLocations();

    if (pickupLocations.length === 0) {
      throw new Error(
        "Create a pickup location in your Bosta account first."
      );
    }

    const requestedLocationId =
      body.pickupLocationId
        ? safeIdentifier(
            body.pickupLocationId,
            "Pickup location ID"
          )
        : "";

    let pickupLocation =
      pickupLocations.find(
        (location) =>
          location.id ===
          requestedLocationId
      ) ||
      pickupLocations.find(
        (location) =>
          location.isDefault
      );

    if (!pickupLocation) {
      throw new Error(
        "Choose a valid Bosta pickup location."
      );
    }

    let batchId = retryBatchId;

    if (batchId) {
      const existingOrders =
        await getBatchOrders(batchId);

      if (
        existingOrders.length === 0 ||
        existingOrders.length >
          MAX_BATCH_SIZE
      ) {
        throw new Error(
          "This Bosta batch was not found or is invalid."
        );
      }

      if (
        existingOrders.some(
          (order) =>
            order.bosta_pickup_id
        )
      ) {
        return NextResponse.json({
          success: true,
          batchId,
          message:
            "This batch already has a Bosta pickup.",
        });
      }

      const batchHasDeliveries =
        existingOrders.some(
          (order) =>
            order.bosta_tracking_number
        );

      const storedLocationId =
        existingOrders.find(
          (order) =>
            order.bosta_pickup_location_id
        )?.bosta_pickup_location_id;

      if (
        batchHasDeliveries &&
        storedLocationId
      ) {
        const storedLocation =
          pickupLocations.find(
            (location) =>
              location.id ===
              storedLocationId
          );

        if (!storedLocation) {
          throw new Error(
            "The original Bosta pickup location for this batch is no longer available."
          );
        }

        pickupLocation = storedLocation;
      }

      await patchBatch(batchId, {
        bosta_pickup_date:
          pickupDate,
        bosta_pickup_location_id:
          pickupLocation.id,
        bosta_last_error: null,
      });
    } else {
      if (!Array.isArray(body.orderIds)) {
        throw new Error(
          "Choose at least one confirmed order."
        );
      }

      const orderIds = [
        ...new Set(
          body.orderIds.map((orderId) =>
            safeIdentifier(
              orderId,
              "Order ID"
            )
          )
        ),
      ];

      if (orderIds.length === 0) {
        throw new Error(
          "Choose at least one confirmed order."
        );
      }

      if (
        orderIds.length > MAX_BATCH_SIZE
      ) {
        throw new Error(
          `Choose no more than ${MAX_BATCH_SIZE} orders at once.`
        );
      }

      const orders = await Promise.all(
        orderIds.map(getOrderById)
      );

      if (orders.some((order) => !order)) {
        throw new Error(
          "One or more selected orders could not be found."
        );
      }

      for (const order of orders) {
        const validationError =
          getOrderValidationError(
            order as ShippingOrder
          );

        if (validationError) {
          throw new Error(
            validationError
          );
        }
      }

      batchId = randomUUID();
      const claimedOrderIds:
        | (string | number)[] = [];

      try {
        for (const order of orders) {
          const shippingOrder =
            order as ShippingOrder;

          const claimedRows =
            await patchOrder(
              shippingOrder.id,
              {
                bosta_batch_id:
                  batchId,
                bosta_pickup_date:
                  pickupDate,
                bosta_pickup_location_id:
                  pickupLocation.id,
                bosta_last_error: null,
              },
              "&status=eq.confirmed&bosta_batch_id=is.null&bosta_tracking_number=is.null"
            );

          if (claimedRows.length !== 1) {
            throw new Error(
              `${shippingOrder.order_number} changed while the batch was being prepared. Refresh and try again.`
            );
          }

          claimedOrderIds.push(
            shippingOrder.id
          );
        }
      } catch (error) {
        for (const orderId of claimedOrderIds) {
          try {
            await patchOrder(orderId, {
              bosta_batch_id: null,
              bosta_pickup_date: null,
              bosta_pickup_location_id:
                null,
              bosta_last_error: null,
            });
          } catch (releaseError) {
            console.error(
              "Could not release Bosta batch claim:",
              releaseError
            );
          }
        }

        throw error;
      }
    }

    const webhookSecret =
      process.env.BOSTA_WEBHOOK_SECRET?.trim() ||
      null;

    const webhookUrl = webhookSecret
      ? new URL(
          "/api/bosta/webhook",
          request.nextUrl.origin
        ).toString()
      : null;

    const result = await processBatch({
      batchId,
      pickupDate,
      pickupLocation,
      webhookUrl,
      webhookSecret,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    });
  } catch (error) {
    console.error(
      "Bosta dispatch API error:",
      error
    );

    const isConfigurationError =
      error instanceof SupabaseAdminError ||
      (error instanceof BostaApiError &&
        error.status >= 500);

    return NextResponse.json(
      {
        success: false,
        message: getFriendlyError(error),
      },
      {
        status: isConfigurationError
          ? 500
          : 400,
      }
    );
  }
}
