"use client";

import { useEffect, useRef } from "react";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";

const ORDER_ROUTES: Record<string, string> = {
  "/api/order": "/api/account/order",
  "/api/order-v3": "/api/account/order-v3",
  "/api/order-v4": "/api/account/order-v4",
};

type WishlistItem = {
  id?: string;
  productId?: string;
  slug?: string;
  name?: string;
  price?: number;
  image?: string;
  colour?: string;
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
    const previousFetch = window.fetch.bind(window);

    async function syncWishlist(token: string) {
      if (!token) return;
      try {
        const local = JSON.parse(window.localStorage.getItem("orvixWishlist") || "[]");
        const localItems: WishlistItem[] = Array.isArray(local) ? local : [];
        const productIds = localItems
          .map((item) => String(item?.id || ""))
          .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
        await previousFetch("/api/account/wishlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productIds }),
        });
        const response = await previousFetch("/api/account/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = await response.json();
        const serverItems: WishlistItem[] = Array.isArray(result?.items) ? result.items : [];
        const merged = [...localItems];
        serverItems.forEach((item) => {
          if (merged.some((current) => current.id === item.productId || current.slug === item.slug)) return;
          merged.push({
            id: item.productId,
            name: item.name || "ORVIX product",
            slug: item.slug || "",
            price: Number(item.price || 0),
            image: item.image || "/black.png",
            colour: "Standard",
          });
        });
        window.localStorage.setItem("orvixWishlist", JSON.stringify(merged));
        window.dispatchEvent(new Event("orvix-wishlist-updated"));
      } catch {
        // Wishlist syncing is best-effort and never blocks account or checkout actions.
      }
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      tokenRef.current = data.session?.access_token || "";
      void syncWishlist(tokenRef.current);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token || "";
      if (tokenRef.current) window.setTimeout(() => void syncWishlist(tokenRef.current), 0);
    });

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
