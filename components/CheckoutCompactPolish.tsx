"use client";

import { usePathname } from "next/navigation";

export default function CheckoutCompactPolish() {
  const pathname = usePathname();

  if (pathname !== "/checkout") {
    return null;
  }

  return (
    <style jsx global>{`
      /*
       * Keep the existing checkout state + handlers intact while making the
       * first three product controls read as one compact premium card.
       */
      main form > div.space-y-8 > section:nth-of-type(1),
      main form > div.space-y-8 > section:nth-of-type(2),
      main form > div.space-y-8 > section:nth-of-type(3) {
        background: rgba(255, 255, 255, 0.035) !important;
        border-color: rgba(255, 255, 255, 0.10) !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) {
        border-radius: 28px 28px 0 0 !important;
        border-bottom-color: transparent !important;
        padding: 22px 22px 14px !important;
      }

      main form > div.space-y-8 > section:nth-of-type(2) {
        margin-top: 0 !important;
        border-radius: 0 !important;
        border-top: 0 !important;
        border-bottom-color: transparent !important;
        padding: 12px 22px !important;
        position: relative;
      }

      main form > div.space-y-8 > section:nth-of-type(2)::before {
        content: "";
        position: absolute;
        top: 0;
        left: 22px;
        right: 22px;
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      main form > div.space-y-8 > section:nth-of-type(3) {
        margin-top: 0 !important;
        border-radius: 0 0 28px 28px !important;
        border-top: 0 !important;
        padding: 12px 22px 20px !important;
        position: relative;
      }

      main form > div.space-y-8 > section:nth-of-type(3)::before {
        content: "";
        position: absolute;
        top: 0;
        left: 22px;
        right: 22px;
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      /* Remove the large product image completely. */
      main form > div.space-y-8 > section:nth-of-type(1)
        > div.mt-6.grid
        > div:first-child {
        display: none !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) > div.mt-6.grid {
        display: block !important;
        margin-top: 14px !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) h2 {
        font-size: 12px !important;
        line-height: 1rem !important;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.42) !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) p.text-sm.uppercase {
        display: none !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) h3 {
        margin-top: 0 !important;
        font-size: clamp(1.55rem, 5vw, 2rem) !important;
        line-height: 1.1 !important;
      }

      main form > div.space-y-8 > section:nth-of-type(1) h3 + p {
        margin-top: 8px !important;
        color: rgba(255, 255, 255, 0.78) !important;
        font-weight: 700;
      }

      main form > div.space-y-8 > section:nth-of-type(1) h3 + p + p {
        margin-top: 5px !important;
        color: rgba(255, 255, 255, 0.36) !important;
      }

      /* Smaller section labels. */
      main form > div.space-y-8 > section:nth-of-type(2) h2,
      main form > div.space-y-8 > section:nth-of-type(3) h2 {
        font-size: 0.85rem !important;
        line-height: 1.25rem !important;
        color: rgba(255, 255, 255, 0.62) !important;
      }

      /* Colour choices become compact pills instead of full-width cards. */
      main form > div.space-y-8 > section:nth-of-type(2) > div.mt-6.grid {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        margin-top: 10px !important;
      }

      main form > div.space-y-8 > section:nth-of-type(2) button {
        width: auto !important;
        min-width: 0 !important;
        border-radius: 9999px !important;
        padding: 10px 14px !important;
        gap: 8px !important;
        font-size: 0.82rem !important;
      }

      main form > div.space-y-8 > section:nth-of-type(2) button span {
        width: 14px !important;
        height: 14px !important;
      }

      /* Quantity becomes a small inline control. */
      main form > div.space-y-8 > section:nth-of-type(3) {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 16px !important;
      }

      main form > div.space-y-8 > section:nth-of-type(3) > div.mt-6 {
        margin-top: 0 !important;
        padding: 4px !important;
        background: rgba(0, 0, 0, 0.25) !important;
      }

      main form > div.space-y-8 > section:nth-of-type(3) button {
        width: 40px !important;
        height: 40px !important;
        font-size: 1.25rem !important;
      }

      main form > div.space-y-8 > section:nth-of-type(3) span.min-w-16 {
        min-width: 42px !important;
        font-size: 1rem !important;
      }

      @media (max-width: 639px) {
        main form > div.space-y-8 > section:nth-of-type(1) {
          padding: 20px 18px 12px !important;
        }

        main form > div.space-y-8 > section:nth-of-type(2),
        main form > div.space-y-8 > section:nth-of-type(3) {
          padding-left: 18px !important;
          padding-right: 18px !important;
        }

        main form > div.space-y-8 > section:nth-of-type(2)::before,
        main form > div.space-y-8 > section:nth-of-type(3)::before {
          left: 18px;
          right: 18px;
        }
      }
    `}</style>
  );
}
