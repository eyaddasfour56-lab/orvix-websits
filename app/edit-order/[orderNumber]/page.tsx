"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

type Order = {
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  status: string;
  productSlug: string;
  colour: string;
  variantKey: string;
};

type Variant = {
  id: string;
  variantKey: string;
  label: string;
  stockQuantity: number;
  allowPurchase: boolean;
};

export default function EditOrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(String(params?.orderNumber || "")).toUpperCase();
  const { language, isArabic } = useLanguage();
  const ar = language === "ar";
  const [verificationPhone, setVerificationPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canEditColour, setCanEditColour] = useState(false);
  const [reason, setReason] = useState("");
  const [editableUntil, setEditableUntil] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantKey, setVariantKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("orvixLastOrderPhone") || "";
    setVerificationPhone(saved);
  }, []);

  async function loadVariants(productSlug: string, currentVariantKey: string) {
    if (!productSlug) {
      setVariants([]);
      return;
    }
    try {
      const response = await fetch(`/api/products?slug=${encodeURIComponent(productSlug)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success || !result.product) return;
      const available = (Array.isArray(result.product.variants) ? result.product.variants : []).filter((item: Variant) => item.allowPurchase);
      setVariants(available);
      if (currentVariantKey) setVariantKey(currentVariantKey);
      else if (available[0]?.variantKey) setVariantKey(available[0].variantKey);
    } catch {
      setVariants([]);
    }
  }

  async function lookup(event?: FormEvent) {
    event?.preventDefault();
    if (!verificationPhone.trim() || loading) return;
    setLoading(true);
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/edit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", orderNumber, phone: verificationPhone.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not open this order.");
      const nextOrder = result.order as Order;
      setOrder(nextOrder);
      setCanEdit(Boolean(result.canEdit));
      setCanEditColour(Boolean(result.canEditColour));
      setReason(String(result.reason || ""));
      setEditableUntil(result.editableUntil || null);
      setName(String(nextOrder.customerName || ""));
      setPhone(String(nextOrder.phone || ""));
      setAddress(String(nextOrder.address || ""));
      setNotes(String(nextOrder.notes || ""));
      setVariantKey(String(nextOrder.variantKey || ""));
      if (result.canEditColour) await loadVariants(String(nextOrder.productSlug || ""), String(nextOrder.variantKey || ""));
      else setVariants([]);
    } catch (error) {
      setOrder(null);
      setMessage(error instanceof Error ? error.message : "Could not open this order.");
    } finally {
      setLoading(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!order || !canEdit || loading) return;
    setLoading(true);
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/edit-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          orderNumber,
          phone: verificationPhone.trim(),
          customerName: name,
          newPhone: phone,
          address,
          notes,
          newVariantKey: canEditColour ? variantKey : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save changes.");
      setSuccess(true);
      setMessage(ar ? "تم تحديث بيانات الطلب بنجاح." : "Order details updated successfully.");
      setVerificationPhone(String(result.phone || phone));
      setOrder((current) => current ? { ...current, phone: String(result.phone || phone), colour: String(result.colour || current.colour), variantKey: String(result.variantKey || current.variantKey) } : current);
      window.sessionStorage.setItem("orvixLastOrderPhone", String(result.phone || phone));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save changes.");
    } finally {
      setLoading(false);
    }
  }

  const deadline = editableUntil ? new Date(editableUntil).toLocaleString(ar ? "ar-EG" : "en-GB", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <main lang={language} dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#070707] text-white">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/30">ORVIX ORDER CARE</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em]">{ar ? "عدّل بيانات طلبك" : "Edit your order"}</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-white/40">{ar ? "يمكن تعديل بيانات التواصل والعنوان خلال أول 30 دقيقة. ويمكن تغيير اللون قبل تأكيد الطلب." : "Contact and delivery details can be changed during the first 30 minutes. Colour can also be changed before the order is confirmed."}</p>

        <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-white/35">{ar ? "رقم الطلب" : "Order number"}</p><p className="mt-1 text-xl font-black">{orderNumber}</p></div><Link href={`/track-order?orderNumber=${encodeURIComponent(orderNumber)}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/55">{ar ? "تتبع" : "Track"}</Link></div>

          {!order ? (
            <form onSubmit={lookup} className="mt-6">
              <label className="text-xs font-bold text-white/45">{ar ? "رقم الهاتف الموجود في الطلب" : "Phone number on the order"}</label>
              <input value={verificationPhone} onChange={(event) => setVerificationPhone(event.target.value)} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 outline-none focus:border-white/30" />
              <button disabled={loading || !verificationPhone.trim()} className="mt-3 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black disabled:opacity-40">{loading ? (ar ? "جاري التحقق…" : "Checking…") : (ar ? "فتح الطلب" : "Open order")}</button>
            </form>
          ) : canEdit ? (
            <form onSubmit={save} className="mt-6 space-y-4">
              {deadline && <p className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.06] p-3 text-xs font-bold text-emerald-100">{ar ? `التعديل متاح حتى ${deadline}` : `Editing available until ${deadline}`}</p>}
              {order.colour && <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/28">{ar ? "اللون الحالي" : "Current colour"}</p><p className="mt-1 font-black">{order.colour}</p></div>}
              {canEditColour && variants.length > 0 ? <label className="block"><span className="text-xs font-bold text-white/45">{ar ? "تغيير اللون" : "Change colour"}</span><select value={variantKey} onChange={(event) => setVariantKey(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#111] px-4 py-4 outline-none focus:border-white/30">{variants.map((variant) => <option key={variant.id} value={variant.variantKey}>{variant.label}</option>)}</select><p className="mt-2 text-[10px] font-semibold text-white/28">{ar ? "تغيير اللون يتوقف بمجرد تأكيد الطلب." : "Colour changes lock once the order is confirmed."}</p></label> : null}
              <label className="block"><span className="text-xs font-bold text-white/45">{ar ? "الاسم" : "Full name"}</span><input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 outline-none focus:border-white/30" /></label>
              <label className="block"><span className="text-xs font-bold text-white/45">{ar ? "رقم الهاتف الجديد" : "Phone number"}</span><input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-4 outline-none focus:border-white/30" /></label>
              <label className="block"><span className="text-xs font-bold text-white/45">{ar ? "عنوان التوصيل" : "Delivery address"}</span><textarea rows={4} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-4 outline-none focus:border-white/30" /></label>
              <label className="block"><span className="text-xs font-bold text-white/45">{ar ? "ملاحظات" : "Order notes"}</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/35 px-4 py-4 outline-none focus:border-white/30" /></label>
              <button disabled={loading} className="w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-black disabled:opacity-40">{loading ? (ar ? "جاري الحفظ…" : "Saving…") : (ar ? "حفظ التعديلات" : "Save changes")}</button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] p-5"><p className="font-black text-amber-100">{ar ? "التعديل غير متاح الآن" : "Editing is no longer available"}</p><p className="mt-2 text-sm leading-6 text-white/45">{reason}</p><Link href="/track-order" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black">{ar ? "الرجوع للتتبع" : "Back to tracking"}</Link></div>
          )}

          {message && <p className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${success ? "border-emerald-300/20 bg-emerald-500/[0.07] text-emerald-100" : "border-red-300/20 bg-red-500/[0.07] text-red-100"}`}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
