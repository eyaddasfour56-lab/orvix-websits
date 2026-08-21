"use client";

import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import ConversionBoost from "@/components/ConversionBoost";

const ADMIN_ANALYTICS_POSITION_KEY = "orvix-admin-analytics-button-position";

type ButtonPosition = {
  left: number;
  top: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

function clampButtonPosition(
  left: number,
  top: number,
  width: number,
  height: number
): ButtonPosition {
  const padding = 8;
  const maxLeft = Math.max(padding, window.innerWidth - width - padding);
  const maxTop = Math.max(padding, window.innerHeight - height - padding);

  return {
    left: Math.min(Math.max(left, padding), maxLeft),
    top: Math.min(Math.max(top, padding), maxTop),
  };
}

function DraggableAdminAnalyticsButton() {
  const buttonRef = useRef<HTMLAnchorElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<ButtonPosition | null>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    try {
      const saved = window.localStorage.getItem(ADMIN_ANALYTICS_POSITION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ButtonPosition>;
        if (typeof parsed.left === "number" && typeof parsed.top === "number") {
          window.requestAnimationFrame(() => {
            const currentButton = buttonRef.current;
            if (!currentButton) return;
            const rect = currentButton.getBoundingClientRect();
            setPosition(
              clampButtonPosition(parsed.left as number, parsed.top as number, rect.width, rect.height)
            );
          });
        }
      }
    } catch {
      // Ignore invalid stored position and keep the default bottom-right position.
    }

    function handleResize() {
      const currentButton = buttonRef.current;
      if (!currentButton) return;

      setPosition((current) => {
        if (!current) return current;
        const rect = currentButton.getBoundingClientRect();
        const next = clampButtonPosition(current.left, current.top, rect.width, rect.height);
        try {
          window.localStorage.setItem(ADMIN_ANALYTICS_POSITION_KEY, JSON.stringify(next));
        } catch {
          // Local storage can be unavailable in some private browsing modes.
        }
        return next;
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    };
    suppressClickRef.current = false;
    event.currentTarget.style.cursor = "grabbing";

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional; dragging still works when unsupported.
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.moved && Math.hypot(deltaX, deltaY) >= 3) {
      drag.moved = true;
    }

    if (!drag.moved) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition(
      clampButtonPosition(
        drag.startLeft + deltaX,
        drag.startTop + deltaY,
        rect.width,
        rect.height
      )
    );
  }

  function finishDrag(event: ReactPointerEvent<HTMLAnchorElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.moved) {
      suppressClickRef.current = true;
      const rect = event.currentTarget.getBoundingClientRect();
      const next = clampButtonPosition(rect.left, rect.top, rect.width, rect.height);
      setPosition(next);
      try {
        window.localStorage.setItem(ADMIN_ANALYTICS_POSITION_KEY, JSON.stringify(next));
      } catch {
        // Moving the button should still work even if local storage is unavailable.
      }
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore release errors on browsers without pointer capture support.
    }

    event.currentTarget.style.cursor = "grab";
    dragRef.current = null;
  }

  function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  return (
    <a
      ref={buttonRef}
      href="/admin/analytics"
      draggable={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={handleClick}
      onDragStart={(event) => event.preventDefault()}
      className="fixed bottom-5 right-5 z-[190] rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-black text-black shadow-2xl select-none active:scale-[0.99]"
      style={
        position
          ? {
              left: position.left,
              top: position.top,
              right: "auto",
              bottom: "auto",
              touchAction: "none",
              cursor: "grab",
            }
          : { touchAction: "none", cursor: "grab" }
      }
      aria-label="Conversion analytics"
    >
      Conversion analytics
    </a>
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
    if (pathname.startsWith("/admin/analytics")) return null;
    return <DraggableAdminAnalyticsButton />;
  }

  if (!host) {
    return null;
  }

  return createPortal(<ConversionBoost />, host);
}
