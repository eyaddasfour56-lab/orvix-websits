"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Navbar from "@/components/Navbar";
import {
  getDeliveryAreaForBostaCity,
} from "@/lib/shipping-pricing";

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

  discountType?: string;
  discount_type?: string;
  type?: string;

  discountValue?: number | string;
  discount_value?: number | string;
  value?: number | string;
  amount?: number | string;
  percentage?: number | string;

  discount?: {
    code?: string;

    type?: string;
    discountType?: string;
    discount_type?: string;

    value?: number | string;
    discountValue?: number | string;
    discount_value?: number | string;
    amount?: number | string;
    percentage?: number | string;
  };
};

type DiscountMessageType =
  | "success"
  | "error"
  | "neutral";

type BostaCity = {
  id: string;
  name: string;
  nameAr: string | null;
  sector: number | null;
};

type BostaDistrict = {
  id: string;
  name: string;
  nameAr: string | null;
  zoneId: string | null;
  zoneName: string | null;
  dropOffAvailability: boolean;
};

type BostaLocationsResult = {
  success?: boolean;
  message?: string;
  cities?: BostaCity[];
  districts?: BostaDistrict[];
};

type LocationSearchOption = {
  id: string;
  name: string;
  secondaryName?: string | null;
  searchTerms?: string[];
};

type SearchableLocationPickerProps = {
  value: string;
  options: LocationSearchOption[];
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  loadingMessage: string;
  disabled?: boolean;
  loading?: boolean;
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function normaliseLocationSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .trim();
}

function getLocationOptionLabel(
  option: LocationSearchOption
) {
  return option.secondaryName
    ? `${option.name} — ${option.secondaryName}`
    : option.name;
}

