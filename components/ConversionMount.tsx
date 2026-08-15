"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import ConversionBoost from "@/components/ConversionBoost";

export default function ConversionMount() {
  const pathname = usePathname();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const isHome = pathname === "/";
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
    header.insertAdjacentElement("afterend", mount);
    setHost(mount);

    return () => {
      setHost(null);
      mount.remove();
    };
  }, [isAdmin, isHome, pathname]);

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
