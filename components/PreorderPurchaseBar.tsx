"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { trackCommerceEvent } from "@/lib/commerce-analytics";

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
  image: string;
  status: string;
  allowPurchase: boolean;
  maxOrderQuantity?: number;
  preorderMinDays?: number;
  preorderMaxDays?: number;
  variants?: Variant[];
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  colour: string;
  variantKey?: string | null;
  quantity: number;
};

const CART_KEY = "orvixCart";

function readCart() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export default function PreorderPurchaseBar() {
  const pathname = usePathname();
  const { language, isArabic } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [variantKey, setVariantKey] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const slug = useMemo(() => {
    const match = pathname.match(/^\/products\/([^/?#]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [pathname]);

  useEffect(() => {
    if (!slug) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success || !result.product) return;
        if (cancelled) return;
        const next = result.product as Product;
        if (next.status !== "preorder" || !next.allowPurchase) {
          setProduct(null);
          return;
        }
        setProduct(next);
        const firstVariant = next.variants?.find((variant) => variant.allowPurchase);
        setVariantKey(firstVariant?.variantKey || "");
        setQuantity(1);
        setAdded(false);
        void trackCommerceEvent("product_view", { productSlug: next.slug, metadata: { mode: "preorder" } });
      } catch {
        if (!cancelled) setProduct(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!product) return null;

  const variant = product.variants?.find((candidate) => candidate.variantKey === variantKey) || null;
  const maxQuantity = Math.max(1, Math.min(Number(product.maxOrderQuantity || 10), 10));
  const minDays = Number(product.preorderMinDays || 25);
  const maxDays = Number(product.preorderMaxDays || 45);

  function addToCart() {
    const cart = readCart();
    const colour = variant?.label || "Standard";
    const keyMatches = (item: CartItem) =>
      item.slug === product.slug &&
      String(item.variantKey || "") === String(variant?.variantKey || "") &&
      String(item.colour || "Standard").toLowerCase() === colour.toLowerCase();
    const index = cart.findIndex(keyMatches);
    if (index >= 0) {
      cart[index] = { ...cart[index], quantity: Math.min(maxQuantity, Number(cart[index].quantity || 1) + quantity) };
    } else {
      cart.push({
        id: `${product.id}:${variant?.variantKey || "standard"}`,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.image || "/black.png",
        colour,
        variantKey: variant?.variantKey || null,
        quantity,
      });
    }
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("orvix-cart-updated"));
    setAdded(true);
    void trackCommerceEvent("add_to_cart", {
      productSlug: product.slug,
      metadata: { quantity, variant: variant?.variantKey || null, preorder: true },
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-violet-300/15 bg-[#0b0b0d]/96 px-3 py-3 shadow-[0_-18px_50px_rgba(0,0,0,.45)] backdrop-blur-xl print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="hidden h-14 w-14 shrink-0 rounded-xl bg-white p-1.5 sm:block"><Image src={product.image || "/black.png"} alt="" width={100} height={100} unoptimized className="h-full w-full object-contain" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-400/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">{isArabic ? "طلب مسبق" : "PRE-ORDER"}</span><p className="truncate text-sm font-black text-white">{product.name}</p></div>
          <p className="mt-1 text-[10px] font-semibold text-white/38">{isArabic ? `التوصيل المتوقع ${minDays}–${maxDays} يوم` : `Estimated delivery ${minDays}–${maxDays} days`}</p>
        </div>
        {product.variants?.length ? <select aria-label="Product option" value={variantKey} onChange={(event) => setVariantKey(event.target.value)} className="hidden rounded-xl border border-white/10 bg-[#141417] px-3 py-2 text-xs font-bold text-white sm:block">{product.variants.filter((item) => item.allowPurchase).map((item) => <option key={item.id} value={item.variantKey}>{item.label}</option>)}</select> : null}
        <div className="hidden items-center rounded-xl border border-white/10 p-1 sm:flex"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-8 w-8 place-items-center">−</button><span className="min-w-7 text-center text-xs font-black">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="grid h-8 w-8 place-items-center">+</button></div>
        <button type="button" onClick={addToCart} className="shrink-0 rounded-full bg-white px-4 py-3 text-xs font-black text-black sm:px-6">{added ? (isArabic ? "تمت الإضافة ✓" : "Added ✓") : (isArabic ? "أضف الطلب المسبق" : "Add pre-order")}</button>
      </div>
    </div>
  );
}
