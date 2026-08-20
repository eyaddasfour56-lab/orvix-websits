"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type City = { id: string; name?: string; nameAr?: string | null; sector?: number | null };
type TrackSnapshot = { orderNumber: string; status: string; hasTracking: boolean };
type Attribution = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  referrer: string;
  landingPage: string;
  gclid: string;
  fbclid: string;
  tclid: string;
};

const ATTRIBUTION_KEY = "orvixAttributionV1";

function inputUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return String(init.method).toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

function readBody(input: RequestInfo | URL, init?: RequestInit) {
  try {
    if (typeof init?.body === "string") return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    // Ignore malformed request bodies.
  }
  return {};
}

function sourceFromReferrer(referrer: string) {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("google")) return "google";
    return host || "referral";
  } catch {
    return "referral";
  }
}

function captureAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || "";
  return {
    source: params.get("utm_source") || sourceFromReferrer(referrer),
    medium: params.get("utm_medium") || "",
    campaign: params.get("utm_campaign") || "",
    content: params.get("utm_content") || "",
    term: params.get("utm_term") || "",
    referrer,
    landingPage: `${window.location.pathname}${window.location.search}`,
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
    tclid: params.get("ttclid") || params.get("tclid") || "",
  };
}

function savedAttribution(): Attribution {
  try {
    const raw = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "null");
    if (raw?.last && typeof raw.last === "object") return raw.last as Attribution;
    if (raw?.first && typeof raw.first === "object") return raw.first as Attribution;
  } catch {
    // Use a fresh direct attribution below.
  }
  return captureAttribution();
}

function estimate(city: City, ar: boolean) {
  const name = String(city.name || city.nameAr || "").toLowerCase();
  const sector = Number(city.sector || 0);
  let min = 2;
  let max = 4;
  if (name.includes("cairo") || name.includes("القاهرة") || name.includes("giza") || name.includes("الجيزة") || (sector > 0 && sector <= 2)) {
    min = 1;
    max = 2;
  } else if (sector >= 5 || /matrouh|sinai|new valley|البحر الاحمر|الوادي الجديد|مطروح|سيناء/.test(name)) {
    min = 3;
    max = 5;
  }
  return ar ? `التوصيل المتوقع بعد التأكيد: ${min}–${max} أيام عمل` : `Estimated after confirmation: ${min}–${max} business days`;
}

export default function CommerceExperienceV3() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [eta, setEta] = useState("");
  const [track, setTrack] = useState<TrackSnapshot | null>(null);
  const citiesRef = useRef<Map<string, City>>(new Map());

  useEffect(() => {
    const current = captureAttribution();
    try {
      const previous = JSON.parse(window.localStorage.getItem(ATTRIBUTION_KEY) || "null");
      window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify({
        first: previous?.first || current,
        last: current,
        firstSeenAt: previous?.firstSeenAt || new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      }));
    } catch {
      // Attribution should never block shopping.
    }
  }, [pathname]);

  useEffect(() => {
    const previousFetch = window.fetch.bind(window);

    async function ensureCity(cityId: string) {
      let city = citiesRef.current.get(cityId);
      if (city) return city;
      try {
        const response = await previousFetch("/api/bosta/locations", { cache: "no-store" });
        const result = await response.json();
        const cities = Array.isArray(result?.cities) ? result.cities as City[] : [];
        citiesRef.current = new Map(cities.map((item) => [String(item.id), item]));
        city = citiesRef.current.get(cityId);
      } catch {
        // Keep ETA hidden if locations cannot be resolved.
      }
      return city;
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = inputUrl(input);
      const method = requestMethod(input, init);
      const response = await previousFetch(input, init);

      try {
        const parsed = new URL(url, window.location.origin);

        if (parsed.pathname === "/api/bosta/locations") {
          const cityId = parsed.searchParams.get("cityId");
          if (!cityId) {
            const result = await response.clone().json();
            const cities = Array.isArray(result?.cities) ? result.cities as City[] : [];
            citiesRef.current = new Map(cities.map((item) => [String(item.id), item]));
          } else if (response.ok) {
            void ensureCity(cityId).then((city) => { if (city) setEta(estimate(city, ar)); });
          }
        }

        if (method === "POST" && ["/api/order", "/api/order-v3", "/api/order-v4"].includes(parsed.pathname) && response.ok) {
          const result = await response.clone().json();
          const orderNumber = String(result?.orderNumber || result?.order?.order_number || "").trim();
          if (orderNumber) {
            void previousFetch("/api/commerce/attribution", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderNumber, attribution: savedAttribution() }),
            });
          }
        }

        if (method === "POST" && parsed.pathname === "/api/track-order" && response.ok) {
          const requestBody = readBody(input, init);
          const result = await response.clone().json();
          const order = result?.order || result;
          const orderNumber = String(order?.orderNumber || order?.order_number || requestBody.orderNumber || "").trim();
          const status = String(order?.status || "").toLowerCase();
          const hasTracking = Boolean(order?.bostaTrackingNumber || order?.bosta_tracking_number || order?.bostaDeliveryId || order?.bosta_delivery_id);
          if (orderNumber) setTrack({ orderNumber, status, hasTracking });
        }
      } catch {
        // Enhancements are fail-open; original fetch result is returned unchanged.
      }

      return response;
    };

    return () => {
      window.fetch = previousFetch;
    };
  }, [ar]);

  useEffect(() => {
    if (pathname !== "/checkout") setEta("");
    if (pathname !== "/track-order") setTrack(null);
  }, [pathname]);

  const editAllowed = pathname === "/track-order" && track && ["new", "confirmed"].includes(track.status) && !track.hasTracking;

  return <>
    {pathname === "/checkout" && eta ? <div aria-live="polite" className="fixed bottom-4 left-4 z-[175] max-w-[300px] rounded-2xl border border-emerald-300/20 bg-[#101412]/95 px-4 py-3 shadow-2xl backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-200/60">ORVIX DELIVERY ETA</p><p className="mt-1 text-xs font-black text-emerald-50">{eta}</p></div> : null}
    {editAllowed ? <Link href={`/edit-order/${encodeURIComponent(track.orderNumber)}`} className="fixed bottom-24 right-4 z-[179] rounded-full border border-white/15 bg-white px-4 py-3 text-xs font-black text-black shadow-2xl">{ar ? "تعديل بيانات الطلب" : "Edit order details"}</Link> : null}
  </>;
}
