"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3"
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

        <nav className="hidden items-center gap-7 md:flex">
          <Link
            href="/"
            className="text-sm font-bold text-gray-300 transition hover:text-white"
          >
            Products
          </Link>

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
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 md:hidden"
        >
          <span className="text-2xl leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-white/10 bg-black px-4 py-4 md:hidden">
          <div className="mx-auto grid max-w-7xl gap-3">
            <Link
              href="/"
              onClick={closeMenu}
              className="rounded-2xl border border-white/10 px-5 py-4 font-bold text-gray-200 transition hover:bg-white/10"
            >
              Products
            </Link>

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
              className="rounded-2xl bg-white px-5 py-4 text-center font-black text-black"
            >
              Shop Now
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}