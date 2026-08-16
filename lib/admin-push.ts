import { createPrivateKey, sign } from "crypto";

type PushConfig = {
  vapid_public_key: string;
  vapid_private_jwk: Record<string, string>;
  webhook_token: string;
  subject: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh?: string | null;
  auth?: string | null;
};

type AdminNotificationInput = {
  kind: "order" | "chat" | "human";
  title: string;
  body: string;
  targetUrl: string;
  eventKey: string;
};

function settings() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function headers(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function b64url(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export async function getPushConfig(): Promise<PushConfig | null> {
  const db = settings();
  if (!db) return null;

  const response = await fetch(
    `${db.url}/rest/v1/admin_push_config?id=eq.default&select=vapid_public_key,vapid_private_jwk,webhook_token,subject&limit=1`,
    { headers: headers(db.key), cache: "no-store" }
  );

  if (!response.ok) {
    console.error("Push config lookup failed:", await response.text());
    return null;
  }

  const rows = (await response.json()) as PushConfig[];
  return rows[0] || null;
}

export async function savePushSubscription(subscription: {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}) {
  const db = settings();
  if (!db) return false;

  const response = await fetch(
    `${db.url}/rest/v1/admin_push_subscriptions?on_conflict=endpoint`,
    {
      method: "POST",
      headers: headers(db.key, {
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || null,
        auth: subscription.keys?.auth || null,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.error("Push subscription save failed:", await response.text());
  }

  return response.ok;
}

async function removePushSubscription(id: string) {
  const db = settings();
  if (!db) return;
  await fetch(`${db.url}/rest/v1/admin_push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(db.key),
    cache: "no-store",
  }).catch(() => undefined);
}

async function getPushSubscriptions() {
  const db = settings();
  if (!db) return [] as PushSubscriptionRow[];

  const response = await fetch(
    `${db.url}/rest/v1/admin_push_subscriptions?select=id,endpoint,p256dh,auth&order=updated_at.desc&limit=20`,
    { headers: headers(db.key), cache: "no-store" }
  );

  if (!response.ok) return [] as PushSubscriptionRow[];
  return (await response.json()) as PushSubscriptionRow[];
}

function createVapidJwt(endpoint: string, config: PushConfig) {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const jwtPayload = b64url(
    JSON.stringify({ aud: audience, exp: now + 12 * 60 * 60, sub: config.subject })
  );
  const unsigned = `${jwtHeader}.${jwtPayload}`;
  const privateKey = createPrivateKey({
    key: config.vapid_private_jwk as never,
    format: "jwk",
  });
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${b64url(signature)}`;
}

async function sendEmptyPush(subscription: PushSubscriptionRow, config: PushConfig) {
  try {
    const token = createVapidJwt(subscription.endpoint, config);
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        TTL: "60",
        Urgency: "high",
        Authorization: `vapid t=${token}, k=${config.vapid_public_key}`,
        "Crypto-Key": `p256ecdsa=${config.vapid_public_key}`,
        "Content-Length": "0",
      },
      cache: "no-store",
    });

    if (response.status === 404 || response.status === 410) {
      await removePushSubscription(subscription.id);
      return false;
    }

    if (!response.ok) {
      console.error("Web push failed:", response.status, await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Web push exception:", error);
    return false;
  }
}

async function createNotification(input: AdminNotificationInput) {
  const db = settings();
  if (!db) return false;

  const existing = await fetch(
    `${db.url}/rest/v1/admin_notifications?event_key=eq.${encodeURIComponent(input.eventKey)}&select=id&limit=1`,
    { headers: headers(db.key), cache: "no-store" }
  );

  if (existing.ok) {
    const rows = (await existing.json()) as Array<{ id: string }>;
    if (rows.length) return false;
  }

  const response = await fetch(`${db.url}/rest/v1/admin_notifications`, {
    method: "POST",
    headers: headers(db.key),
    body: JSON.stringify({
      kind: input.kind,
      title: input.title,
      body: input.body,
      target_url: input.targetUrl,
      event_key: input.eventKey,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Admin notification insert failed:", await response.text());
  }
  return response.ok;
}

export async function notifyAdmin(input: AdminNotificationInput) {
  const created = await createNotification(input);
  if (!created) return { created: false, sent: 0 };

  const [config, subscriptions] = await Promise.all([
    getPushConfig(),
    getPushSubscriptions(),
  ]);

  if (!config || subscriptions.length === 0) {
    return { created: true, sent: 0 };
  }

  const results = await Promise.all(
    subscriptions.map((subscription) => sendEmptyPush(subscription, config))
  );

  return { created: true, sent: results.filter(Boolean).length };
}

export async function getLatestAdminNotification() {
  const db = settings();
  if (!db) return null;

  const response = await fetch(
    `${db.url}/rest/v1/admin_notifications?select=id,kind,title,body,target_url,created_at&order=created_at.desc&limit=1`,
    { headers: headers(db.key), cache: "no-store" }
  );
  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}
