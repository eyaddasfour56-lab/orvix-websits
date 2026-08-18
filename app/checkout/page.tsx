"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TrustStrip from "@/components/TrustStrip";
import { useLanguage } from "@/components/LanguageProvider";
import { getDeliveryAreaForBostaCity } from "@/lib/shipping-pricing";
import { getCommerceIdentity, trackCommerceEvent } from "@/lib/commerce-analytics";

type CartItem = {
  id?: string;
  name?: string;
  slug: string;
  price?: number;
  image?: string;
  colour?: string;
  variantKey?: string | null;
  quantity: number;
};

type Variant = {
  id: string;
  variantKey: string;
  label: string;
  stockQuantity: number;
  allowPurchase: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  status: "available" | "preorder" | "coming_soon" | "out_of_stock" | "hidden";
  stockQuantity: number;
  allowPurchase: boolean;
  maxOrderQuantity?: number;
  preorderMinDays?: number;
  preorderMaxDays?: number;
  variants?: Variant[];
};

type CheckoutItem = {
  cart: CartItem;
  product: Product;
  variant: Variant | null;
  quantity: number;
  colour: string;
  variantKey: string | null;
  price: number;
  isPreorder: boolean;
  maxQuantity: number;
};

type City = { id: string; name: string; sector?: number | null };
type District = { id: string; name: string };
type Discount = { code: string; type: "free_delivery" | "fixed_amount" | "percentage"; value: number };
type Step = 1 | 2 | 3 | 4;

const CART_KEY = "orvixCart";
const DRAFT_KEY = "orvixCheckoutDraftV2";
const ACCESS_KEY = "orvixLastOrderAccess";

const copy = {
  en: {
    eyebrow: "ORVIX SECURE CHECKOUT",
    title: "Complete your order",
    subtitle: "One checkout for your full cart. Stock, pricing and discounts are re-verified before confirmation.",
    steps: ["Information", "Delivery", "Payment", "Review"],
    cart: "Your cart",
    empty: "Your cart is empty",
    emptyText: "Add a product before opening checkout.",
    browse: "Browse products",
    preorder: "PRE-ORDER",
    eta: (a: number, b: number) => `Estimated delivery ${a}–${b} days`,
    qty: "Qty",
    contactTitle: "Contact information",
    deliveryTitle: "Delivery details",
    paymentTitle: "Payment",
    reviewTitle: "Review & place order",
    fullName: "Full name",
    phone: "Phone number",
    email: "Email · optional",
    city: "City / Governorate",
    district: "District / Area",
    address: "Full delivery address",
    notes: "Order notes · optional",
    paymentMethod: "InstaPay on delivery",
    paymentText: "Pay the product amount through InstaPay when your order reaches the delivery stage. Delivery handling follows the order details shown here.",
    continue: "Continue",
    back: "Back",
    summary: "Order summary",
    products: "Products",
    delivery: "Delivery",
    discount: "Discount",
    total: "Total",
    code: "Discount code",
    apply: "Apply",
    selectCity: "Select city",
    selectDistrict: "Select district",
    placing: "Placing order…",
    place: "Place order",
    saved: "Your progress is saved on this device for this checkout session.",
  },
  ar: {
    eyebrow: "إتمام الطلب الآمن من ORVIX",
    title: "كمّل طلبك",
    subtitle: "طلب واحد لكل منتجات السلة، مع مراجعة السعر والمخزون والخصم قبل التأكيد.",
    steps: ["البيانات", "التوصيل", "الدفع", "المراجعة"],
    cart: "سلة التسوق",
    empty: "سلة التسوق فارغة",
    emptyText: "أضف منتجًا قبل فتح صفحة إتمام الطلب.",
    browse: "تصفح المنتجات",
    preorder: "طلب مسبق",
    eta: (a: number, b: number) => `التوصيل المتوقع خلال ${a}–${b} يوم`,
    qty: "الكمية",
    contactTitle: "بيانات التواصل",
    deliveryTitle: "بيانات التوصيل",
    paymentTitle: "الدفع",
    reviewTitle: "راجع الطلب وأكده",
    fullName: "الاسم بالكامل",
    phone: "رقم الهاتف",
    email: "البريد الإلكتروني · اختياري",
    city: "المحافظة / المدينة",
    district: "المنطقة",
    address: "عنوان التوصيل بالكامل",
    notes: "ملاحظات الطلب · اختياري",
    paymentMethod: "InstaPay عند التوصيل",
    paymentText: "يتم دفع قيمة المنتج عبر InstaPay عند وصول الطلب لمرحلة التوصيل، وتظهر كل تفاصيل الطلب هنا قبل التأكيد.",
    continue: "متابعة",
    back: "رجوع",
    summary: "ملخص الطلب",
    products: "المنتجات",
    delivery: "التوصيل",
    discount: "الخصم",
    total: "الإجمالي",
    code: "كود الخصم",
    apply: "تطبيق",
    selectCity: "اختر المدينة",
    selectDistrict: "اختر المنطقة",
    placing: "جارٍ تسجيل الطلب…",
    place: "تأكيد الطلب",
    saved: "يتم حفظ تقدمك على هذا الجهاز خلال جلسة إتمام الطلب الحالية.",
  },
} as const;

