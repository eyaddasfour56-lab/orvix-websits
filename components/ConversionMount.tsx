"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import ConversionBoost from "@/components/ConversionBoost";

export default function ConversionMount() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const isHome = pathname === "/";
  const isCheckout = pathname === "/checkout";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (isHome || isAdmin) {
      setHost(null);
      return;
    }

    const header = document.querySelector("main > header, main header");

    if (!header?.parentElement) {
      setHost(null);
      return;
    }

    const mount = document.createElement("div");
    mount.dataset.orvixConversionMount = "true";

    let checkoutStyle: HTMLStyleElement | null = null;

    if (isCheckout) {
      checkoutStyle = document.createElement("style");
      checkoutStyle.textContent =
        '[data-orvix-conversion-mount="true"] > section { display: none !important; }';
      document.head.appendChild(checkoutStyle);
    }

    header.insertAdjacentElement("afterend", mount);
    setHost(mount);

    return () => {
      setHost(null);
      checkoutStyle?.remove();
      mount.remove();
    };
  }, [isAdmin, isCheckout, isHome, pathname]);

  if (isHome) {
    return null;
  }

  if (isAdmin) {
    return <ConversionBoost />;
  }

  if (!host) {
    return null;
  }

  return createPortal(<ConversionBoost />, host);
}
