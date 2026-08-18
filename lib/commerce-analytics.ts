const VISITOR_KEY = "orvixVisitorId";
const SESSION_KEY = "orvixAnalyticsSessionId";

function randomId(prefix: string) {
  const cryptoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${cryptoId}`;
}

export function getCommerceIdentity() {
  if (typeof window === "undefined") {
    return { visitorId: "", sessionId: "" };
  }

  let visitorId = window.localStorage.getItem(VISITOR_KEY) || "";
  let sessionId = window.sessionStorage.getItem(SESSION_KEY) || "";

  if (!visitorId) {
    visitorId = randomId("visitor");
    window.localStorage.setItem(VISITOR_KEY, visitorId);
  }

  if (!sessionId) {
    sessionId = randomId("session");
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return { visitorId, sessionId };
}

export async function trackCommerceEvent(
  eventName: string,
  options: {
    productSlug?: string | null;
    orderNumber?: string | null;
    path?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  if (typeof window === "undefined") return;

  const { visitorId, sessionId } = getCommerceIdentity();
  const payload = JSON.stringify({
    eventName,
    visitorId,
    sessionId,
    path: options.path || window.location.pathname,
    productSlug: options.productSlug || null,
    orderNumber: options.orderNumber || null,
    metadata: options.metadata || {},
  });

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const sent = navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([payload], { type: "application/json" })
      );
      if (sent) return;
    }

    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Analytics must never block shopping or checkout.
  }
}
