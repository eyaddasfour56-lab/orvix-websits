"use client";

import { useEffect, useRef } from "react";
import { trackCommerceEvent } from "@/lib/commerce-analytics";

type CartItem = {
  slug?: string;
  quantity?: number;
  colour?: string;
  variantKey?: string | null;
};

type Snapshot = Map<string, { slug: string; quantity: number; colour: string }>;

const CART_KEY = "orvixCart";

function readSnapshot(): Snapshot {
  const snapshot: Snapshot = new Map();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return snapshot;
    for (const raw of parsed as CartItem[]) {
      const slug = String(raw?.slug || "").trim();
      if (!slug) continue;
      const colour = String(raw?.colour || "Standard").trim() || "Standard";
      const variantKey = String(raw?.variantKey || "").trim();
      const quantity = Math.max(0, Math.round(Number(raw?.quantity || 0)));
      const key = `${slug}|${variantKey}|${colour.toLowerCase()}`;
      const current = snapshot.get(key);
      snapshot.set(key, {
        slug,
        colour,
        quantity: (current?.quantity || 0) + quantity,
      });
    }
  } catch {
    // A malformed cart should not affect the storefront.
  }
  return snapshot;
}

export default function CommerceCartAnalytics() {
  const previousRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    previousRef.current = readSnapshot();

    function compareAndTrack() {
      const previous = previousRef.current || new Map();
      const next = readSnapshot();
      const keys = new Set([...previous.keys(), ...next.keys()]);

      for (const key of keys) {
        const before = previous.get(key);
        const after = next.get(key);
        const beforeQuantity = before?.quantity || 0;
        const afterQuantity = after?.quantity || 0;
        const delta = afterQuantity - beforeQuantity;
        const item = after || before;
        if (!item || delta === 0) continue;

        void trackCommerceEvent(delta > 0 ? "add_to_cart" : "remove_from_cart", {
          productSlug: item.slug,
          metadata: {
            quantity: Math.abs(delta),
            cartQuantity: afterQuantity,
            colour: item.colour,
          },
        });
      }

      previousRef.current = next;
    }

    window.addEventListener("orvix-cart-updated", compareAndTrack);
    window.addEventListener("storage", compareAndTrack);
    return () => {
      window.removeEventListener("orvix-cart-updated", compareAndTrack);
      window.removeEventListener("storage", compareAndTrack);
    };
  }, []);

  return null;
}
