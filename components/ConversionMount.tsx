"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import ConversionBoost from "@/components/ConversionBoost";

const ADMIN_ANALYTICS_POSITION_KEY = "orvix-admin-analytics-button-position";

function DraggableAdminConversion() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const button = wrapperRef.current?.querySelector<HTMLAnchorElement>(
      'a[href="/admin/analytics"]'
    );
    if (!button) return;

    button.draggable = false;
    button.style.touchAction = "none";
    button.style.userSelect = "none";
    button.style.cursor = "grab";

    let drag:
      | {
          pointerId: number;
          startX: number;
          startY: number;
          startLeft: number;
          startTop: number;
          moved: boolean;
        }
      | null = null;
    let suppressNextClick = false;

    function clampAndPlace(left: number, top: number) {
      const rect = button.getBoundingClientRect();
      const padding = 8;
      const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
      const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
      const nextLeft = Math.min(Math.max(left, padding), maxLeft);
      const nextTop = Math.min(Math.max(top, padding), maxTop);

      button.style.left = `${nextLeft}px`;
      button.style.top = `${nextTop}px`;
      button.style.right = "auto";
      button.style.bottom = "auto";
    }

    function savePosition() {
      const rect = button.getBoundingClientRect();
      window.localStorage.setItem(
        ADMIN_ANALYTICS_POSITION_KEY,
        JSON.stringify({ left: rect.left, top: rect.top })
      );
    }

    try {
      const saved = window.localStorage.getItem(ADMIN_ANALYTICS_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { left?: number; top?: number };
        if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
          window.requestAnimationFrame(() => {
            clampAndPlace(parsed.left as number, parsed.top as number);
          });
        }
      }
    } catch {
      // Keep the normal bottom-right position if stored data is invalid.
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      const rect = button.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        moved: false,
      };
      suppressNextClick = false;
      button.style.cursor = "grabbing";
      button.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.moved && Math.hypot(deltaX, deltaY) >= 4) {
        drag.moved = true;
      }

      if (!drag.moved) return;

      event.preventDefault();
      clampAndPlace(drag.startLeft + deltaX, drag.startTop + deltaY);
    }

    function finishDrag(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (drag.moved) {
        suppressNextClick = true;
        savePosition();
      }

      if (button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      button.style.cursor = "grab";
      drag = null;
    }

    function onClick(event: MouseEvent) {
      if (!suppressNextClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressNextClick = false;
    }

    function onResize() {
      if (!button.style.left || !button.style.top) return;
      const rect = button.getBoundingClientRect();
      clampAndPlace(rect.left, rect.top);
      savePosition();
    }

    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);
    button.addEventListener("click", onClick, true);
    window.addEventListener("resize", onResize);

    return () => {
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", finishDrag);
      button.removeEventListener("pointercancel", finishDrag);
      button.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrapperRef}>
      <ConversionBoost />
    </div>
  );
}

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
    return <DraggableAdminConversion />;
  }

  if (!host) {
    return null;
  }

  return createPortal(<ConversionBoost />, host);
}
