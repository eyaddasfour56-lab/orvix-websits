"use client";

import { useEffect } from "react";

export default function AdminPwaRefresh() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          "/orvix-admin-sw.js?v=orvix-20260817-v4",
          {
            scope: "/",
            updateViaCache: "none",
          }
        );

        await registration.update();
      } catch (error) {
        console.error("ORVIX service worker refresh failed:", error);
      }
    })();
  }, []);

  return null;
}
