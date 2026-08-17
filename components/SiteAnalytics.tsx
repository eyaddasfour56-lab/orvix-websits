"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY = "orvix_analytics_visitor_id";
const SESSION_ID_KEY = "orvix_analytics_session_id";
const PREVIOUS_PATH_KEY = "orvix_analytics_previous_path";
const LAST_VIEW_KEY = "orvix_analytics_last_view";
const DUPLICATE_WINDOW_MS = 3_000;

function createAnonymousId(prefix: "visitor" | "session") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function getOrCreateId(storage: Storage, key: string, prefix: "visitor" | "session") {
  try {
    const savedId = storage.getItem(key);
    if (savedId) return savedId;
    const newId = createAnonymousId(prefix);
    storage.setItem(key, newId);
    return newId;
  } catch {
    return createAnonymousId(prefix);
  }
}

function getExternalReferrer() {
  if (!document.referrer) return null;

  try {
    const referrerUrl = new URL(document.referrer);
    return `${referrerUrl.origin}${referrerUrl.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

function shouldTrackPath(pathname: string) {
  return !(
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  );
}

function productFromCheckoutUrl(pathname: string) {
  try {
    if (pathname.startsWith("/checkout/")) {
      const slugFromPath = decodeURIComponent(pathname.slice("/checkout/".length).split("/")[0] || "");
      if (slugFromPath) return slugFromPath.slice(0, 120);
    }

    const search = new URLSearchParams(window.location.search);
    const explicit = search.get("productSlug") || search.get("slug");
    if (explicit) return explicit.slice(0, 120);

    const cartRaw = window.localStorage.getItem("orvixCart");
    if (cartRaw) {
      const cart = JSON.parse(cartRaw) as Array<{ slug?: string }>;
      const slug = Array.isArray(cart) ? cart[0]?.slug : null;
      if (slug) return String(slug).slice(0, 120);
    }
  } catch {
    // Checkout tracking is best-effort only.
  }

  return "google-fitbit-air";
}

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !shouldTrackPath(pathname)) return;

    const now = Date.now();

    try {
      const lastViewRaw = window.sessionStorage.getItem(LAST_VIEW_KEY);
      if (lastViewRaw) {
        const lastView = JSON.parse(lastViewRaw) as {
          pathname?: string;
          trackedAt?: number;
        };

        if (
          lastView.pathname === pathname &&
          typeof lastView.trackedAt === "number" &&
          now - lastView.trackedAt < DUPLICATE_WINDOW_MS
        ) {
          return;
        }
      }

      window.sessionStorage.setItem(
        LAST_VIEW_KEY,
        JSON.stringify({ pathname, trackedAt: now })
      );
    } catch {
      // Analytics must never interrupt browsing.
    }

    const visitorId = getOrCreateId(
      window.localStorage,
      VISITOR_ID_KEY,
      "visitor"
    );
    const sessionId = getOrCreateId(
      window.sessionStorage,
      SESSION_ID_KEY,
      "session"
    );

    let referrer: string | null = null;

    try {
      referrer =
        window.sessionStorage.getItem(PREVIOUS_PATH_KEY) || getExternalReferrer();
      window.sessionStorage.setItem(PREVIOUS_PATH_KEY, pathname);
    } catch {
      referrer = getExternalReferrer();
    }

    void fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        visitorId,
        sessionId,
        referrer,
      }),
      cache: "no-store",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // A failed analytics request must stay invisible to customers.
    });

    if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
      const productSlug = productFromCheckoutUrl(pathname);
      const payload = {
        stage: "checkout_started",
        visitorId,
        analyticsSessionId: sessionId,
        productSlug,
        path: pathname,
        referrer,
      };

      void fetch("/api/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => {
        // Checkout session tracking must never block checkout.
      });

      const heartbeat = window.setInterval(() => {
        void fetch("/api/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, stage: "checkout_active" }),
          cache: "no-store",
          credentials: "same-origin",
          keepalive: true,
        }).catch(() => undefined);
      }, 30_000);

      const markLeft = () => {
        void fetch("/api/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, stage: "checkout_left" }),
          cache: "no-store",
          credentials: "same-origin",
          keepalive: true,
        }).catch(() => undefined);
      };

      window.addEventListener("pagehide", markLeft);

      return () => {
        window.clearInterval(heartbeat);
        window.removeEventListener("pagehide", markLeft);
      };
    }
  }, [pathname]);

  return null;
}
