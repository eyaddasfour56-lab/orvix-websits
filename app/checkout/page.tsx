"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Navbar from "@/components/Navbar";

const PRODUCT_NAME = "Google Fitbit Air";
const PRODUCT_SLUG = "google-fitbit-air";
const PRODUCT_PRICE = 7900;
const CART_STORAGE_KEY = "orvixCart";

const INSTAPAY_LOGO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="240"
      height="240"
      viewBox="0 0 240 240"
    >
      <rect
        width="240"
        height="240"
        rx="45"
        fill="#101010"
      />

      <circle
        cx="120"
        cy="120"
        r="82"
        fill="#7b2cbf"
      />

      <text
        x="120"
        y="137"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="58"
        font-weight="900"
        fill="white"
      >
        IP
      </text>
    </svg>
  `);

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

type DiscountType =
  | "free_delivery"
  | "fixed_amount"
  | "percentage";

type AppliedDiscount = {
  code: string;
  type: DiscountType;
  value: number;
};

type DiscountApiResult = {
  success?: boolean;
  message?: string;

  code?: string;

  type?: string;
  discountType?: string;
  discount_type?: string;

  value?: number | string;
  amount?: number | string;
  percentage?: number | string;

  discountValue?: number | string;
  discount_value?: number | string;

  discountAmount?: number | string;
  discount_amount?: number | string;

  productDiscount?: number | string;
  product_discount?: number | string;

  deliveryDiscount?: number | string;
  delivery_discount?: number | string;

  totalDiscount?: number | string;
  total_discount?: number | string;

  discount?: {
    code?: string;

    type?: string;
    discountType?: string;
    discount_type?: string;

    value?: number | string;
    amount?: number | string;
    percentage?: number | string;

    discountValue?: number | string;
    discount_value?: number | string;

    discountAmount?: number | string;
    discount_amount?: number | string;

    productDiscount?: number | string;
    product_discount?: number | string;

    deliveryDiscount?: number | string;
    delivery_discount?: number | string;

    totalDiscount?: number | string;
    total_discount?: number | string;
  };
};

type DiscountMessageType =
  | "success"
  | "error"
  | "neutral";

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

function safeNumber(
  value:
    | number
    | string
    | null
    | undefined
) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(parsedValue, 0);
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

function normaliseDiscountType(
  result: DiscountApiResult
): DiscountType | null {
  const rawType =
    result.discountType ??
    result.discount_type ??
    result.type ??
    result.discount?.discountType ??
    result.discount?.discount_type ??
    result.discount?.type ??
    "";

  const cleanType = String(rawType)
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  const freeDeliveryTypes = [
    "free_delivery",
    "free_shipping",
    "free_delivery_code",
    "shipping",
    "delivery",
    "shipping_discount",
    "delivery_discount",
  ];

  if (
    freeDeliveryTypes.includes(cleanType)
  ) {
    return "free_delivery";
  }

  const fixedAmountTypes = [
    "fixed_amount",
    "fixed",
    "amount",
    "money",
    "cash",
    "fixed_discount",
    "amount_discount",
    "cash_discount",
  ];

  if (
    fixedAmountTypes.includes(cleanType)
  ) {
    return "fixed_amount";
  }

  const percentageTypes = [
    "percentage",
    "percent",
    "percentage_off",
    "percent_off",
    "percentage_discount",
    "percent_discount",
  ];

  if (
    percentageTypes.includes(cleanType)
  ) {
    return "percentage";
  }

  return null;
}

function getDiscountValue(
  result: DiscountApiResult
) {
  const rawValue =
    result.discountValue ??
    result.discount_value ??
    result.value ??
    result.amount ??
    result.percentage ??
    result.discountAmount ??
    result.discount_amount ??
    result.discount?.discountValue ??
    result.discount?.discount_value ??
    result.discount?.value ??
    result.discount?.amount ??
    result.discount?.percentage ??
    result.discount?.discountAmount ??
    result.discount?.discount_amount ??
    0;

  return safeNumber(rawValue);
}

function getApiProductDiscount(
  result: DiscountApiResult
) {
  return safeNumber(
    result.productDiscount ??
      result.product_discount ??
      result.discount?.productDiscount ??
      result.discount?.product_discount ??
      0
  );
}

function getApiDeliveryDiscount(
  result: DiscountApiResult
) {
  return safeNumber(
    result.deliveryDiscount ??
      result.delivery_discount ??
      result.discount?.deliveryDiscount ??
      result.discount?.delivery_discount ??
      0
  );
}

function getApiTotalDiscount(
  result: DiscountApiResult
) {
  return safeNumber(
    result.totalDiscount ??
      result.total_discount ??
      result.discount?.totalDiscount ??
      result.discount?.total_discount ??
      result.discountAmount ??
      result.discount_amount ??
      result.discount?.discountAmount ??
      result.discount?.discount_amount ??
      0
  );
}

function getReturnedDiscountCode(
  result: DiscountApiResult,
  fallbackCode: string
) {
  const returnedCode =
    result.code ??
    result.discount?.code ??
    fallbackCode;

  return String(returnedCode)
    .trim()
    .toUpperCase();
}

function createAppliedDiscount(
  result: DiscountApiResult,
  fallbackCode: string,
  productsTotal: number,
  deliveryFee: number
): AppliedDiscount | null {
  let discountType =
    normaliseDiscountType(result);

  let discountValue =
    getDiscountValue(result);

  const apiProductDiscount =
    getApiProductDiscount(result);

  const apiDeliveryDiscount =
    getApiDeliveryDiscount(result);

  const apiTotalDiscount =
    getApiTotalDiscount(result);

  /*
    بعض نسخ الـ API القديمة ممكن ترجع
    قيمة الخصم من غير نوع الخصم.
    الكود ده بيحاول يحدد النوع تلقائيًا.
  */
  if (!discountType) {
    if (
      apiDeliveryDiscount > 0 &&
      apiProductDiscount === 0
    ) {
      discountType = "free_delivery";
    } else if (
      apiProductDiscount > 0 ||
      apiTotalDiscount > 0
    ) {
      discountType = "fixed_amount";
    }
  }

  if (!discountType) {
    return null;
  }

  if (
    discountType === "free_delivery"
  ) {
    return {
      code: getReturnedDiscountCode(
        result,
        fallbackCode
      ),
      type: "free_delivery",
      value: deliveryFee,
    };
  }

  if (discountValue <= 0) {
    discountValue =
      apiProductDiscount ||
      apiTotalDiscount;
  }

  if (
    discountType === "fixed_amount"
  ) {
    const fixedValue = Math.min(
      Math.round(discountValue),
      productsTotal
    );

    if (fixedValue <= 0) {
      return null;
    }

    return {
      code: getReturnedDiscountCode(
        result,
        fallbackCode
      ),
      type: "fixed_amount",
      value: fixedValue,
    };
  }

  if (
    discountValue <= 0 ||
    discountValue > 100
  ) {
    return null;
  }

  return {
    code: getReturnedDiscountCode(
      result,
      fallbackCode
    ),
    type: "percentage",
    value: discountValue,
  };
}

export default function CheckoutPage() {
  const router = useRouter();

  const [
    selectedColour,
    setSelectedColour,
  ] = useState<Colour>(colours[0]);

  const [
    selectedAreaCode,
    setSelectedAreaCode,
  ] = useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState("");

  const [address, setAddress] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [
    discountCode,
    setDiscountCode,
  ] = useState("");

  const [
    appliedDiscount,
    setAppliedDiscount,
  ] = useState<AppliedDiscount | null>(
    null
  );

  const [
    discountMessage,
    setDiscountMessage,
  ] = useState("");

  const [
    discountMessageType,
    setDiscountMessageType,
  ] =
    useState<DiscountMessageType>(
      "neutral"
    );

  const [
    checkingDiscount,
    setCheckingDiscount,
  ] = useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [orderError, setOrderError] =
    useState("");

  const selectedArea =
    deliveryAreas.find(
      (area) =>
        area.code === selectedAreaCode
    );

  const deliveryFee =
    selectedArea?.fee ?? 0;

  const originalProductsTotal =
    PRODUCT_PRICE * quantity;

  const productDiscount =
    useMemo(() => {
      if (!appliedDiscount) {
        return 0;
      }

      if (
        appliedDiscount.type ===
        "fixed_amount"
      ) {
        return Math.min(
          Math.round(
            appliedDiscount.value
          ),
          originalProductsTotal
        );
      }

      if (
        appliedDiscount.type ===
        "percentage"
      ) {
        return Math.min(
          Math.round(
            originalProductsTotal *
              (appliedDiscount.value /
                100)
          ),
          originalProductsTotal
        );
      }

      return 0;
    }, [
      appliedDiscount,
      originalProductsTotal,
    ]);

  const deliveryDiscount =
    appliedDiscount?.type ===
    "free_delivery"
      ? deliveryFee
      : 0;

  const finalProductsTotal = Math.max(
    originalProductsTotal -
      productDiscount,
    0
  );

  const finalDeliveryFee = Math.max(
    deliveryFee - deliveryDiscount,
    0
  );

  const totalDiscount =
    productDiscount + deliveryDiscount;

  const originalTotal =
    originalProductsTotal + deliveryFee;

  const finalTotal = Math.max(
    finalProductsTotal +
      finalDeliveryFee,
    0
  );

  const hasAppliedDiscount =
    appliedDiscount !== null;

  useEffect(() => {
    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    const colourFromUrl = findColour(
      searchParams.get("colour")
    );

    const quantityFromUrl =
      parseQuantity(
        searchParams.get("quantity")
      );

    if (colourFromUrl) {
      setSelectedColour(
        colourFromUrl
      );
    }

    if (quantityFromUrl) {
      setQuantity(quantityFromUrl);
    }

    if (
      !colourFromUrl ||
      !quantityFromUrl
    ) {
      const cartItem =
        readFirstCartItem();

      if (!cartItem) {
        return;
      }

      if (!colourFromUrl) {
        const cartColour =
          findColour(
            cartItem.colour
          );

        if (cartColour) {
          setSelectedColour(
            cartColour
          );
        }
      }

      if (!quantityFromUrl) {
        const cartQuantity =
          parseQuantity(
            String(
              cartItem.quantity
            )
          );

        if (cartQuantity) {
          setQuantity(
            cartQuantity
          );
        }
      }
    }
  }, []);

  useEffect(() => {
    setAppliedDiscount(null);
    setDiscountMessage("");
    setDiscountCode("");
    setDiscountMessageType(
      "neutral"
    );
  }, [selectedAreaCode]);

  async function applyDiscountCode() {
    const cleanCode = discountCode
      .trim()
      .toUpperCase();

    if (!selectedArea) {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Please select your delivery area first."
      );

      setDiscountMessageType(
        "error"
      );

      return;
    }

    if (!cleanCode) {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Please enter a discount code."
      );

      setDiscountMessageType(
        "error"
      );

      return;
    }

    setCheckingDiscount(true);
    setDiscountMessage("");
    setDiscountMessageType(
      "neutral"
    );

    try {
      const response = await fetch(
        "/api/discounts/validate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code: cleanCode,

            productName:
              PRODUCT_NAME,

            productSlug:
              PRODUCT_SLUG,

            quantity,

            productPrice:
              PRODUCT_PRICE,

            productsTotal:
              originalProductsTotal,

            originalProductsTotal,

            deliveryFee,

            orderTotal:
              originalTotal,

            originalTotal,
          }),
        }
      );

      const result =
        (await response.json()) as DiscountApiResult;

      if (
        !response.ok ||
        !result.success
      ) {
        setAppliedDiscount(null);

        setDiscountMessage(
          result.message ||
            "Invalid discount code."
        );

        setDiscountMessageType(
          "error"
        );

        return;
      }

      const parsedDiscount =
        createAppliedDiscount(
          result,
          cleanCode,
          originalProductsTotal,
          deliveryFee
        );

      if (!parsedDiscount) {
        setAppliedDiscount(null);

        setDiscountMessage(
          "The discount code was found, but its discount settings are not valid."
        );

        setDiscountMessageType(
          "error"
        );

        return;
      }

      setAppliedDiscount(
        parsedDiscount
      );

      setDiscountCode(
        parsedDiscount.code
      );

      setDiscountMessageType(
        "success"
      );

      if (
        parsedDiscount.type ===
        "free_delivery"
      ) {
        setDiscountMessage(
          "Free delivery applied successfully."
        );

        return;
      }

      if (
        parsedDiscount.type ===
        "percentage"
      ) {
        setDiscountMessage(
          `${parsedDiscount.value}% discount applied successfully.`
        );

        return;
      }

      setDiscountMessage(
        `${parsedDiscount.value.toLocaleString(
          "en-GB"
        )} EGP discount applied successfully.`
      );
    } catch {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Could not check the discount code."
      );

      setDiscountMessageType(
        "error"
      );
    } finally {
      setCheckingDiscount(false);
    }
  }

  function removeDiscountCode() {
    setAppliedDiscount(null);
    setDiscountCode("");

    setDiscountMessage(
      "Discount code removed."
    );

    setDiscountMessageType(
      "neutral"
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

    const normalisedEmail =
      customerEmail
        .trim()
        .toLowerCase();

    if (
      normalisedEmail &&
      !isValidEmail(normalisedEmail)
    ) {
      setOrderError(
        "Please enter a valid email address or leave it empty."
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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName:
              fullName.trim(),

            phone: phone.trim(),

            customerEmail:
              normalisedEmail ||
              null,

            governorate:
              selectedArea.name,

            governorateCode:
              selectedArea.code,

            address:
              address.trim(),

            notes: notes.trim(),

            productName:
              PRODUCT_NAME,

            productSlug:
              PRODUCT_SLUG,

            colour:
              selectedColour.name,

            quantity,

            productPrice:
              PRODUCT_PRICE,

            /*
              مهم جدًا:

              productsTotal يتم إرساله
              بعد الخصم، علشان الأدمن
              والبوليصة يعرضوا المبلغ
              الصحيح المطلوب لـ ORVIX.
            */
            productsTotal:
              finalProductsTotal,

            /*
              السعر الأصلي محفوظ لو احتجته
              في الأدمن أو التقارير.
            */
            originalProductsTotal,

            discountedProductsTotal:
              finalProductsTotal,

            deliveryFee:
              finalDeliveryFee,

            originalDeliveryFee:
              deliveryFee,

            discountCode:
              appliedDiscount?.code ||
              null,

            discountType:
              appliedDiscount?.type ||
              null,

            discountValue:
              appliedDiscount?.value ||
              0,

            productDiscount,

            deliveryDiscount,

            totalDiscount,

            originalTotalPrice:
              originalTotal,

            totalPrice:
              finalTotal,

            finalTotal,

            paymentMethod:
              "instapay_on_delivery",
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
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

      if (normalisedEmail) {
        sessionStorage.setItem(
          "orvixLastOrderEmail",
          normalisedEmail
        );
      } else {
        sessionStorage.removeItem(
          "orvixLastOrderEmail"
        );
      }

      window.localStorage.removeItem(
        CART_STORAGE_KEY
      );

      window.dispatchEvent(
        new Event(
          "orvix-cart-updated"
        )
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
              Review your product, enter
              your delivery information and
              pay using InstaPay when your
              order arrives.
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
                      key={
                        selectedColour.name
                      }
                      src={
                        selectedColour.image
                      }
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
                      {
                        selectedColour.name
                      }{" "}
                      · Quantity {quantity}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Choose your colour
                </h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {colours.map(
                    (colour) => {
                      const selected =
                        selectedColour.name ===
                        colour.name;

                      return (
                        <button
                          key={
                            colour.name
                          }
                          type="button"
                          onClick={() =>
                            setSelectedColour(
                              colour
                            )
                          }
                          disabled={
                            isSending
                          }
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
                            } ${
                              colour.buttonStyle
                            }`}
                          />

                          {colour.name}
                        </button>
                      );
                    }
                  )}
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
                      setQuantity(
                        (current) =>
                          Math.max(
                            1,
                            current - 1
                          )
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
                      setQuantity(
                        (current) =>
                          Math.min(
                            10,
                            current + 1
                          )
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
                          event.target
                            .value
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
                        setPhone(
                          event.target
                            .value
                        )
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
                      Email address —
                      optional
                    </span>

                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) =>
                        setCustomerEmail(
                          event.target
                            .value
                        )
                      }
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={isSending}
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      If you enter an
                      email, your order and
                      tracking details can
                      be sent to it.
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
                      Governorate /
                      delivery area
                    </span>

                    <select
                      value={
                        selectedAreaCode
                      }
                      onChange={(event) =>
                        setSelectedAreaCode(
                          event.target
                            .value
                        )
                      }
                      disabled={isSending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black px-5 py-4 text-white outline-none focus:border-white disabled:opacity-50"
                    >
                      <option value="">
                        Select your
                        delivery area
                      </option>

                      {deliveryAreas.map(
                        (area) => (
                          <option
                            key={
                              area.code
                            }
                            value={
                              area.code
                            }
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
                          event.target
                            .value
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
                      Order notes —
                      optional
                    </span>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target
                            .value
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
                <SummaryRow
                  title="Product"
                  value={PRODUCT_NAME}
                />

                <SummaryRow
                  title="Colour"
                  value={
                    selectedColour.name
                  }
                />

                <SummaryRow
                  title="Quantity"
                  value={String(quantity)}
                />

                <SummaryRow
                  title="Products total"
                  value={`${originalProductsTotal.toLocaleString(
                    "en-GB"
                  )} EGP`}
                />

                {productDiscount >
                  0 && (
                  <SummaryRow
                    title="Product discount"
                    value={`-${productDiscount.toLocaleString(
                      "en-GB"
                    )} EGP`}
                    green
                  />
                )}

                {productDiscount >
                  0 && (
                  <SummaryRow
                    title="Products after discount"
                    value={`${finalProductsTotal.toLocaleString(
                      "en-GB"
                    )} EGP`}
                    green
                  />
                )}

                <SummaryRow
                  title="Delivery"
                  value={
                    !selectedArea
                      ? "Select area"
                      : finalDeliveryFee ===
                          0
                        ? "FREE"
                        : `${finalDeliveryFee.toLocaleString(
                            "en-GB"
                          )} EGP`
                  }
                />

                {deliveryDiscount >
                  0 && (
                  <SummaryRow
                    title="Delivery discount"
                    value={`-${deliveryDiscount.toLocaleString(
                      "en-GB"
                    )} EGP`}
                    green
                  />
                )}

                {appliedDiscount && (
                  <SummaryRow
                    title="Discount code"
                    value={
                      appliedDiscount.code
                    }
                    green
                  />
                )}
              </div>

              <div className="mt-8 border-t border-white/10 pt-8">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                  Discount code
                </p>

                <div className="mt-4 flex gap-3">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(event) => {
                      const newCode =
                        event.target.value.toUpperCase();

                      setDiscountCode(
                        newCode
                      );

                      if (
                        appliedDiscount &&
                        newCode !==
                          appliedDiscount.code
                      ) {
                        setAppliedDiscount(
                          null
                        );
                      }

                      setDiscountMessage(
                        ""
                      );

                      setDiscountMessageType(
                        "neutral"
                      );
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
                      hasAppliedDiscount
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
                      : hasAppliedDiscount
                        ? "Remove"
                        : "Apply"}
                  </button>
                </div>

                {!selectedArea && (
                  <p className="mt-3 text-sm text-gray-500">
                    Select your delivery
                    area before applying a
                    code.
                  </p>
                )}

                {discountMessage && (
                  <p
                    className={`mt-3 text-sm ${
                      discountMessageType ===
                      "success"
                        ? "text-green-400"
                        : discountMessageType ===
                            "error"
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {discountMessage}
                  </p>
                )}
              </div>

              <div className="my-8 h-px bg-white/10" />

              {totalDiscount > 0 && (
                <div className="mb-5 flex justify-between gap-5 text-green-400">
                  <span className="font-bold">
                    Total saved
                  </span>

                  <strong>
                    -
                    {totalDiscount.toLocaleString(
                      "en-GB"
                    )}{" "}
                    EGP
                  </strong>
                </div>
              )}

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

              {totalDiscount > 0 && (
                <p className="mt-2 text-right text-sm text-gray-500 line-through">
                  {originalTotal.toLocaleString(
                    "en-GB"
                  )}{" "}
                  EGP
                </p>
              )}

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
                      Pay the products
                      total through
                      InstaPay to ORVIX
                      when your order
                      arrives. The courier
                      collects the delivery
                      fee only.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        InstaPay to ORVIX
                      </span>

                      <strong>
                        {finalProductsTotal.toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </strong>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">
                        Courier collection
                      </span>

                      <strong>
                        {finalDeliveryFee.toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </strong>
                    </div>
                  </div>
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
                By placing your order, you
                confirm that the provided
                information is correct.
              </p>

              {isSending && (
                <p className="mt-4 text-center text-sm text-gray-500">
                  Please do not close or
                  refresh this page.
                </p>
              )}
            </aside>
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
}

function SummaryRow({
  title,
  value,
  green = false,
}: {
  title: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-5 ${
        green ? "text-green-400" : ""
      }`}
    >
      <span
        className={
          green
            ? "text-green-400"
            : "text-gray-400"
        }
      >
        {title}
      </span>

      <strong className="text-right">
        {value}
      </strong>
    </div>
  );
}