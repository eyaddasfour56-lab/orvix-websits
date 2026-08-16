"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AdminUiPolish() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) return;

    const hideConversionAnalytics = () => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      for (const element of buttons) {
        const label = element.textContent?.trim().toLowerCase() || "";
        if (label === "conversion analytics") {
          (element as HTMLElement).style.display = "none";
        }
      }
    };

    hideConversionAnalytics();
    const observer = new MutationObserver(hideConversionAnalytics);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [pathname]);

  if (pathname !== "/admin/chats") return null;

  return (
    <style>{`
      @media (max-width: 639px) {
        .orvix-admin-chats main {
          padding: 20px 14px 28px !important;
        }

        .orvix-admin-chats main > div > header {
          gap: 16px !important;
          padding-bottom: 18px !important;
        }

        .orvix-admin-chats main > div > header h1 {
          font-size: 2.55rem !important;
          line-height: 0.98 !important;
        }

        .orvix-admin-chats main > div > header p {
          line-height: 1.5 !important;
        }

        .orvix-admin-chats main > div > header > div:last-child {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          width: 100% !important;
          gap: 8px !important;
        }

        .orvix-admin-chats main > div > header > div:last-child > div:first-child {
          grid-column: 1 / -1 !important;
          width: 100% !important;
          justify-content: space-between !important;
        }

        .orvix-admin-chats main > div > header > div:last-child > button,
        .orvix-admin-chats main > div > header > div:last-child > a {
          width: 100% !important;
          text-align: center !important;
          justify-content: center !important;
          padding-top: 11px !important;
          padding-bottom: 11px !important;
        }

        .orvix-admin-chats main > div > header + section {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
          margin-top: 14px !important;
        }

        .orvix-admin-chats main > div > header + section > div {
          min-height: 0 !important;
          padding: 15px !important;
          border-radius: 20px !important;
        }

        .orvix-admin-chats main > div > header + section > div p:first-child {
          font-size: 10px !important;
          letter-spacing: 0.12em !important;
        }

        .orvix-admin-chats main > div > header + section > div p:last-child {
          margin-top: 5px !important;
          font-size: 1.65rem !important;
          line-height: 1 !important;
        }

        .orvix-admin-chats main > div > header + section + div,
        .orvix-admin-chats main > div > header + section + div + div {
          margin-top: 14px !important;
        }

        .orvix-admin-chats input[placeholder^="Search"] {
          min-height: 48px !important;
          font-size: 15px !important;
        }
      }
    `}</style>
  );
}
