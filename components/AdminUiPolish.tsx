"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AdminUiPolish() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/admin") return;

    function applyPreOrderLabels() {
      document
        .querySelectorAll<HTMLSelectElement>("main select")
        .forEach((select) => {
          Array.from(select.options).forEach((option) => {
            if (option.value === "new" && option.textContent?.trim() === "New") {
              option.textContent = "Pre-order";
            }
          });
        });

      document
        .querySelectorAll<HTMLElement>("main article div")
        .forEach((element) => {
          if (
            element.textContent?.trim() === "New" &&
            element.classList.contains("rounded-full") &&
            element.classList.contains("font-black")
          ) {
            element.textContent = "Pre-order";
          }
        });
    }

    applyPreOrderLabels();

    const observer = new MutationObserver(() => {
      applyPreOrderLabels();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [pathname]);

  if (pathname !== "/admin/chats") return null;

  return (
    <style>{`
      /* The old page-level AI card expected OPENAI_API_KEY only. The working
         Vercel AI Gateway toggle now lives in the admin top bar. */
      main > div > header > div:last-child > div:first-child {
        display: none !important;
      }

      @media (max-width: 639px) {
        main {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        main > div > header {
          gap: 16px !important;
          padding-bottom: 18px !important;
        }

        main > div > header h1 {
          font-size: 2.55rem !important;
          line-height: 0.98 !important;
        }

        main > div > header > div:last-child {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          width: 100% !important;
          gap: 8px !important;
        }

        main > div > header > div:last-child > button,
        main > div > header > div:last-child > a {
          width: 100% !important;
          text-align: center !important;
          justify-content: center !important;
          padding-top: 11px !important;
          padding-bottom: 11px !important;
        }

        main > div > header + section {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 8px !important;
          margin-top: 14px !important;
        }

        main > div > header + section > div {
          min-height: 0 !important;
          padding: 15px !important;
          border-radius: 20px !important;
        }

        main > div > header + section > div p:first-child {
          font-size: 10px !important;
          letter-spacing: 0.12em !important;
        }

        main > div > header + section > div p:last-child {
          margin-top: 5px !important;
          font-size: 1.65rem !important;
          line-height: 1 !important;
        }

        input[placeholder^="Search"] {
          min-height: 48px !important;
          font-size: 15px !important;
        }
      }
    `}</style>
  );
}
