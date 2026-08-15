"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";

export default function HomepageQuickOrder() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/") {
      setHost(null);
      return;
    }

    let mount: HTMLElement | null = null;

    const install = () => {
      if (mount?.isConnected) {
        return;
      }

      const productLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          '#products a[href="/products/google-fitbit-air"]'
        )
      );

      const viewProductButton = productLinks.find((link) =>
        link.classList.contains("orvix-premium-button")
      );

      if (!viewProductButton?.parentElement) {
        return;
      }

      const isAvailable =
        viewProductButton.classList.contains("bg-white") &&
        viewProductButton.classList.contains("text-black");

      if (!isAvailable) {
        return;
      }

      mount = document.createElement("div");
      mount.dataset.orvixQuickOrder = "true";
      viewProductButton.insertAdjacentElement("beforebegin", mount);
      setHost(mount);
    };

    install();

    const observer = new MutationObserver(() => {
      install();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      setHost(null);
      mount?.remove();
    };
  }, [pathname]);

  if (!host) {
    return null;
  }

  return createPortal(
    <a
      href="/checkout?colour=Black&quantity=1"
      className="orvix-premium-button mt-5 flex w-full items-center justify-center rounded-full border border-blue-400/30 bg-blue-500 px-6 py-4 text-center font-black text-white transition hover:bg-blue-400 active:scale-[0.99]"
    >
      {language === "ar" ? "طلب سريع" : "Quick Order"}
    </a>,
    host
  );
}
