"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_NAME = "Google Fitbit Air";
const PRODUCT_SLUG = "google-fitbit-air";
const PRODUCT_PRICE = 7900;
const CART_STORAGE_KEY = "orvixCart";

const INSTAPAY_LOGO =
  "data:image/webp;base64,UklGRpYEAABXRUJQVlA4IIoEAADQHQCdASqgAKAAPp1Mn0wlpCKiJTUJ0LATiU3cLlF/gIuekT0Pmn3ns1hkoV+3E8xvnAelj0AP6J1NW8+ftbhNVnnGn3JoPptQWL9uCxj36AlNUIKk6x788RawO9mkzhpNg/X1Xog17Mcb/qcokWN7fUK5xSXkwkK7rXdOD3AIJcb96/bZKQgmqcOrVBFLUjVQgLcPQTju688xmUBZLJ1WaZlMNhGVvgfMEicY/uwvZ+vwh8pSFZb8FeGHRio1wzPTi0qbQIx591DY4+MfKmfjLThbCTuxyCTazh5ciIsyXF6kO7970fyrySUEfvfoCU1QxftwWMdYAP7/LfgA7hYGEerK87IhgJUgJFS0xCb/g8N/udzPABaXg+cGWddzDkA/ii3q5/fH8v+AhcokpDm5x9FJUxLPGu9ivJe/bzTTHOjDzR95aVBrSxnpw32edjhslcRbVFwVnTETsgeFYXqdsC9XCK3rM8P2btemaHJuXzOTal1U2oT8j3/Mz3lK0/h6iae8Ex+ZBu3JAMicrRcXakrfS87FzILD624O9mTurRooi5Kl9S+WDxW7N9BnN3xVz1wySBmly/kMjuizbEm6EL4wghQG3QDNaZQ5bz/AsqSwJD0dJ/iGpVYR3cX7NqH4IUXkUCM9cNErz0vUPw20FansPbYacwjKeTYMxaourzlOkFUU3vl37Jegvgi3+xOSi6XvxBtHkeig2zm/yjhgqbMs+JQMfxOzAG8+nW6UYEfmNkdDPh1JdXVK0m5HEBx2lL2t56HYuTQaZ7oStvaTyih92yAmR6BgOiHerGoFIChPHpYFrY0gXvttDoZGUY/w+LtT6BV5ziCMPmT9XZMO9PtaHu0N4C+OphyyzQ3xO14/S0zfmXzRkJVvK95yewEi8FfmDxgzP2NzBRmffwO/97rmJetcx8ZpQ+GdCsHKo8EH5ePY+LqA8FgM6Ym2Rmy8N/ETj2cov5hPigzzMAK83sOHu9TQbVA237FGdrmrvNBonKlr+Lxgiipqi8XXiMyHl8/c3HOWX6SZgjUAk4H0hyMspVIAPQMfKNvbUepzw4jxm4Fmku6iK0POXN9xHg9pT32Xr+2iRtNyTqd44fyaAQASiWI0bQBAAAWO26VOYQkZsGOUEHiqAIEvz9ZYXkhFkMbJ1hpb/pbwG2l6aaODAvtAq97qV7fINf8VaiwjApmuzZ5XawZXi/vW8+yk9cdvbG/yyFrRl0h6PyMFGhh+wLQ0GCDa/jHzto9eQGG59aCBYr3fgf6cfj5GPCE33jFjj8NzKKNABHOEsAx8Y/XJeBTZIl4lWEL5RokBkWip3axl+aH/b2vBiLwUBTwJJyH0W2q25kDOmjiNlwrywjmOBxzYmfRQ9eNCU5eme4Nzac1pcIfWW8c4PVkP9lfeFbvrUVGDtPoYetO+2ltd1itantBIf+DhQ6eP4rwin2X5/BfznMST2LHTPUymtrSvRyzrYjRko1UbMEyxCDB1vbIw0jnJMdsrKzqQVQEpz7pNZw6Pbc/ES5+sCXHFr7E4MN9W4/0AAAAAAAAA";

type Colour = {
  name: string;
  image: string;
  buttonStyle: string;
};

type CartItem = {
  id: string;
  name: string;
  colour: string;
  image: string;
  price: number;
  quantity: number;
  slug: string;
};

const colours: Colour[] = [
  {
    name: "Black",
    image: "/black.png",
    buttonStyle: "bg-black",
  },
  {
    name: "Lavender",
    image: "/lavender.jpeg",
    buttonStyle: "bg-violet-300",
  },
  {
    name: "Berry",
    image: "/berry.jpeg",
    buttonStyle: "bg-pink-600",
  },
];

