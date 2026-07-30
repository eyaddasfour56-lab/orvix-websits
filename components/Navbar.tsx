"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type CartItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  quantity: number;
  slug: string;
};

type WishlistItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  slug: string;
};

const CART_STORAGE_KEY = "orvixCart";
const WISHLIST_STORAGE_KEY = "orvixWishlist";

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

function readCartFromStorage(): CartItem[] {
  try {
    const savedCart =
      window.localStorage.getItem(
        CART_STORAGE_KEY
      );

    if (!savedCart) {
      return [];
    }

    const parsedCart = JSON.parse(savedCart);

    return Array.isArray(parsedCart)
      ? parsedCart
      : [];
  } catch {
    return [];
  }
}

function readWishlistFromStorage(): WishlistItem[] {
  try {
    const savedWishlist =
      window.localStorage.getItem(
        WISHLIST_STORAGE_KEY
      );

    if (!savedWishlist) {
      return [];
    }

    const parsedWishlist =
      JSON.parse(savedWishlist);

    return Array.isArray(parsedWishlist)
      ? parsedWishlist
      : [];
  } catch {
    return [];
  }
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [wishlistOpen, setWishlistOpen] =
    useState(false);

  const [cartItems, setCartItems] = useState<
    CartItem[]
  >([]);

  const [
    wishlistItems,
    setWishlistItems,
  ] = useState<WishlistItem[]>([]);

  useEffect(() => {
    function refreshCart() {
      setCartItems(readCartFromStorage());
    }

    function refreshWishlist() {
      setWishlistItems(
        readWishlistFromStorage()
      );
    }

    function refreshStorage() {
      refreshCart();
      refreshWishlist();
    }

    refreshStorage();

    window.addEventListener(
      "storage",
      refreshStorage
    );

    window.addEventListener(
      "orvix-cart-updated",
      refreshCart
    );

    window.addEventListener(
      "orvix-wishlist-updated",
      refreshWishlist
    );

    return () => {
      window.removeEventListener(
        "storage",
        refreshStorage
      );

      window.removeEventListener(
        "orvix-cart-updated",
        refreshCart
      );

      window.removeEventListener(
        "orvix-wishlist-updated",
        refreshWishlist
      );
    };
  }, []);

  useEffect(() => {
    if (cartOpen || wishlistOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, wishlistOpen]);

  const totalQuantity = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total +
          item.price * item.quantity,
        0
      ),
    [cartItems]
  );

  const checkoutLink = useMemo(() => {
    const firstItem = cartItems[0];

    if (!firstItem) {
      return "/products/google-fitbit-air";
    }

    return `/checkout?product=${encodeURIComponent(
      firstItem.name
    )}&colour=${encodeURIComponent(
      firstItem.colour
    )}&quantity=${firstItem.quantity}`;
  }, [cartItems]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function closeDrawers() {
    setCartOpen(false);
    setWishlistOpen(false);
  }

  function openCart() {
    setMenuOpen(false);
    setWishlistOpen(false);
    setCartOpen(true);
  }

  function openWishlist() {
    setMenuOpen(false);
    setCartOpen(false);
    setWishlistOpen(true);
  }

  function saveCart(items: CartItem[]) {
    setCartItems(items);

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new Event("orvix-cart-updated")
    );
  }

  function saveWishlist(
    items: WishlistItem[]
  ) {
    setWishlistItems(items);

    window.localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new Event("orvix-wishlist-updated")
    );
  }

  function increaseQuantity(itemId: string) {
    const updatedCart = cartItems.map(
      (item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: Math.min(
                item.quantity + 1,
                10
              ),
            }
          : item
    );

    saveCart(updatedCart);
  }

  function decreaseQuantity(itemId: string) {
    const updatedCart = cartItems
      .map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity:
                item.quantity - 1,
            }
          : item
      )
      .filter(
        (item) => item.quantity > 0
      );

    saveCart(updatedCart);
  }

  function removeCartItem(itemId: string) {
    const updatedCart = cartItems.filter(
      (item) => item.id !== itemId
    );

    saveCart(updatedCart);
  }

  function removeWishlistItem(
    itemId: string
  ) {
    const updatedWishlist =
      wishlistItems.filter(
        (item) => item.id !== itemId
      );

    saveWishlist(updatedWishlist);
  }

  function moveWishlistItemToCart(
    wishlistItem: WishlistItem
  ) {
    const cartItemId = wishlistItem.id;

    const existingItemIndex =
      cartItems.findIndex(
        (item) => item.id === cartItemId
      );

    let updatedCart: CartItem[];

    if (existingItemIndex >= 0) {
      updatedCart = cartItems.map(
        (item, index) =>
          index === existingItemIndex
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  10
                ),
              }
            : item
      );
    } else {
      const newCartItem: CartItem = {
        ...wishlistItem,
        quantity: 1,
      };

      updatedCart = [
        ...cartItems,
        newCartItem,
      ];
    }

    saveCart(updatedCart);

    const updatedWishlist =
      wishlistItems.filter(
        (item) =>
          item.id !== wishlistItem.id
      );

    saveWishlist(updatedWishlist);

    setWishlistOpen(false);
    setCartOpen(true);
  }

  function handleSectionClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) {
    setMenuOpen(false);

    if (
      window.location.pathname === "/"
    ) {
      event.preventDefault();

      const section =
        document.getElementById(
          sectionId
        );

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
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
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

          <div className="flex items-center gap-2">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={openWishlist}
              aria-label={`Open wishlist with ${wishlistItems.length} items`}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                fill={
                  wishlistItems.length > 0
                    ? "currentColor"
                    : "none"
                }
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M20.8 4.6C18.9 2.7 15.8 2.7 13.9 4.6L12 6.5L10.1 4.6C8.2 2.7 5.1 2.7 3.2 4.6C1.3 6.5 1.3 9.6 3.2 11.5L12 20.3L20.8 11.5C22.7 9.6 22.7 6.5 20.8 4.6Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {wishlistItems.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
                  {wishlistItems.length > 99
                    ? "99+"
                    : wishlistItems.length}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={openCart}
              aria-label={`Open cart with ${totalQuantity} items`}
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M3 4H5L7.2 14.2C7.4 15.2 8.3 16 9.4 16H17.7C18.7 16 19.6 15.3 19.9 14.3L21 8H6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M10 20C10 20.55 9.55 21 9 21C8.45 21 8 20.55 8 20C8 19.45 8.45 19 9 19C9.55 19 10 19.45 10 20Z"
                  fill="currentColor"
                />

                <path
                  d="M19 20C19 20.55 18.55 21 18 21C17.45 21 17 20.55 17 20C17 19.45 17.45 19 18 19C18.55 19 19 19.45 19 20Z"
                  fill="currentColor"
                />
              </svg>

              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
                  {totalQuantity > 99
                    ? "99+"
                    : totalQuantity}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (current) => !current
                )
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

              <button
                type="button"
                onClick={openWishlist}
                className="rounded-2xl border border-white/10 px-5 py-4 text-left font-bold text-gray-200 transition hover:bg-white/10"
              >
                Wishlist (
                {wishlistItems.length})
              </button>

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

      {/* Overlay */}
      <div
        aria-hidden={
          !cartOpen && !wishlistOpen
        }
        onClick={closeDrawers}
        className={`fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm transition duration-300 ${
          cartOpen || wishlistOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      />

      {/* Wishlist Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Wishlist"
        className={`fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0b0b] text-white shadow-2xl transition-transform duration-300 ${
          wishlistOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              ORVIX
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Your Wishlist
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              setWishlistOpen(false)
            }
            aria-label="Close wishlist"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-2xl transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-9 w-9 text-gray-400"
              >
                <path
                  d="M20.8 4.6C18.9 2.7 15.8 2.7 13.9 4.6L12 6.5L10.1 4.6C8.2 2.7 5.1 2.7 3.2 4.6C1.3 6.5 1.3 9.6 3.2 11.5L12 20.3L20.8 11.5C22.7 9.6 22.7 6.5 20.8 4.6Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3 className="mt-6 text-2xl font-black">
              Your wishlist is empty
            </h3>

            <p className="mt-3 max-w-xs leading-7 text-gray-400">
              Save products you like and return
              to them whenever you are ready.
            </p>

            <Link
              href="/products/google-fitbit-air"
              onClick={() =>
                setWishlistOpen(false)
              }
              className="mt-7 rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {wishlistItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex gap-4">
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() =>
                        setWishlistOpen(false)
                      }
                      className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white p-2"
                    >
                      <Image
                        src={item.image}
                        alt={`${item.name} - ${item.colour}`}
                        width={160}
                        height={160}
                        className="h-full w-full object-contain"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={() =>
                          setWishlistOpen(false)
                        }
                        className="block truncate font-black hover:underline"
                      >
                        {item.name}
                      </Link>

                      <p className="mt-1 text-sm text-gray-400">
                        Colour: {item.colour}
                      </p>

                      <p className="mt-2 font-black">
                        {item.price.toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeWishlistItem(
                            item.id
                          )
                        }
                        className="mt-2 text-sm font-bold text-gray-500 underline underline-offset-4 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      moveWishlistItemToCart(
                        item
                      )
                    }
                    className="mt-4 flex w-full items-center justify-center rounded-full bg-white px-5 py-4 font-black text-black transition hover:bg-gray-200"
                  >
                    Move to Cart
                  </button>
                </article>
              ))}
            </div>

            <div className="border-t border-white/10 bg-black/60 p-5 backdrop-blur-xl sm:p-6">
              <button
                type="button"
                onClick={() => {
                  setWishlistOpen(false);
                  setCartOpen(true);
                }}
                className="flex w-full items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
              >
                Open Cart
              </button>

              <button
                type="button"
                onClick={() =>
                  setWishlistOpen(false)
                }
                className="mt-3 w-full py-3 text-sm font-bold text-gray-400 transition hover:text-white"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Cart Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-md flex-col border-l border-white/10 bg-[#0b0b0b] text-white shadow-2xl transition-transform duration-300 ${
          cartOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
              ORVIX
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Your Cart
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              setCartOpen(false)
            }
            aria-label="Close cart"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-2xl transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-9 w-9 text-gray-400"
              >
                <path
                  d="M3 4H5L7.2 14.2C7.4 15.2 8.3 16 9.4 16H17.7C18.7 16 19.6 15.3 19.9 14.3L21 8H6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="9"
                  cy="20"
                  r="1"
                  fill="currentColor"
                />

                <circle
                  cx="18"
                  cy="20"
                  r="1"
                  fill="currentColor"
                />
              </svg>
            </div>

            <h3 className="mt-6 text-2xl font-black">
              Your cart is empty
            </h3>

            <p className="mt-3 max-w-xs leading-7 text-gray-400">
              Add a product to your cart and it
              will appear here.
            </p>

            <Link
              href="/products/google-fitbit-air"
              onClick={() =>
                setCartOpen(false)
              }
              className="mt-7 rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
              {cartItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white p-2">
                      <Image
                        src={item.image}
                        alt={`${item.name} - ${item.colour}`}
                        width={160}
                        height={160}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">
                        {item.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Colour: {item.colour}
                      </p>

                      <p className="mt-2 font-black">
                        {item.price.toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeCartItem(
                            item.id
                          )
                        }
                        className="mt-2 text-sm font-bold text-gray-500 underline underline-offset-4 transition hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-sm font-bold text-gray-400">
                      Quantity
                    </span>

                    <div className="flex items-center rounded-full border border-white/15 bg-black p-1">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(
                            item.id
                          )
                        }
                        aria-label={`Decrease ${item.name} quantity`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition hover:bg-white/10"
                      >
                        −
                      </button>

                      <span className="min-w-10 text-center font-black">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(
                            item.id
                          )
                        }
                        aria-label={`Increase ${item.name} quantity`}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="border-t border-white/10 bg-black/60 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-sm text-gray-500">
                    Subtotal
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    Delivery calculated at checkout
                  </p>
                </div>

                <strong className="text-2xl">
                  {cartSubtotal.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </strong>
              </div>

              <Link
                href={checkoutLink}
                onClick={() =>
                  setCartOpen(false)
                }
                className="mt-5 flex w-full items-center justify-center rounded-full bg-white px-7 py-5 text-lg font-black text-black transition hover:bg-gray-200"
              >
                Proceed to Checkout
              </Link>

              <button
                type="button"
                onClick={() =>
                  setCartOpen(false)
                }
                className="mt-3 w-full py-3 text-sm font-bold text-gray-400 transition hover:text-white"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}