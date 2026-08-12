import "server-only";

const BOSTA_API_BASE =
  "https://app.bosta.co/api/v2";

type BostaEnvelope<T> = {
  success?: boolean;
  message?: string;
  errorCode?: string | number;
  data?: T;
};

export type BostaCity = {
  id: string;
  name: string;
  nameAr: string | null;
  sector: number | null;
};

export type BostaDistrict = {
  id: string;
  name: string;
  nameAr: string | null;
  zoneId: string | null;
  zoneName: string | null;
  dropOffAvailability: boolean;
};

export type BostaPickupLocation = {
  id: string;
  name: string;
  isDefault: boolean;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  addressLabel: string;
};

export type BostaDelivery = {
  id: string;
  trackingNumber: string;
  businessReference: string;
  stateCode: number | null;
  stateName: string | null;
};

export class BostaApiError extends Error {
  status: number;
  errorCode: string | number | null;
  details: unknown;

  constructor(
    message: string,
    status: number,
    errorCode: string | number | null,
    details: unknown
  ) {
    super(message);
    this.name = "BostaApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

function getBostaApiKey() {
  const apiKey =
    process.env.BOSTA_API_KEY?.trim();

  if (!apiKey) {
    throw new BostaApiError(
      "Bosta API key is missing.",
      500,
      null,
      null
    );
  }

  return apiKey;
}

async function parseResponseBody(
  response: Response
) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function bostaRequest<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
    ...init.headers,
  };

  if (authenticated) {
    Object.assign(headers, {
      Authorization: getBostaApiKey(),
    });
  }

  const response = await fetch(
    `${BOSTA_API_BASE}${path}`,
    {
      ...init,
      headers,
      cache: "no-store",
    }
  );

  const body =
    await parseResponseBody(response);

  const envelope =
    body && typeof body === "object"
      ? (body as BostaEnvelope<T>)
      : null;

  if (
    !response.ok ||
    envelope?.success === false
  ) {
    throw new BostaApiError(
      envelope?.message ||
        `Bosta request failed (${response.status}).`,
      response.status,
      envelope?.errorCode ?? null,
      body
    );
  }

  if (
    envelope &&
    Object.prototype.hasOwnProperty.call(
      envelope,
      "data"
    )
  ) {
    return envelope.data as T;
  }

  return body as T;
}

export async function getBostaCities() {
  type RawCity = {
    _id?: string;
    name?: string;
    nameAr?: string;
    sector?: number;
    dropOffAvailability?: boolean;
    showAsDropOffCity?: boolean;
  };

  const data = await bostaRequest<{
    list?: RawCity[];
  }>("/cities", {}, false);

  return (data?.list ?? [])
    .filter((city) => {
      return (
        city._id &&
        city.name &&
        city.dropOffAvailability !==
          false &&
        city.showAsDropOffCity !== false
      );
    })
    .map((city): BostaCity => ({
      id: String(city._id),
      name: String(city.name),
      nameAr: city.nameAr
        ? String(city.nameAr)
        : null,
      sector: Number.isFinite(
        Number(city.sector)
      )
        ? Number(city.sector)
        : null,
    }))
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    );
}

export async function getBostaDistricts(
  cityId: string
) {
  type RawDistrict = {
    districtId?: string;
    districtI?: string;
    districtName?: string;
    districtOtherName?: string;
    zoneId?: string;
    zoneName?: string;
    dropOffAvailability?: boolean;
  };

  const data = await bostaRequest<
    RawDistrict[]
  >(
    `/cities/${encodeURIComponent(
      cityId
    )}/districts`,
    {},
    false
  );

  return (Array.isArray(data) ? data : [])
    .filter((district) => {
      return (
        (district.districtId ||
          district.districtI) &&
        district.districtName &&
        district.dropOffAvailability !==
          false
      );
    })
    .map(
      (district): BostaDistrict => ({
        id: String(
          district.districtId ||
            district.districtI
        ),
        name: String(
          district.districtName
        ),
        nameAr:
          district.districtOtherName
            ? String(
                district.districtOtherName
              )
            : null,
        zoneId: district.zoneId
          ? String(district.zoneId)
          : null,
        zoneName: district.zoneName
          ? String(district.zoneName)
          : null,
        dropOffAvailability:
          district.dropOffAvailability !==
          false,
      })
    )
    .sort((first, second) =>
      first.name.localeCompare(second.name)
    );
}