const deliveryAreas = [
  {
    code: "CAIRO",
    name: "Cairo",
    fee: 70,
  },
  {
    code: "ALEXANDRIA",
    name: "Alexandria",
    fee: 75,
  },
  {
    code: "DELTA_CANAL",
    name: "Delta and Canal Cities",
    fee: 85,
  },
  {
    code: "UPPER_EGYPT_RED_SEA",
    name: "Upper Egypt and Red Sea",
    fee: 100,
  },
  {
    code: "REMOTE_AREAS",
    name:
      "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
    fee: 140,
  },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function findColour(value: string | null) {
  if (!value) {
    return null;
  }

  return (
    colours.find(
      (colour) =>
        colour.name.toLowerCase() ===
        value.toLowerCase()
    ) ?? null
  );
}

function parseQuantity(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedQuantity = Number(value);

  if (
    !Number.isInteger(parsedQuantity) ||
    parsedQuantity < 1 ||
    parsedQuantity > 10
  ) {
    return null;
  }

  return parsedQuantity;
}

function readFirstCartItem(): CartItem | null {
  try {
    const savedCart =
      window.localStorage.getItem(
        CART_STORAGE_KEY
      );

    if (!savedCart) {
      return null;
    }

    const parsedCart = JSON.parse(savedCart);

    if (
      !Array.isArray(parsedCart) ||
      parsedCart.length === 0
    ) {
      return null;
    }

    return parsedCart[0] as CartItem;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();

  const [selectedColour, setSelectedColour] =
    useState<Colour>(colours[0]);

  const [selectedAreaCode, setSelectedAreaCode] =
    useState("");

  const [quantity, setQuantity] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [discountCode, setDiscountCode] =
    useState("");

  const [
    appliedDiscountCode,
    setAppliedDiscountCode,
  ] = useState("");

  const [discountMessage, setDiscountMessage] =
    useState("");

  const [
    checkingDiscount,
    setCheckingDiscount,
  ] = useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const selectedArea = deliveryAreas.find(
    (area) => area.code === selectedAreaCode
  );

  const deliveryFee = selectedArea?.fee ?? 0;

  const productsTotal =
    PRODUCT_PRICE * quantity;

  const hasFreeDelivery =
    appliedDiscountCode.length > 0;

  const deliveryDiscount = hasFreeDelivery
    ? deliveryFee
    : 0;

  const finalDeliveryFee = Math.max(
    deliveryFee - deliveryDiscount,
    0
  );

  const finalTotal =
    productsTotal + finalDeliveryFee;

  useEffect(() => {
    const searchParams = new URLSearchParams(
      window.location.search
    );

    const colourFromUrl = findColour(
      searchParams.get("colour")
    );

    const quantityFromUrl = parseQuantity(
      searchParams.get("quantity")
    );

    if (colourFromUrl) {
      setSelectedColour(colourFromUrl);
    }

    if (quantityFromUrl) {
      setQuantity(quantityFromUrl);
    }

    if (!colourFromUrl || !quantityFromUrl) {
      const cartItem = readFirstCartItem();

      if (!cartItem) {
        return;
      }

      if (!colourFromUrl) {
        const cartColour = findColour(
          cartItem.colour
        );

        if (cartColour) {
          setSelectedColour(cartColour);
        }
      }

      if (!quantityFromUrl) {
        const cartQuantity = parseQuantity(
          String(cartItem.quantity)
        );

        if (cartQuantity) {
          setQuantity(cartQuantity);
        }
      }
    }
  }, []);

  useEffect(() => {
    setAppliedDiscountCode("");
    setDiscountMessage("");
    setDiscountCode("");
  }, [selectedAreaCode]);

  async function applyDiscountCode() {
    const cleanCode = discountCode
      .trim()
      .toUpperCase();

    if (!selectedArea) {
      setAppliedDiscountCode("");

      setDiscountMessage(
        "Please select your delivery area first."
      );

      return;
    }

    if (!cleanCode) {
      setAppliedDiscountCode("");

      setDiscountMessage(
        "Please enter a discount code."
      );

      return;
    }

    setCheckingDiscount(true);
    setDiscountMessage("");

    try {
      const response = await fetch(
        "/api/discounts/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: cleanCode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setAppliedDiscountCode("");

        setDiscountMessage(
          result.message ||
            "Invalid discount code."
        );

        return;
      }

      if (
        result.discountType !== "free_delivery"
      ) {
        setAppliedDiscountCode("");

        setDiscountMessage(
          "This code cannot be used for delivery."
        );

        return;
      }

      setAppliedDiscountCode(result.code);
      setDiscountCode(result.code);

      setDiscountMessage(
        "Free delivery applied successfully."
      );
    } catch {
      setAppliedDiscountCode("");

      setDiscountMessage(
        "Could not check the discount code."
      );
    } finally {
      setCheckingDiscount(false);
    }
  }

  function removeDiscountCode() {
    setAppliedDiscountCode("");
    setDiscountCode("");

    setDiscountMessage(
      "Discount code removed."
    );
  }

  async function handleOrderSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSending) {
      return;
    }

    setOrderError("");

    if (!selectedArea) {
      setOrderError(
        "Please select your delivery area."
      );

      return;
    }

    if (!fullName.trim()) {
      setOrderError(
        "Please enter your full name."
      );

      return;
    }

    if (!phone.trim()) {
      setOrderError(
        "Please enter your phone number."
      );

      return;
    }

    if (!customerEmail.trim()) {
      setOrderError(
        "Please enter your email address."
      );

      return;
    }

    if (!isValidEmail(customerEmail)) {
      setOrderError(
        "Please enter a valid email address."
      );

      return;
    }

    if (!address.trim()) {
      setOrderError(
        "Please enter your full address."
      );

      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        "/api/order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: fullName.trim(),
            phone: phone.trim(),

            customerEmail: customerEmail
              .trim()
              .toLowerCase(),

            governorate: selectedArea.name,
            address: address.trim(),
            notes: notes.trim(),

            productName: PRODUCT_NAME,
            productSlug: PRODUCT_SLUG,

            colour: selectedColour.name,
            quantity,

            productPrice: PRODUCT_PRICE,

            deliveryFee:
              finalDeliveryFee,

            originalDeliveryFee:
              deliveryFee,

            discountCode:
              appliedDiscountCode || "",

            deliveryDiscount,
            totalPrice: finalTotal,

            paymentMethod:
              "instapay_on_delivery",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not place your order."
        );
      }

      const createdOrderNumber =
        result.orderNumber ||
        result.order?.order_number;

      if (!createdOrderNumber) {
        throw new Error(
          "Your order was saved, but the order number was not returned."
        );
      }

      sessionStorage.setItem(
        "orvixLastOrderPhone",
        phone.trim()
      );

      sessionStorage.setItem(
        "orvixLastOrderEmail",
        customerEmail.trim().toLowerCase()
      );

      window.localStorage.removeItem(
        CART_STORAGE_KEY
      );

      window.dispatchEvent(
        new Event("orvix-cart-updated")
      );

      router.push(
        `/order-success/${encodeURIComponent(
          createdOrderNumber
        )}`
      );
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "Could not place your order."
      );

      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <Navbar />

      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              Secure checkout
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              Complete your order
            </h1>

            <p className="mt-5 max-w-2xl leading-7 text-gray-400">
              Review your product, enter your
              delivery information and pay using
              InstaPay when your order arrives.
            </p>
          </div>

          <form
            onSubmit={handleOrderSubmit}
            className="grid items-start gap-10 lg:grid-cols-[1fr_0.85fr]"
          >
            <div className="space-y-8">
              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Your product
                </h2>

                <div className="mt-6 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="rounded-[24px] bg-white p-4">
                    <Image
                      key={selectedColour.name}
                      src={selectedColour.image}
                      alt={`${PRODUCT_NAME} - ${selectedColour.name}`}
                      width={500}
                      height={500}
                      priority
                      className="h-auto w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                      Fitness tracker
                    </p>

                    <h3 className="mt-3 text-3xl font-black">
                      {PRODUCT_NAME}
                    </h3>

                    <p className="mt-3 text-gray-400">
                      {PRODUCT_PRICE.toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP each
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {selectedColour.name} ·
                      Quantity {quantity}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Choose your colour
                </h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {colours.map((colour) => {
                    const selected =
                      selectedColour.name ===
                      colour.name;

                    return (
                      <button
                        key={colour.name}
                        type="button"
                        onClick={() =>
                          setSelectedColour(colour)
                        }
                        disabled={isSending}
                        className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition disabled:opacity-50 ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/15 bg-black/20 text-white hover:border-white/30"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-full border ${
                            selected
                              ? "border-black/20"
                              : "border-white/20"
                          } ${colour.buttonStyle}`}
                        />

                        {colour.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Quantity
                </h2>

                <div className="mt-6 flex w-fit items-center rounded-full border border-white/15 bg-black/30 p-2">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.max(1, current - 1)
                      )
                    }
                    disabled={isSending}
                    aria-label="Decrease quantity"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl disabled:opacity-50"
                  >
                    −
                  </button>

                  <span className="min-w-16 text-center text-xl font-bold">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(10, current + 1)
                      )
                    }
                    disabled={isSending}
                    aria-label="Increase quantity"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-black disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Contact information
                </h2>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Full name
                    </span>

                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) =>
                        setFullName(
                          event.target.value
                        )
                      }
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Phone number
                    </span>

                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Email address
                    </span>

                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) =>
                        setCustomerEmail(
                          event.target.value
                        )
                      }
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Your order number and tracking
                      details will be sent to this
                      email.
                    </p>
                  </label>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Delivery information
                </h2>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Governorate / delivery area
                    </span>

                    <select
                      value={selectedAreaCode}
                      onChange={(event) =>
                        setSelectedAreaCode(
                          event.target.value
                        )
                      }
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-white outline-none focus:border-white disabled:opacity-50"
                    >
                      <option value="">
                        Select your delivery area
                      </option>

                      {deliveryAreas.map(
                        (area) => (
                          <option
                            key={area.code}
                            value={area.code}
                          >
                            {area.name} —{" "}
                            {area.fee} EGP
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Full address
                    </span>

                    <textarea
                      value={address}
                      onChange={(event) =>
                        setAddress(
                          event.target.value
                        )
                      }
                      placeholder="Area, street, building, floor and apartment"
                      rows={4}
                      autoComplete="street-address"
                      disabled={isSending}
                      required
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Order notes — optional
                    </span>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value
                        )
                      }
                      placeholder="Add any useful delivery notes"
                      rows={3}
                      disabled={isSending}
                      className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>
                </div>
              </section>
            </div>

            <aside className="rounded-[32px] border border-white/10 bg-[#111111] p-5 sm:p-7 lg:sticky lg:top-28">
              <h2 className="text-2xl font-black">
                Order summary
              </h2>

              <div className="mt-7 space-y-5">
                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Product
                  </span>

                  <strong className="text-right">
                    {PRODUCT_NAME}
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Colour
                  </span>

                  <strong>
                    {selectedColour.name}
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Quantity
                  </span>

                  <strong>{quantity}</strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Products total
                  </span>

                  <strong>
                    {productsTotal.toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </strong>
                </div>

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Delivery
                  </span>

                  <strong>
                    {!selectedArea
                      ? "Select area"
                      : finalDeliveryFee === 0
                        ? "FREE"
                        : `${finalDeliveryFee} EGP`}
                  </strong>
                </div>

                {deliveryDiscount > 0 && (
                  <div className="flex justify-between gap-5 text-green-400">
                    <span>
                      Delivery discount
                    </span>

                    <strong>
                      -{deliveryDiscount} EGP
                    </strong>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                  Delivery discount code
                </p>

                <div className="mt-4 flex gap-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(event) => {
                      setDiscountCode(
                        event.target.value.toUpperCase()
                      );

                      setAppliedDiscountCode("");
                      setDiscountMessage("");
                    }}
                    placeholder="Enter code"
                    disabled={
                      !selectedArea ||
                      isSending
                    }
                    className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={
                      hasFreeDelivery
                        ? removeDiscountCode
                        : applyDiscountCode
                    }
                    disabled={
                      checkingDiscount ||
                      !selectedArea ||
                      isSending
                    }
                    className="rounded-2xl bg-white px-5 py-4 font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingDiscount
                      ? "Checking..."
                      : hasFreeDelivery
                        ? "Remove"
                        : "Apply"}
                  </button>
                </div>

                {!selectedArea && (
                  <p className="mt-3 text-sm text-gray-500">
                    Select your delivery area before
                    applying a code.
                  </p>
                )}

                {discountMessage && (
                  <p
                    className={`mt-3 text-sm ${
                      hasFreeDelivery
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {discountMessage}
                  </p>
                )}
              </div>

              <div className="my-8 h-px bg-white/10" />

              <div className="flex items-end justify-between gap-5">
                <span className="text-xl font-black">
                  Final total
                </span>

                <strong className="text-3xl">
                  {finalTotal.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </strong>
              </div>

              <div className="mt-7 rounded-3xl border border-white/10 bg-black p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black p-1">
                    <img
                      src={INSTAPAY_LOGO}
                      alt="InstaPay"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-white">
                      InstaPay on Delivery
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Pay through InstaPay only when
                      your order arrives. No advance
                      payment is required.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs leading-5 text-gray-500">
                    Official payment details will
                    be provided when your order is
                    confirmed or delivered. Never
                    transfer money to an unverified
                    account.
                  </p>
                </div>
              </div>

              {orderError && (
                <p
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
                >
                  {orderError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending
                  ? "Placing order..."
                  : `Place order — ${finalTotal.toLocaleString(
                      "en-GB"
                    )} EGP`}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-gray-500">
                By placing your order, you confirm
                that the provided information is
                correct.
              </p>

              {isSending && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Please do not close or refresh
                  this page.
                </p>
              )}
            </aside>
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. All rights reserved.
        </p>
      </footer>
    </main>
  );
}