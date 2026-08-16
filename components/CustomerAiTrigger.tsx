"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TOKEN_KEY = "orvix_customer_chat_token";

export default function CustomerAiTrigger() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/chat") return;

    let running = false;

    async function triggerAi() {
      if (running) return;
      const token = window.localStorage.getItem(TOKEN_KEY) || "";
      if (!token) return;

      running = true;
      try {
        await fetch("/api/chat-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          cache: "no-store",
        });
      } catch {
        // Customer chat remains available even if AI is temporarily unavailable.
      } finally {
        running = false;
      }
    }

    void triggerAi();
    const interval = window.setInterval(triggerAi, 2500);
    return () => window.clearInterval(interval);
  }, [pathname]);

  return null;
}
