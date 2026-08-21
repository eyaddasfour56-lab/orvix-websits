"use client";

import { useEffect, useRef } from "react";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

const ORDER_ROUTES: Record<string, string> = {
  "/api/order": "/api/account/order",
  "/api/order-v3": "/api/account/order-v3",
  "/api/order-v4": "/api/account/order-v4",
};

function resolveUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

export default function CustomerAccountBridge() {
  const tokenRef = useRef("");

  useEffect(() => {
    const supabase = getCustomerSupabaseBrowser();
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) tokenRef.current = data.session?.access_token || "";
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token || "";
    });

    const previousFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = tokenRef.current;
      const method = methodOf(input, init);
      if (!token || method !== "POST") return previousFetch(input, init);

      try {
        const parsed = new URL(resolveUrl(input), window.location.origin);
        const mappedOrderRoute = ORDER_ROUTES[parsed.pathname];
        const mappedSupportRoute = parsed.pathname === "/api/chat-start" ? "/api/account/chat-start" : "";
        const targetPath = mappedOrderRoute || mappedSupportRoute;

        if (!targetPath) return previousFetch(input, init);

        const headers = new Headers(
          init?.headers || (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined)
        );
        headers.set("Authorization", `Bearer ${token}`);

        const target = `${targetPath}${parsed.search}`;
        return previousFetch(target, {
          ...init,
          method,
          headers,
          body: init?.body ?? (typeof Request !== "undefined" && input instanceof Request ? input.body : undefined),
        });
      } catch {
        return previousFetch(input, init);
      }
    };

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.fetch = previousFetch;
    };
  }, []);

  return null;
}
