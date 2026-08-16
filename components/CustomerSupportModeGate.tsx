"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const TOKEN_KEY = "orvix_customer_chat_token";
const MODE_KEY = "orvix_support_mode";

export default function CustomerSupportModeGate() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"ai" | "human" | null>(null);

  useEffect(() => {
    if (pathname !== "/chat") {
      setVisible(false);
      return;
    }

    const sync = () => {
      const token = window.localStorage.getItem(TOKEN_KEY);
      const mode = window.localStorage.getItem(MODE_KEY);
      if (token) {
        setVisible(false);
        return;
      }
      if (mode === "ai" || mode === "human") {
        setSelectedMode(mode);
        setVisible(false);
      } else {
        setSelectedMode(null);
        setVisible(true);
      }
    };

    sync();
    const interval = window.setInterval(sync, 500);
    return () => window.clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/chat") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url === "/api/chat" && String(init?.method || "GET").toUpperCase() === "POST" && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body);
          if (body?.action === "start") {
            const mode = window.localStorage.getItem(MODE_KEY);
            if (mode !== "ai" && mode !== "human") {
              setVisible(true);
              return new Response(
                JSON.stringify({ success: false, message: "Please choose AI Support or Human Support first." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            const response = await originalFetch("/api/chat-start", {
              ...init,
              body: JSON.stringify({
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                supportMode: mode,
              }),
            });

            if (response.ok) {
              window.localStorage.removeItem(MODE_KEY);
              setSelectedMode(null);
            }
            return response;
          }
        } catch {
          // Fall back to the original request if the body is not JSON.
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pathname]);

  function choose(mode: "ai" | "human") {
    window.localStorage.setItem(MODE_KEY, mode);
    setSelectedMode(mode);
    setVisible(false);
  }

  if (pathname !== "/chat" || !visible) return null;

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/85 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#0b0b0b] p-5 shadow-2xl sm:p-7">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
            <img src="/logo.jpeg" alt="ORVIX" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-300/70">ORVIX SUPPORT</p>
            <h2 className="mt-1 text-2xl font-black text-white">How do you want help?</h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-white/45">
          Choose who you want to speak with before starting the conversation.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => choose("ai")}
            className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.10] p-5 text-left transition hover:bg-violet-500/[0.16]"
          >
            <p className="text-lg font-black text-violet-100">✨ AI Support</p>
            <p className="mt-2 text-sm leading-5 text-white/45">Instant answers for products, prices, discounts, delivery and tracking.</p>
          </button>

          <button
            type="button"
            onClick={() => choose("human")}
            className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.10] p-5 text-left transition hover:bg-emerald-500/[0.16]"
          >
            <p className="text-lg font-black text-emerald-100">👤 Human Support</p>
            <p className="mt-2 text-sm leading-5 text-white/45">Talk directly with the ORVIX team. We’ll notify Customer Service immediately.</p>
          </button>
        </div>

        {selectedMode && (
          <p className="mt-4 text-xs text-white/30">Selected: {selectedMode === "human" ? "Human Support" : "AI Support"}</p>
        )}
      </div>
    </div>
  );
}
