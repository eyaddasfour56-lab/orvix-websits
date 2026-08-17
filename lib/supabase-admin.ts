import "server-only";

export class SupabaseAdminError extends Error {
  status: number;
  details: string;

  constructor(
    message: string,
    status: number,
    details: string
  ) {
    super(message);
    this.name = "SupabaseAdminError";
    this.status = status;
    this.details = details;
  }
}

function getSupabaseSettings() {
  const url = process.env.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new SupabaseAdminError(
      "Supabase settings are missing.",
      500,
      "SUPABASE_URL or SUPABASE_SECRET_KEY is missing."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    secretKey,
  };
}

export async function supabaseAdminFetch(
  path: string,
  init: RequestInit = {}
) {
  const { url, secretKey } =
    getSupabaseSettings();

  const response = await fetch(
    `${url}/rest/v1/${path}`,
    {
      ...init,
      headers: {
        apikey: secretKey,
        Authorization:
          `Bearer ${secretKey}`,
        "Content-Type":
          "application/json",
        ...init.headers,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details =
      await response.text();

    throw new SupabaseAdminError(
      "The database request failed.",
      response.status,
      details
    );
  }

  return response;
}

export async function supabaseAdminJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const response =
    await supabaseAdminFetch(
      path,
      init
    );

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function postgrestValue(
  value: unknown
) {
  return encodeURIComponent(
    String(value ?? "")
  );
}
