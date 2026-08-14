"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VISITOR_ID_KEY =
  "orvix_analytics_visitor_id";
const SESSION_ID_KEY =
  "orvix_analytics_session_id";
const PREVIOUS_PATH_KEY =
  "orvix_analytics_previous_path";
const LAST_VIEW_KEY =
  "orvix_analytics_last_view";

const DUPLICATE_WINDOW_MS = 3_000;

function createAnonymousId(
  prefix: "visitor" | "session"
) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(
    36
  )}_${Math.random()
    .toString(36)
    .slice(2, 14)}`;
}

function getOrCreateId(
  storage: Storage,
  key: string,
  prefix: "visitor" | "session"
) {
  try {
    const savedId = storage.getItem(key);

    if (savedId) {
      return savedId;
    }

    const newId =
      createAnonymousId(prefix);

    storage.setItem(key, newId);

    return newId;
  } catch {
    return createAnonymousId(prefix);
  }
}

function getExternalReferrer() {
  if (!document.referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(
      document.referrer
    );

    return `${referrerUrl.origin}${referrerUrl.pathname}`.slice(
      0,
      500
    );
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

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      !shouldTrackPath(pathname)
    ) {
      return;
    }

    const now = Date.now();

    try {
      const lastViewRaw =
        window.sessionStorage.getItem(
          LAST_VIEW_KEY
        );

      if (lastViewRaw) {
        const lastView = JSON.parse(
          lastViewRaw
        ) as {
          pathname?: string;
          trackedAt?: number;
        };

        if (
          lastView.pathname === pathname &&
          typeof lastView.trackedAt ===
            "number" &&
          now - lastView.trackedAt <
            DUPLICATE_WINDOW_MS
        ) {
          return;
        }
      }

      window.sessionStorage.setItem(
        LAST_VIEW_KEY,
        JSON.stringify({
          pathname,
          trackedAt: now,
        })
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
        window.sessionStorage.getItem(
          PREVIOUS_PATH_KEY
        ) || getExternalReferrer();

      window.sessionStorage.setItem(
        PREVIOUS_PATH_KEY,
        pathname
      );
    } catch {
      referrer = getExternalReferrer();
    }

    void fetch("/api/view", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
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
  }, [pathname]);

  return null;
}
