"use client";

import Image from "next/image";
import Link from "next/link";
import { MouseEvent, useState } from "react";

const navigationLinks = [
  {
    label: "Products",
    id: "products",
  },
  {
    label: "About Us",
    id: "about",
  },
  {
    label: "FAQ",
    id: "faq",
  },
  {
    label: "Contact Us",
    id: "contact",
  },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleSectionClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) {
    setMenuOpen(false);

    if (window.location.pathname === "/") {
      event.preventDefault();

      const section =
        document.getElementById(sectionId);

      if (!section) {
        return;
      }

      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.pushState(
        {},
        "",
        `/#${sectionId}`
      );
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex shrink-0 items-center gap-3"
        >
          <Image
            src="/logo.jpeg"
            alt="ORVIX"
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-full object-cover"
          />

          <span className="text-lg font-black tracking-[0.3em]">
            ORVIX
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {navigationLinks.map((item) => (
            <a
              key={item.id}
              href={`/#${item.id}`}
              onClick={(event) =>
                handleSectionClick(
                  event,
                  item.id
                )
              }
              className="text-sm font-bold text-gray-300 transition hover:text-white"
            >
              {item.label}
            </a>
          ))}

          <Link
            href="/track-order"
            className="text-sm font-bold text-gray-300 transition hover:text-white"
          >
            Track Order
          </Link>

          <Link
            href="/products/google-fitbit-air"
            className="rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-gray-200"
          >
            Shop Now
          </Link>
        </nav>

        <button
          type="button"
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          aria-label={
            menuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 transition hover:bg-white/10 lg:hidden"
        >
          <span className="text-3xl leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 bg-black px-4 py-5 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-3">
            {navigationLinks.map((item) => (
              <a
                key={item.id}
                href={`/#${item.id}`}
                onClick={(event) =>
                  handleSectionClick(
                    event,
                    item.id
                  )
                }
                className="rounded-2xl border border-white/10 px-5 py-4 font-bold text-gray-200 transition hover:bg-white/10"
              >
                {item.label}
              </a>
            ))}

            <Link
              href="/track-order"
              onClick={closeMenu}
              className="rounded-2xl border border-white/10 px-5 py-4 font-bold text-gray-200 transition hover:bg-white/10"
            >
              Track Your Order
            </Link>

            <Link
              href="/products/google-fitbit-air"
              onClick={closeMenu}
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-black transition hover:bg-gray-200"
            >
              Shop Now
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}