export async function getBostaPickupLocations() {
  type RawLocation = {
    _id?: string;
    locationName?: string;
    isDefault?: boolean;
    contactPerson?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    address?: {
      firstLine?: string;
      city?: {
        name?: string;
      };
      district?:
        | string
        | { name?: string };
    };
  };

  const data = await bostaRequest<{
    list?: RawLocation[];
  }>("/pickup-locations");

  return (data?.list ?? [])
    .filter(
      (location) =>
        location._id &&
        location.locationName
    )
    .map(
      (location): BostaPickupLocation => {
        const district =
          typeof location.address
            ?.district === "string"
            ? location.address.district
            : location.address?.district
                ?.name || "";

        const addressLabel = [
          location.address?.firstLine,
          district,
          location.address?.city?.name,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          id: String(location._id),
          name: String(
            location.locationName
          ),
          isDefault:
            location.isDefault === true,
          contactPerson: {
            name: String(
              location.contactPerson
                ?.name || ""
            ),
            phone: String(
              location.contactPerson
                ?.phone || ""
            ),
            email: String(
              location.contactPerson
                ?.email || ""
            ),
          },
          addressLabel,
        };
      }
    );
}

function normaliseDelivery(
  value: unknown
): BostaDelivery | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as {
    _id?: string;
    id?: string;
    trackingNumber?: string | number;
    businessReference?: string;
    state?: {
      code?: number;
      value?: string;
    };
  };

  if (!raw.trackingNumber) {
    return null;
  }

  return {
    id: String(raw._id || raw.id || ""),
    trackingNumber: String(
      raw.trackingNumber
    ),
    businessReference: String(
      raw.businessReference || ""
    ),
    stateCode: Number.isFinite(
      Number(raw.state?.code)
    )
      ? Number(raw.state?.code)
      : null,
    stateName: raw.state?.value
      ? String(raw.state.value)
      : null,
  };
}

function findDeliveryInSearchData(
  value: unknown
): BostaDelivery | null {
  const direct =
    normaliseDelivery(value);

  if (direct) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const delivery =
        normaliseDelivery(item);

      if (delivery) {
        return delivery;
      }
    }

    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<
      string,
      unknown
    >;

    for (const key of [
      "list",
      "deliveries",
      "docs",
      "results",
    ]) {
      const delivery =
        findDeliveryInSearchData(
          record[key]
        );

      if (delivery) {
        return delivery;
      }
    }
  }

  return null;
}

export async function findBostaDelivery(
  businessReference: string
) {
  try {
    const data = await bostaRequest<unknown>(
      "/deliveries/search",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          type: "SEND",
          businessReference,
        }),
      }
    );

    return findDeliveryInSearchData(data);
  } catch (error) {
    /*
      Searching is an idempotency safeguard.
      Some Bosta accounts do not expose this
      endpoint to API keys, so creation may
      continue when the search itself is denied.
    */
    if (error instanceof BostaApiError) {
      return null;
    }

    throw error;
  }
}

export async function createBostaDelivery(
  payload: Record<string, unknown>
) {
  const data = await bostaRequest<unknown>(
    "/deliveries?apiVersion=1",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const delivery =
    normaliseDelivery(data);

  if (!delivery) {
    throw new BostaApiError(
      "Bosta created the delivery but returned no tracking number.",
      502,
      null,
      data
    );
  }

  return delivery;
}

export async function createBostaPickup(
  payload: Record<string, unknown>
) {
  type RawPickup = {
    _id?: string;
    puid?: string | number;
  };

  const data = await bostaRequest<RawPickup>(
    "/pickups",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const id = String(
    data?._id || data?.puid || ""
  );

  if (!id) {
    throw new BostaApiError(
      "Bosta created the pickup but returned no pickup ID.",
      502,
      null,
      data
    );
  }

  return {
    id,
    puid: data?.puid
      ? String(data.puid)
      : null,
  };
}

export async function getBostaAwbResponse(
  trackingNumbers: string[],
  requestedAwbType: "A4" | "A6",
  lang: "ar" | "en"
) {
  const response = await fetch(
    `${BOSTA_API_BASE}/deliveries/mass-awb`,
    {
      method: "POST",
      headers: {
        Authorization: getBostaApiKey(),
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        trackingNumbers:
          trackingNumbers.join(","),
        requestedAwbType,
        lang,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const body =
      await parseResponseBody(response);

    const envelope =
      body && typeof body === "object"
        ? (body as BostaEnvelope<unknown>)
        : null;

    throw new BostaApiError(
      envelope?.message ||
        "Could not create Bosta AWBs.",
      response.status,
      envelope?.errorCode ?? null,
      body
    );
  }

  return response;
}

export function getBostaStateName(
  code: number
) {
  const names: Record<number, string> = {
    10: "Pickup requested",
    11: "Waiting for route",
    20: "Route assigned",
    21: "Picked up from business",
    22: "Picking up from consignee",
    23: "Picked up from consignee",
    24: "Received at warehouse",
    25: "Fulfilled",
    30: "In transit between hubs",
    40: "Picking up",
    41: "Out for delivery",
    45: "Delivered",
    46: "Returned to business",
    47: "Exception",
    48: "Terminated",
    49: "Canceled",
    60: "Returned to stock",
    100: "Lost",
    101: "Damaged",
    102: "Investigation",
    103: "Awaiting your action",
    104: "Archived",
    105: "On hold",
  };

  return names[code] ||
    `Bosta state ${code}`;
}