function SearchableLocationPicker({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loadingMessage,
  disabled = false,
  loading = false,
}: SearchableLocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedOption = options.find(
    (option) => option.id === value
  );

  const filteredOptions = useMemo(() => {
    const normalisedQuery =
      normaliseLocationSearch(query);

    if (!normalisedQuery) {
      return options;
    }

    const queryParts = normalisedQuery.split(" ");

    return options.filter((option) => {
      const searchText = normaliseLocationSearch(
        [
          option.name,
          option.secondaryName,
          ...(option.searchTerms ?? []),
        ]
          .filter(Boolean)
          .join(" ")
      );

      return queryParts.every((part) =>
        searchText.includes(part)
      );
    });
  }, [options, query]);

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(filteredOptions.length - 1, 0)
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsidePress(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener(
      "pointerdown",
      closeOnOutsidePress
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePress
      );
    };
  }, [isOpen]);

  function openPicker() {
    if (disabled || loading) {
      return;
    }

    setQuery("");
    setActiveIndex(0);
    setIsOpen(true);
  }

  function selectOption(option: LocationSearchOption) {
    onChange(option.id);
    setQuery("");
    setIsOpen(false);
  }

  function handleSearchKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      filteredOptions.length === 0 &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter")
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        Math.min(
          currentIndex + 1,
          filteredOptions.length - 1
        )
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        Math.max(currentIndex - 1, 0)
      );
      return;
    }

    if (
      event.key === "Enter" &&
      filteredOptions[safeActiveIndex]
    ) {
      event.preventDefault();
      selectOption(
        filteredOptions[safeActiveIndex]
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget
          )
        ) {
          setIsOpen(false);
          setQuery("");
        }
      }}
    >
      <button
        type="button"
        onClick={() =>
          isOpen
            ? setIsOpen(false)
            : openPicker()
        }
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/15 bg-black px-5 py-4 text-left text-white outline-none transition hover:border-white/30 focus:border-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={
            selectedOption
              ? "min-w-0 truncate"
              : "min-w-0 truncate text-gray-500"
          }
        >
          {loading
            ? loadingMessage
            : selectedOption
              ? getLocationOptionLabel(
                  selectedOption
                )
              : placeholder}
        </span>

        <span
          aria-hidden="true"
          className={`shrink-0 text-sm text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl shadow-black/60">
          <div className="border-b border-white/10 p-3">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={
                filteredOptions[safeActiveIndex]
                  ? `${listboxId}-${filteredOptions[safeActiveIndex].id}`
                  : undefined
              }
              autoComplete="off"
              autoFocus
              className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white"
            />
          </div>

          <div
            id={listboxId}
            role="listbox"
            className="max-h-72 overflow-y-auto p-2"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map(
                (option, optionIndex) => {
                  const isSelected =
                    option.id === value;
                  const isActive =
                    optionIndex ===
                    safeActiveIndex;

                  return (
                    <button
                      key={option.id}
                      id={`${listboxId}-${option.id}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() =>
                        setActiveIndex(
                          optionIndex
                        )
                      }
                      onClick={() =>
                        selectOption(option)
                      }
                      className={`flex w-full items-start justify-between gap-3 rounded-xl px-4 py-3 text-left transition ${
                        isActive
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-white">
                          {option.name}
                        </span>

                        {option.secondaryName && (
                          <span
                            dir="auto"
                            className="mt-0.5 block text-sm text-gray-400"
                          >
                            {option.secondaryName}
                          </span>
                        )}
                      </span>

                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-emerald-400"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                }
              )
            ) : (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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

  if (
    cleanType === "free_delivery" ||
    cleanType === "free_shipping" ||
    cleanType === "delivery" ||
    cleanType === "shipping"
  ) {
    return "free_delivery";
  }

  if (
    cleanType === "fixed_amount" ||
    cleanType === "fixed" ||
    cleanType === "amount" ||
    cleanType === "cash" ||
    cleanType === "money"
  ) {
    return "fixed_amount";
  }

  if (
    cleanType === "percentage" ||
    cleanType === "percent" ||
    cleanType === "percentage_off"
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
    result.discount?.discountValue ??
    result.discount?.discount_value ??
    result.discount?.value ??
    result.discount?.amount ??
    result.discount?.percentage ??
    0;

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.max(parsedValue, 0);
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

export default function CheckoutPage() {
  const router = useRouter();

  const [selectedColour, setSelectedColour] =
    useState<Colour>(colours[0]);

  const [selectedCityId, setSelectedCityId] =
    useState("");

  const [
    selectedDistrictId,
    setSelectedDistrictId,
  ] = useState("");

  const [cities, setCities] = useState<
    BostaCity[]
  >([]);

  const [districts, setDistricts] =
    useState<BostaDistrict[]>([]);

  const [locationsLoading, setLocationsLoading] =
    useState(true);

  const [districtsLoading, setDistrictsLoading] =
    useState(false);

  const [locationsError, setLocationsError] =
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
    appliedDiscount,
    setAppliedDiscount,
  ] = useState<AppliedDiscount | null>(null);

  const [discountMessage, setDiscountMessage] =
    useState("");

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

  const selectedCity = cities.find(
    (city) => city.id === selectedCityId
  );

  const selectedDistrict = districts.find(
    (district) =>
      district.id === selectedDistrictId
  );

  const cityOptions = useMemo(
    () =>
      cities.map((city) => ({
        id: city.id,
        name: city.name,
        secondaryName: city.nameAr,
      })),
    [cities]
  );

  const districtOptions = useMemo(
    () =>
      districts.map((district) => ({
        id: district.id,
        name: district.name,
        secondaryName: district.nameAr,
        searchTerms: [
          district.zoneName ?? "",
        ],
      })),
    [districts]
  );

  const selectedArea = selectedCity
    ? getDeliveryAreaForBostaCity(
        selectedCity
      )
    : null;

  const deliveryFee = selectedArea?.fee ?? 0;

  const productsTotal =
    PRODUCT_PRICE * quantity;

  const hasAppliedDiscount =
    appliedDiscount !== null;

  let productDiscount = 0;
  let deliveryDiscount = 0;

  if (
    appliedDiscount?.type === "free_delivery"
  ) {
    deliveryDiscount = deliveryFee;
  }

  if (
    appliedDiscount?.type === "fixed_amount"
  ) {
    productDiscount = Math.min(
      Math.round(appliedDiscount.value),
      productsTotal
    );
  }

  if (
    appliedDiscount?.type === "percentage"
  ) {
    productDiscount = Math.min(
      Math.round(
        productsTotal *
          (appliedDiscount.value / 100)
      ),
      productsTotal
    );
  }

  const finalProductsTotal = Math.max(
    productsTotal - productDiscount,
    0
  );

  const finalDeliveryFee = Math.max(
    deliveryFee - deliveryDiscount,
    0
  );

  const totalDiscount =
    productDiscount + deliveryDiscount;

  const finalTotal = Math.max(
    finalProductsTotal + finalDeliveryFee,
    0
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
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
            const cartColour = findColour(
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
              setQuantity(cartQuantity);
            }
          }
        }
      },
      0
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      setLocationsLoading(true);
      setLocationsError("");

      try {
        const response = await fetch(
          "/api/bosta/locations",
          {
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as BostaLocationsResult;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Could not load delivery cities."
          );
        }

        if (!cancelled) {
          setCities(
            Array.isArray(result.cities)
              ? result.cities
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLocationsError(
            error instanceof Error
              ? error.message
              : "Could not load delivery cities."
          );
        }
      } finally {
        if (!cancelled) {
          setLocationsLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedCityId) {
      return;
    }

    async function loadDistricts() {
      setDistrictsLoading(true);
      setLocationsError("");

      try {
        const response = await fetch(
          `/api/bosta/locations?cityId=${encodeURIComponent(
            selectedCityId
          )}`,
          {
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as BostaLocationsResult;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Could not load delivery districts."
          );
        }

        if (!cancelled) {
          setDistricts(
            Array.isArray(
              result.districts
            )
              ? result.districts
              : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLocationsError(
            error instanceof Error
              ? error.message
              : "Could not load delivery districts."
          );
        }
      } finally {
        if (!cancelled) {
          setDistrictsLoading(false);
        }
      }
    }

    void loadDistricts();

    return () => {
      cancelled = true;
    };
  }, [selectedCityId]);

  async function applyDiscountCode() {
    const cleanCode = discountCode
      .trim()
      .toUpperCase();

    if (!selectedArea) {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Please select your delivery area first."
      );

      setDiscountMessageType("error");
      return;
    }

    if (!cleanCode) {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Please enter a discount code."
      );

      setDiscountMessageType("error");
      return;
    }

    setCheckingDiscount(true);
    setDiscountMessage("");
    setDiscountMessageType("neutral");

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
            productsTotal,
            deliveryFee,

            orderTotal:
              productsTotal + deliveryFee,
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

        setDiscountMessageType("error");
        return;
      }

      const discountType =
        normaliseDiscountType(result);

      const discountValue =
        getDiscountValue(result);

      const returnedCode =
        getReturnedDiscountCode(
          result,
          cleanCode
        );

      if (!discountType) {
        setAppliedDiscount(null);

        setDiscountMessage(
          "This discount code has an unsupported discount type."
        );

        setDiscountMessageType("error");
        return;
      }

      if (
        discountType === "fixed_amount" &&
        discountValue <= 0
      ) {
        setAppliedDiscount(null);

        setDiscountMessage(
          "This discount code does not have a valid discount amount."
        );

        setDiscountMessageType("error");
        return;
      }

      if (
        discountType === "percentage" &&
        (discountValue <= 0 ||
          discountValue > 100)
      ) {
        setAppliedDiscount(null);

        setDiscountMessage(
          "This discount code does not have a valid percentage."
        );

        setDiscountMessageType("error");
        return;
      }

      setAppliedDiscount({
        code: returnedCode,
        type: discountType,
        value: discountValue,
      });

      setDiscountCode(returnedCode);
      setDiscountMessageType("success");

      if (
        discountType === "free_delivery"
      ) {
        setDiscountMessage(
          "Free delivery applied successfully."
        );

        return;
      }

      if (
        discountType === "percentage"
      ) {
        setDiscountMessage(
          `${discountValue}% discount applied successfully.`
        );

        return;
      }

      setDiscountMessage(
        `${discountValue.toLocaleString(
          "en-GB"
        )} EGP discount applied successfully.`
      );
    } catch {
      setAppliedDiscount(null);

      setDiscountMessage(
        "Could not check the discount code."
      );

      setDiscountMessageType("error");
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

    setDiscountMessageType("neutral");
  }

  async function handleOrderSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSending ||
      checkingDiscount
    ) {
      return;
    }

    setOrderError("");

    if (
      !selectedCity ||
      !selectedArea
    ) {
      setOrderError(
        "Please select your delivery city."
      );

      return;
    }

    if (!selectedDistrict) {
      setOrderError(
        "Please select your delivery district."
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

    const normalisedEmail = customerEmail
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

    /*
      لو العميل كتب كود خصم
      لكنه لم يضغط Apply.
    */
    if (
      discountCode.trim() &&
      !appliedDiscount
    ) {
      setOrderError(
        "Please press Apply to verify your discount code before placing the order."
      );

      return;
    }

    /*
      ناخد كود الخصم المطبق.

      ولو حصلت مشكلة في appliedDiscount،
      ناخده من خانة الخصم نفسها.
    */
    const submittedDiscountCode = String(
      appliedDiscount?.code ||
        discountCode ||
        ""
    )
      .trim()
      .toUpperCase();

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
            fullName: fullName.trim(),
            phone: phone.trim(),

            customerEmail:
              normalisedEmail || null,

            governorate:
              selectedCity.name,

            bostaCityId:
              selectedCity.id,

            bostaCityName:
              selectedCity.name,

            bostaCitySector:
              selectedCity.sector,

            bostaDistrictId:
              selectedDistrict.id,

            bostaDistrictName:
              selectedDistrict.name,

            bostaZoneId:
              selectedDistrict.zoneId,

            bostaZoneName:
              selectedDistrict.zoneName,

            address: address.trim(),
            notes: notes.trim(),

            productName: PRODUCT_NAME,
            productSlug: PRODUCT_SLUG,

            colour: selectedColour.name,
            quantity,

            productPrice: PRODUCT_PRICE,
            productsTotal,

            deliveryFee:
              finalDeliveryFee,

            originalDeliveryFee:
              deliveryFee,

            /*
              إرسال الكود بأكثر من اسم
              لضمان وصوله إلى الـAPI.
            */
            discountCode:
              submittedDiscountCode ||
              null,

            discount_code:
              submittedDiscountCode ||
              null,

            couponCode:
              submittedDiscountCode ||
              null,

            coupon_code:
              submittedDiscountCode ||
              null,

            appliedDiscount:
              submittedDiscountCode
                ? {
                    code:
                      submittedDiscountCode,

                    type:
                      appliedDiscount?.type ||
                      null,

                    value:
                      appliedDiscount?.value ||
                      0,
                  }
                : null,

            discountType:
              appliedDiscount?.type ||
              null,

            discountValue:
              appliedDiscount?.value ||
              0,

            productDiscount,
            deliveryDiscount,
            totalDiscount,

            discountedProductsTotal:
              finalProductsTotal,

            totalPrice: finalTotal,

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
              Review your product, enter your
              delivery information, then pay the
              products total to ORVIX through
              InstaPay when your order arrives.
              The courier collects only the
              delivery fee.
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
                          setSelectedColour(
                            colour
                          )
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
                          } ${
                            colour.buttonStyle
                          }`}
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
                      setQuantity((current) =>
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
                        setPhone(
                          event.target.value
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
                      Email address — optional
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
                      className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      If you enter an email, your
                      order and tracking details
                      can be sent to it.
                    </p>
                  </label>
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7">
                <h2 className="text-2xl font-black">
                  Delivery information
                </h2>

                <div className="mt-6 grid gap-5">
                  <div>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      Governorate / city
                    </span>

                    <SearchableLocationPicker
                      value={selectedCityId}
                      onChange={(cityId) => {
                        setSelectedCityId(
                          cityId
                        );
                        setSelectedDistrictId("");
                        setDistricts([]);
                        setLocationsError("");
                        setAppliedDiscount(null);
                        setDiscountMessage("");
                        setDiscountMessageType(
                          "neutral"
                        );
                        setDiscountCode("");
                      }}
                      options={cityOptions}
                      placeholder="Select your governorate or city"
                      searchPlaceholder="Search governorate or city..."
                      emptyMessage="No matching governorate or city found."
                      loadingMessage="Loading Bosta cities..."
                      disabled={
                        isSending
                      }
                      loading={locationsLoading}
                    />

                    {selectedArea && (
                      <p className="mt-2 text-sm text-gray-500">
                        Delivery fee: {selectedArea.fee}{" "}
                        EGP
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      District / area
                    </span>

                    <SearchableLocationPicker
                      value={selectedDistrictId}
                      onChange={(districtId) =>
                        setSelectedDistrictId(
                          districtId
                        )
                      }
                      options={districtOptions}
                      placeholder={
                        selectedCity
                          ? "Select your district or area"
                          : "Select a governorate first"
                      }
                      searchPlaceholder="Search district or area..."
                      emptyMessage="No matching district or area found."
                      loadingMessage="Loading districts..."
                      disabled={
                        isSending ||
                        !selectedCity
                      }
                      loading={districtsLoading}
                    />

                    <p className="mt-2 text-sm text-gray-500">
                      Search using the English or
                      Arabic place name.
                    </p>
                  </div>

                  {locationsError && (
                    <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {locationsError} Refresh the
                      page to try again.
                    </p>
                  )}

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

                {productDiscount > 0 && (
                  <div className="flex justify-between gap-5 text-green-400">
                    <span>
                      Product discount
                    </span>

                    <strong>
                      -
                      {productDiscount.toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP
                    </strong>
                  </div>
                )}

                <div className="flex justify-between gap-5">
                  <span className="text-gray-400">
                    Delivery
                  </span>

                  <strong>
                    {!selectedArea
                      ? "Select city"
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
                      -
                      {deliveryDiscount.toLocaleString(
                        "en-GB"
                      )}{" "}
                      EGP
                    </strong>
                  </div>
                )}

                {appliedDiscount && (
                  <div className="flex justify-between gap-5">
                    <span className="text-gray-400">
                      Discount code
                    </span>

                    <strong className="text-green-400">
                      {appliedDiscount.code}
                    </strong>
                  </div>
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
                      setDiscountCode(
                        event.target.value.toUpperCase()
                      );

                      setAppliedDiscount(null);
                      setDiscountMessage("");

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
                    Select your delivery city before
                    applying a code.
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

              <div className="mt-7 rounded-3xl border border-violet-500/25 bg-violet-500/10 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black p-1">
                    <Image
                      src={INSTAPAY_LOGO}
                      alt="InstaPay"
                      width={80}
                      height={80}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">
                      How payment works
                    </p>

                    <p className="mt-2 text-lg font-black text-white">
                      Two separate payments on
                      delivery
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-violet-400/20 bg-black/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-violet-200">
                          1. InstaPay to ORVIX
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-400">
                          Products total only — when
                          your order arrives.
                        </p>
                      </div>

                      <strong className="shrink-0 text-lg text-violet-300">
                        {finalProductsTotal.toLocaleString(
                          "en-GB"
                        )}{" "}
                        EGP
                      </strong>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-blue-200">
                          2. Cash to Bosta courier
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-400">
                          Delivery fee only. The
                          courier does not collect
                          the product price.
                        </p>
                      </div>

                      <strong className="shrink-0 text-lg text-blue-300">
                        {selectedArea
                          ? `${finalDeliveryFee.toLocaleString(
                              "en-GB"
                            )} EGP`
                          : "Select city"}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold leading-5 text-gray-400">
                    No advance payment is required.
                    ORVIX&apos;s verified InstaPay
                    details will be provided when
                    your order is confirmed. Never
                    send the products total to the
                    courier.
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
                disabled={
                  isSending ||
                  checkingDiscount ||
                  !selectedCity ||
                  !selectedDistrict
                }
                className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending
                  ? "Placing order..."
                  : checkingDiscount
                    ? "Checking discount..."
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