function money(value: number, ar: boolean) {
  return `${Math.round(value).toLocaleString(ar ? "ar-EG" : "en-GB")} ${ar ? "ج.م" : "EGP"}`;
}

function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        ...item,
        slug: String(item?.slug || "").trim(),
        colour: String(item?.colour || "Standard").trim() || "Standard",
        quantity: Math.max(1, Math.round(Number(item?.quantity || 1))),
      }))
      .filter((item) => item.slug);
  } catch {
    return [];
  }
}

function normaliseDiscount(value: unknown): Discount["type"] | null {
  const type = String(value || "").toLowerCase();
  if (type.includes("free") && type.includes("delivery")) return "free_delivery";
  if (type.includes("percent")) return "percentage";
  if (type.includes("fixed") || type.includes("amount")) return "fixed_amount";
  return null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { language, isArabic } = useLanguage();
  const t = copy[language];
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [discountMessage, setDiscountMessage] = useState("");
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const cart = readCart();
        if (!cart.length) return;

        const uniqueSlugs = Array.from(new Set(cart.map((item) => item.slug)));
        const [productResults, locationResponse] = await Promise.all([
          Promise.all(
            uniqueSlugs.map(async (slug) => {
              const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
              const result = await response.json();
              if (!response.ok || !result.success || !result.product) throw new Error(result.message || "Could not load a cart product.");
              return result.product as Product;
            })
          ),
          fetch("/api/bosta/locations", { cache: "no-store" }),
        ]);

        const locationResult = await locationResponse.json();
        if (!locationResponse.ok || !locationResult.success) throw new Error(locationResult.message || "Could not load delivery locations.");
        if (cancelled) return;

        const productMap = new Map(productResults.map((product) => [product.slug, product]));
        const normalised = cart.map((cartItem) => {
          const product = productMap.get(cartItem.slug);
          if (!product) throw new Error(`Could not load ${cartItem.slug}.`);
          if (!product.allowPurchase || !["available", "preorder"].includes(product.status)) {
            throw new Error(`${product.name} is not currently available for ordering.`);
          }
          const variant = product.variants?.find(
            (candidate) =>
              candidate.variantKey === cartItem.variantKey ||
              candidate.label.toLowerCase() === String(cartItem.colour || "").toLowerCase()
          ) || null;
          if (product.variants?.length && (!variant || !variant.allowPurchase)) {
            throw new Error(`Choose an available option for ${product.name}.`);
          }
          const isPreorder = product.status === "preorder";
          const stockLimit = variant ? variant.stockQuantity : product.stockQuantity;
          const maxQuantity = Math.max(
            1,
            Math.min(Number(product.maxOrderQuantity || 10), isPreorder ? 10 : Math.max(stockLimit, 0))
          );
          if (!isPreorder && maxQuantity < 1) throw new Error(`${product.name} is out of stock.`);
          return {
            cart: cartItem,
            product,
            variant,
            quantity: Math.min(cartItem.quantity, maxQuantity),
            colour: variant?.label || cartItem.colour || "Standard",
            variantKey: variant?.variantKey || cartItem.variantKey || null,
            price: Number(product.price || 0),
            isPreorder,
            maxQuantity,
          } satisfies CheckoutItem;
        });

        setItems(normalised);
        setCities(Array.isArray(locationResult.cities) ? locationResult.cities : []);

        try {
          const saved = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
          if (saved && typeof saved === "object") {
            setName(String(saved.name || ""));
            setPhone(String(saved.phone || ""));
            setEmail(String(saved.email || ""));
            setAddress(String(saved.address || ""));
            setNotes(String(saved.notes || ""));
            setCityId(String(saved.cityId || ""));
            setDistrictId(String(saved.districtId || ""));
            setStep([1, 2, 3, 4].includes(Number(saved.step)) ? (Number(saved.step) as Step) : 1);
          }
        } catch {
          // Ignore a malformed session draft.
        }

        void trackCommerceEvent("checkout_started", {
          metadata: { itemCount: normalised.length, quantity: normalised.reduce((sum, item) => sum + item.quantity, 0) },
        });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load checkout.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/bosta/locations?cityId=${encodeURIComponent(cityId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not load districts.");
        if (!cancelled) setDistricts(Array.isArray(result.districts) ? result.districts : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load districts.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  useEffect(() => {
    if (loading) return;
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ name, phone, email, address, notes, cityId, districtId, step })
    );
  }, [address, cityId, districtId, email, loading, name, notes, phone, step]);

  const city = cities.find((candidate) => candidate.id === cityId) || null;
  const productTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = city ? getDeliveryAreaForBostaCity(city).fee : 0;
  const totals = useMemo(() => {
    let productDiscount = 0;
    let deliveryDiscount = 0;
    if (discount?.type === "free_delivery") deliveryDiscount = deliveryFee;
    if (discount?.type === "fixed_amount") productDiscount = Math.min(discount.value, productTotal);
    if (discount?.type === "percentage") productDiscount = Math.min(Math.round((productTotal * discount.value) / 100), productTotal);
    return {
      productDiscount,
      deliveryDiscount,
      products: productTotal - productDiscount,
      delivery: deliveryFee - deliveryDiscount,
      total: productTotal - productDiscount + deliveryFee - deliveryDiscount,
    };
  }, [deliveryFee, discount, productTotal]);

  function updateQuantity(index: number, next: number) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: Math.max(1, Math.min(item.maxQuantity, next)) } : item
      )
    );
  }

  function removeItem(index: number) {
    setItems((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      window.localStorage.setItem(
        CART_KEY,
        JSON.stringify(next.map((item) => ({ ...item.cart, quantity: item.quantity, colour: item.colour, variantKey: item.variantKey })))
      );
      window.dispatchEvent(new Event("orvix-cart-updated"));
      return next;
    });
    void trackCommerceEvent("remove_from_cart");
  }

  function goTo(next: Step) {
    setError("");
    if (next > step) {
      if (step === 1 && (!name.trim() || !phone.trim())) {
        setError(language === "ar" ? "اكتب الاسم ورقم الهاتف للمتابعة." : "Enter your name and phone number to continue.");
        return;
      }
      if (step === 2 && (!cityId || !districtId || !address.trim())) {
        setError(language === "ar" ? "كمّل بيانات التوصيل للمتابعة." : "Complete your delivery details to continue.");
        return;
      }
    }
    setStep(next);
    void trackCommerceEvent("checkout_step", { metadata: { step: next } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function applyDiscount() {
    const code = discountCode.trim().toUpperCase();
    if (!code || !city) {
      setDiscount(null);
      setDiscountMessage(language === "ar" ? "اختر المدينة واكتب الكود أولًا." : "Select your city and enter a code first.");
      return;
    }
    setCheckingDiscount(true);
    setDiscountMessage("");
    try {
      const response = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, productsTotal: productTotal, deliveryFee, orderTotal: productTotal + deliveryFee }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Invalid discount code.");
      const type = normaliseDiscount(result.discountType || result.discount_type || result.type || result.discount?.type || result.discount?.discount_type);
      const value = Number(result.discountValue || result.discount_value || result.value || result.discount?.value || result.discount?.discount_value || 0);
      if (!type || !Number.isFinite(value)) throw new Error("Could not read discount.");
      setDiscount({ code, type, value });
      setDiscountCode(code);
      setDiscountMessage(language === "ar" ? "تم تطبيق الخصم." : "Discount applied.");
      void trackCommerceEvent("discount_applied", { metadata: { code } });
    } catch (discountError) {
      setDiscount(null);
      setDiscountMessage(discountError instanceof Error ? discountError.message : "Invalid discount code.");
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !items.length || !city || !districtId || !name.trim() || !phone.trim() || !address.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { visitorId, sessionId } = getCommerceIdentity();
      const response = await fetch("/api/order-v4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orvix-visitor": visitorId,
          "x-orvix-session": sessionId,
        },
        body: JSON.stringify({
          fullName: name.trim(),
          phone: phone.trim(),
          customerEmail: email.trim() || null,
          items: items.map((item) => ({
            productSlug: item.product.slug,
            variantKey: item.variantKey,
            colour: item.colour,
            quantity: item.quantity,
          })),
          bostaCityId: city.id,
          bostaDistrictId: districtId,
          address: address.trim(),
          notes: notes.trim(),
          discountCode: discount?.code || null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.orderNumber) throw new Error(result.message || "Could not place your order.");

      window.sessionStorage.setItem(ACCESS_KEY, JSON.stringify({ orderNumber: result.orderNumber, phone: phone.trim() }));
      window.sessionStorage.removeItem(DRAFT_KEY);
      window.localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new Event("orvix-cart-updated"));
      router.push(`/order/${encodeURIComponent(result.orderNumber)}`);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not place your order.";
      setError(message);
      setSubmitting(false);
      void trackCommerceEvent("checkout_error", { metadata: { message } });
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white" /><p className="mt-4 text-sm text-white/35">Loading secure checkout…</p></div>
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main lang={language} dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#070707] text-white">
        <Navbar />
        <section className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 text-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-8 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/25">ORVIX</p>
            <h1 className="mt-4 text-3xl font-black">{t.empty}</h1>
            <p className="mt-3 text-white/40">{error || t.emptyText}</p>
            <Link href="/#products" className="mt-7 inline-flex rounded-full bg-white px-6 py-3.5 font-black text-black">{t.browse}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main lang={language} dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#070707] text-white">
      <Navbar />
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/28">{t.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-5xl">{t.title}</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-white/38">{t.subtitle}</p>

          <ol className="mt-7 grid grid-cols-4 gap-2" aria-label="Checkout progress">
            {t.steps.map((label, index) => {
              const number = (index + 1) as Step;
              const active = step === number;
              const complete = step > number;
              return (
                <li key={label}>
                  <button type="button" onClick={() => number < step && goTo(number)} className={`w-full rounded-2xl border px-2 py-3 text-center text-[10px] font-black sm:text-xs ${active ? "border-white bg-white text-black" : complete ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-white/8 bg-white/[0.025] text-white/28"}`}>
                    <span className="block">{complete ? "✓" : number}</span><span className="mt-1 hidden sm:block">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">{t.cart}</h2><span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-white/40">{items.length} item{items.length === 1 ? "" : "s"}</span></div>
                <div className="mt-4 divide-y divide-white/8">
                  {items.map((item, index) => (
                    <article key={`${item.product.slug}-${item.variantKey || item.colour}-${index}`} className="grid gap-4 py-4 first:pt-1 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                      <div className="rounded-2xl bg-white p-2"><Image src={item.product.image || "/black.png"} alt={item.product.name} width={180} height={180} unoptimized className="aspect-square w-full object-contain" /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{item.product.name}</h3>{item.isPreorder ? <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-1 text-[9px] font-black text-violet-200">{t.preorder}</span> : null}</div>
                        <p className="mt-1 text-xs text-white/35">{item.colour}</p>
                        {item.isPreorder ? <p className="mt-2 text-xs font-semibold text-violet-200/70">{t.eta(Number(item.product.preorderMinDays || 25), Number(item.product.preorderMaxDays || 45))}</p> : null}
                        <p className="mt-2 font-black">{money(item.price * item.quantity, isArabic)}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <div className="flex items-center rounded-full border border-white/10 bg-black/20 p-1"><button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(index, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10">−</button><span className="min-w-8 text-center text-sm font-black">{item.quantity}</span><button type="button" aria-label="Increase quantity" disabled={item.quantity >= item.maxQuantity} onClick={() => updateQuantity(index, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-black disabled:opacity-30">+</button></div>
                        <button type="button" onClick={() => removeItem(index)} className="text-[10px] font-bold text-red-300/70 hover:text-red-200">Remove</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {step === 1 ? (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-xl font-black">{t.contactTitle}</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t.fullName} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30" />
                    <input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t.phone} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30" />
                    <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.email} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30 sm:col-span-2" />
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-xl font-black">{t.deliveryTitle}</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <select required value={cityId} onChange={(event) => { setCityId(event.target.value); setDistrictId(""); setDiscount(null); }} className="rounded-2xl border border-white/10 bg-[#111] px-4 py-4 outline-none"><option value="">{t.selectCity}</option>{cities.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select>
                    <select required disabled={!cityId} value={districtId} onChange={(event) => setDistrictId(event.target.value)} className="rounded-2xl border border-white/10 bg-[#111] px-4 py-4 outline-none disabled:opacity-40"><option value="">{t.selectDistrict}</option>{districts.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select>
                    <textarea required rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t.address} className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30 sm:col-span-2" />
                    <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t.notes} className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 outline-none focus:border-white/30 sm:col-span-2" />
                  </div>
                </section>
              ) : null}

              {step === 3 ? (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-xl font-black">{t.paymentTitle}</h2>
                  <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300 font-black text-black">✓</span><div><p className="font-black text-emerald-100">{t.paymentMethod}</p><p className="mt-2 text-sm font-medium leading-6 text-emerald-100/55">{t.paymentText}</p></div></div></div>
                  <div className="mt-5 flex gap-2"><input value={discountCode} onChange={(event) => { setDiscountCode(event.target.value.toUpperCase()); setDiscount(null); setDiscountMessage(""); }} placeholder={t.code} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 uppercase outline-none" /><button type="button" disabled={checkingDiscount || !city} onClick={() => void applyDiscount()} className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-black disabled:opacity-30">{checkingDiscount ? "…" : t.apply}</button></div>
                  {discountMessage ? <p className={`mt-2 text-xs font-semibold ${discount ? "text-emerald-300" : "text-red-300"}`}>{discountMessage}</p> : null}
                </section>
              ) : null}

              {step === 4 ? (
                <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-xl font-black">{t.reviewTitle}</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-black/25 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">Contact</p><p className="mt-2 font-black">{name}</p><p className="mt-1 text-sm text-white/45">{phone}</p>{email ? <p className="mt-1 text-sm text-white/45">{email}</p> : null}</div><div className="rounded-2xl bg-black/25 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">Delivery</p><p className="mt-2 font-black">{city?.name}</p><p className="mt-1 text-sm leading-5 text-white/45">{districts.find((candidate) => candidate.id === districtId)?.name}<br />{address}</p></div></div>
                </section>
              ) : null}

              {error ? <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm font-semibold text-red-100">{error}</div> : null}

              <div className="flex items-center justify-between gap-3">
                <button type="button" disabled={step === 1} onClick={() => goTo((step - 1) as Step)} className="rounded-full border border-white/12 px-6 py-3.5 text-sm font-black disabled:invisible">{t.back}</button>
                {step < 4 ? <button type="button" onClick={() => goTo((step + 1) as Step)} className="rounded-full bg-white px-7 py-3.5 text-sm font-black text-black">{t.continue}</button> : <button disabled={submitting} className="rounded-full bg-white px-7 py-3.5 text-sm font-black text-black disabled:opacity-40">{submitting ? t.placing : `${t.place} · ${money(totals.total, isArabic)}`}</button>}
              </div>
              <p className="text-center text-[11px] text-white/25">{t.saved}</p>
              <TrustStrip />
            </div>

            <aside className="rounded-[28px] border border-white/10 bg-[#111214] p-5 lg:sticky lg:top-24">
              <h2 className="text-xl font-black">{t.summary}</h2>
              <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-white/38">{t.products}</span><b>{money(productTotal, isArabic)}</b></div><div className="flex justify-between gap-4"><span className="text-white/38">{t.delivery}</span><b>{city ? money(totals.delivery, isArabic) : "—"}</b></div>{discount ? <div className="flex justify-between gap-4 text-emerald-300"><span>{t.discount}</span><b>-{money(totals.productDiscount + totals.deliveryDiscount, isArabic)}</b></div> : null}</div>
              <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5"><span className="font-black">{t.total}</span><b className="text-3xl tracking-tight">{money(totals.total, isArabic)}</b></div>
              {items.some((item) => item.isPreorder) ? <div className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-400/[0.07] p-4"><p className="text-xs font-black text-violet-100">{language === "ar" ? "الطلب يحتوي على منتج طلب مسبق" : "Your order contains a pre-order item"}</p><p className="mt-1 text-[11px] leading-5 text-violet-100/50">{language === "ar" ? "سيظهر موعد التوصيل المتوقع في صفحة الطلب بعد التأكيد." : "The estimated delivery window will appear on your order page after confirmation."}</p></div> : null}
            </aside>
          </form>
        </div>
      </section>
    </main>
  );
}
