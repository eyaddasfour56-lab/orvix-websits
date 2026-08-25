"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CONTACT_PHRASES = [
  "contact us",
  "contact orvix",
  "تواصل معنا",
  "تواصل مع orvix",
];

function normalize(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shouldOpenCustomerService(element: Element) {
  const text = normalize(element.textContent);
  const ariaLabel = normalize(element.getAttribute("aria-label"));
  const title = normalize(element.getAttribute("title"));
  const combined = `${text} ${ariaLabel} ${title}`;

  if (CONTACT_PHRASES.some((phrase) => combined.includes(phrase))) {
    return true;
  }

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href") || "";
    return href === "#contact" || href === "/#contact" || href.endsWith("/#contact");
  }

  return false;
}

export default function CustomerServiceLink() {
  const pathname = usePathname();
  const hidden =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/chat") ||
    pathname?.startsWith("/under-construction") ||
    pathname?.startsWith("/buy-orvix") ||
    pathname?.startsWith("/system-preview") ||
    pathname?.startsWith("/license");

  useEffect(() => {
    if (hidden) return;

    function rewriteContactLinks() {
      document.querySelectorAll<HTMLAnchorElement>("a").forEach((anchor) => {
        if (!shouldOpenCustomerService(anchor)) return;

        anchor.setAttribute("href", "/chat");
        anchor.removeAttribute("target");
        anchor.removeAttribute("rel");
      });
    }

    function handleContactClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickable = target.closest("a, button");
      if (!clickable || !shouldOpenCustomerService(clickable)) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/chat");
    }

    rewriteContactLinks();

    const observer = new MutationObserver(() => {
      rewriteContactLinks();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("click", handleContactClick, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleContactClick, true);
    };
  }, [hidden]);

  if (hidden) {
    return null;
  }

  return (
    <Link
      href="/chat"
      className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full border border-blue-400/25 bg-[#111827] px-4 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-blue-400/45 hover:bg-[#172033] print:hidden"
      aria-label="Open ORVIX Customer Service"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-500 text-white">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
      </span>
      Customer Service
    </Link>
  );
}
