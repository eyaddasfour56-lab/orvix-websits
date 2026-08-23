"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CheckoutPhoneVerification from "@/components/CheckoutPhoneVerification";
import { getCustomerSupabaseBrowser } from "@/lib/customer-supabase-browser";
import { getDeliveryAreaForBostaCity } from "@/lib/shipping-pricing";

type Variant={id:string;variantKey:string;label:string;stockQuantity:number;allowPurchase:boolean};
type Product={id:string;name:string;slug:string;price:number;compareAtPrice?:number|null;image:string;status:string;stockQuantity:number;allowPurchase:boolean;maxOrderQuantity?:number;variants?:Variant[]};
type City={id:string;name:string;sector?:number|null};
type District={id:string;name:string};
type Discount={code:string;type:"free_delivery"|"fixed_amount"|"percentage";value:number};
type SavedAddress={id:string;label:string;full_name:string;phone:string;governorate:string;area?:string|null;address:string;is_default?:boolean};

const money=(n:number)=>`${Math.round(n).toLocaleString("en-GB")} EGP`;
const isValidEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const normaliseDiscount=(value:unknown):Discount["type"]|null=>{
  const v=String(value||"").toLowerCase();
  if(v.includes("free")&&v.includes("delivery"))return "free_delivery";
  if(v.includes("percent"))return "percentage";
  if(v.includes("fixed")||v.includes("amount"))return "fixed_amount";
  return null;
};

export default function ProductCheckout(){
  const params=useParams<{slug:string}>();
  const router=useRouter();
  const slug=Array.isArray(params.slug)?params.slug[0]:params.slug;
  const [product,setProduct]=useState<Product|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [variantKey,setVariantKey]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [phoneVerificationToken,setPhoneVerificationToken]=useState("");
  const [email,setEmail]=useState("");
  const [address,setAddress]=useState("");
  const [notes,setNotes]=useState("");
  const [cities,setCities]=useState<City[]>([]);
  const [districts,setDistricts]=useState<District[]>([]);
  const [cityId,setCityId]=useState("");
  const [districtId,setDistrictId]=useState("");
  const [discountCode,setDiscountCode]=useState("");
  const [discount,setDiscount]=useState<Discount|null>(null);
  const [discountMessage,setDiscountMessage]=useState("");
  const [checking,setChecking]=useState(false);
  const [sending,setSending]=useState(false);
  const [savedAddresses,setSavedAddresses]=useState<SavedAddress[]>([]);
  const [savedAddressId,setSavedAddressId]=useState("");

  useEffect(()=>{let cancelled=false;(async()=>{try{
    const r=await fetch(`/api/products?slug=${encodeURIComponent(slug||"")}`,{cache:"no-store"});
    const j=await r.json();if(!r.ok||!j.success||!j.product)throw new Error(j.message||"Product not found.");
    if(cancelled)return;const p=j.product as Product;setProduct(p);
    const first=p.variants?.find(v=>v.allowPurchase&&v.stockQuantity>0);setVariantKey(first?.variantKey||"");
    const q=Number(new URLSearchParams(location.search).get("quantity")||1);setQuantity(Number.isFinite(q)?Math.max(1,Math.round(q)):1);
  }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load product.");}finally{if(!cancelled)setLoading(false);}})();return()=>{cancelled=true};},[slug]);

  useEffect(()=>{let cancelled=false;(async()=>{try{const r=await fetch("/api/bosta/locations",{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Could not load cities.");if(!cancelled)setCities(Array.isArray(j.cities)?j.cities:[]);}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load cities.");}})();return()=>{cancelled=true};},[]);

  useEffect(()=>{let cancelled=false;const supabase=getCustomerSupabaseBrowser();void supabase.auth.getSession().then(async({data})=>{const token=data.session?.access_token||"";if(!token||cancelled)return;try{const headers={Authorization:`Bearer ${token}`};const [overviewResponse,addressesResponse]=await Promise.all([fetch("/api/account/overview",{headers,cache:"no-store"}),fetch("/api/account/addresses",{headers,cache:"no-store"})]);const [overview,addressResult]=await Promise.all([overviewResponse.json(),addressesResponse.json()]);if(cancelled)return;setName(current=>current||String(overview?.account?.profile?.full_name||""));setPhone(current=>current||String(overview?.account?.profile?.phone||""));setEmail(current=>current||String(overview?.account?.email||data.session?.user?.email||""));const items:SavedAddress[]=Array.isArray(addressResult?.addresses)?addressResult.addresses:[];setSavedAddresses(items);const preferred=items.find(item=>item.is_default)||items[0];if(preferred){setSavedAddressId(preferred.id);setName(current=>current||preferred.full_name);setPhone(current=>current||preferred.phone);setAddress(current=>current||preferred.address);}}catch{/* Account prefill never blocks checkout. */}});return()=>{cancelled=true};},[]);

  useEffect(()=>{if(!savedAddressId||!cities.length)return;const saved=savedAddresses.find(item=>item.id===savedAddressId);if(!saved)return;const matched=cities.find(item=>item.name.trim().toLowerCase()===saved.governorate.trim().toLowerCase());if(matched&&matched.id!==cityId)setCityId(matched.id);},[cities,cityId,savedAddresses,savedAddressId]);

  useEffect(()=>{if(!cityId)return;let cancelled=false;(async()=>{try{const r=await fetch(`/api/bosta/locations?cityId=${encodeURIComponent(cityId)}`,{cache:"no-store"});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Could not load districts.");if(!cancelled)setDistricts(Array.isArray(j.districts)?j.districts:[]);}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load districts.");}})();return()=>{cancelled=true};},[cityId]);

  useEffect(()=>{if(!savedAddressId||!districts.length||districtId)return;const saved=savedAddresses.find(item=>item.id===savedAddressId);if(!saved?.area)return;const matched=districts.find(item=>item.name.trim().toLowerCase()===String(saved.area).trim().toLowerCase());if(matched)setDistrictId(matched.id);},[districtId,districts,savedAddresses,savedAddressId]);

  const variant=product?.variants?.find(v=>v.variantKey===variantKey)||null;
  const stock=variant?variant.stockQuantity:Number(product?.stockQuantity||0);
  const maxQty=Math.max(1,Math.min(Number(product?.maxOrderQuantity||10),stock||1));
  useEffect(()=>{const timer=window.setTimeout(()=>setQuantity(q=>Math.min(Math.max(q,1),maxQty)),0);return()=>window.clearTimeout(timer);},[maxQty]);
  const city=cities.find(c=>c.id===cityId)||null;
  const delivery=city?getDeliveryAreaForBostaCity(city).fee:0;
  const productsTotal=Number(product?.price||0)*quantity;
  const totals=useMemo(()=>{let pd=0,dd=0;if(discount?.type==="free_delivery")dd=delivery;if(discount?.type==="fixed_amount")pd=Math.min(discount.value,productsTotal);if(discount?.type==="percentage")pd=Math.min(Math.round(productsTotal*discount.value/100),productsTotal);return{productDiscount:pd,deliveryDiscount:dd,products:productsTotal-pd,delivery:delivery-dd,total:productsTotal-pd+delivery-dd};},[discount,delivery,productsTotal]);

  async function applyDiscount(){const code=discountCode.trim().toUpperCase();if(!code){setDiscount(null);setDiscountMessage("Enter a code first.");return;}if(!city){setDiscount(null);setDiscountMessage("Select your city first.");return;}setChecking(true);setDiscountMessage("");try{const r=await fetch("/api/discounts/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,productsTotal,deliveryFee:delivery,orderTotal:productsTotal+delivery})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Invalid discount code.");const type=normaliseDiscount(j.discountType||j.discount_type||j.type||j.discount?.type||j.discount?.discount_type);const value=Number(j.discountValue||j.discount_value||j.value||j.discount?.value||j.discount?.discount_value||0);if(!type||!Number.isFinite(value))throw new Error("Could not read discount.");setDiscount({code,type,value});setDiscountCode(code);setDiscountMessage("Discount applied.");}catch(e){setDiscount(null);setDiscountMessage(e instanceof Error?e.message:"Invalid discount.");}finally{setChecking(false);}}

  async function submit(e:FormEvent){e.preventDefault();if(!product||!city||!districtId||sending)return;if(!isValidEmail(email)){setError("Enter a valid email for order confirmation and secure tracking.");return;}if(product.status!=="available"||!product.allowPurchase||stock<=0){setError("This product is unavailable.");return;}if(product.variants?.length&&!variant){setError("Choose an available option.");return;}setSending(true);setError("");try{const r=await fetch("/api/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:name,phone,phoneVerificationToken,customerEmail:email.trim().toLowerCase(),productSlug:product.slug,productName:product.name,variantKey:variant?.variantKey||null,colour:variant?.label||"Standard",quantity,bostaCityId:city.id,bostaDistrictId:districtId,address,notes,discountCode:discount?.code||null})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Could not place order.");localStorage.removeItem("orvixCart");window.dispatchEvent(new Event("orvix-cart-updated"));router.push(`/order-success/${encodeURIComponent(j.orderNumber)}`);}catch(err){setError(err instanceof Error?err.message:"Could not place order.");setSending(false);}}

  if(loading)return <main className="min-h-screen bg-[#070707] text-white"><Navbar/><div className="flex min-h-[70vh] items-center justify-center text-white/40">Loading secure checkout…</div></main>;
  if(!product)return <main className="min-h-screen bg-[#070707] text-white"><Navbar/><div className="mx-auto max-w-xl px-5 py-24 text-center"><h1 className="text-4xl font-black">Checkout unavailable</h1><p className="mt-4 text-white/45">{error||"Product not found."}</p></div></main>;
  const unavailable=product.status!=="available"||!product.allowPurchase||stock<=0;

  return <main className="min-h-screen bg-[#070707] text-white"><Navbar/><section className="px-4 py-10 sm:px-6"><div className="mx-auto max-w-6xl">
    <p className="text-xs font-black uppercase tracking-[.3em] text-white/30">ORVIX SECURE CHECKOUT</p><h1 className="mt-3 text-4xl font-black">Complete your order</h1><p className="mt-3 text-sm text-white/40">Stock and pricing are verified atomically before the order is accepted.</p>
    <form onSubmit={submit} className="mt-8 grid gap-7 lg:grid-cols-[1fr_390px] lg:items-start"><div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-5"><div className="grid gap-5 sm:grid-cols-[130px_1fr] sm:items-center"><div className="rounded-3xl bg-white p-3"><Image src={product.image||"/black.png"} alt={product.name} width={400} height={400} className="aspect-square w-full object-contain" unoptimized/></div><div><h2 className="text-2xl font-black">{product.name}</h2><div className="mt-2 flex items-baseline gap-3"><b className="text-2xl">{money(product.price)}</b>{product.compareAtPrice&&product.compareAtPrice>product.price?<span className="text-sm text-white/30 line-through">{money(product.compareAtPrice)}</span>:null}</div><p className="mt-2 text-xs text-white/35">{stock} available</p></div></div>
        {!!product.variants?.length&&<div className="mt-5 grid gap-2 sm:grid-cols-2">{product.variants.map(v=>{const ok=v.allowPurchase&&v.stockQuantity>0;const selected=v.variantKey===variantKey;return <button key={v.id} type="button" disabled={!ok||sending} onClick={()=>setVariantKey(v.variantKey)} className={`rounded-2xl border p-4 text-left disabled:opacity-30 ${selected?"border-white bg-white text-black":"border-white/10 bg-black/20"}`}><b>{v.label}</b><span className={`mt-1 block text-xs ${selected?"text-black/50":"text-white/35"}`}>{ok?`${v.stockQuantity} available`:"Unavailable"}</span></button>})}</div>}
        <div className="mt-5 flex items-center gap-3"><button type="button" onClick={()=>setQuantity(q=>Math.max(1,q-1))} className="h-11 w-11 rounded-full bg-white/10 text-xl">−</button><b className="min-w-12 text-center text-lg">{quantity}</b><button type="button" disabled={quantity>=maxQty} onClick={()=>setQuantity(q=>Math.min(maxQty,q+1))} className="h-11 w-11 rounded-full bg-white text-xl text-black disabled:opacity-30">+</button></div>
      </section>
      <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-black">Contact</h2>{savedAddresses.length?<select value={savedAddressId} onChange={e=>{const saved=savedAddresses.find(item=>item.id===e.target.value);setSavedAddressId(e.target.value);if(!saved)return;setName(saved.full_name);setPhone(saved.phone);setAddress(saved.address);setDistrictId("");const matched=cities.find(item=>item.name.trim().toLowerCase()===saved.governorate.trim().toLowerCase());if(matched)setCityId(matched.id)}} className="mt-4 w-full rounded-2xl border border-emerald-300/15 bg-[#111] px-4 py-3.5 text-sm font-bold"><option value="">Use a saved address</option>{savedAddresses.map(saved=><option key={saved.id} value={saved.id}>{saved.label} · {saved.governorate}{saved.area?` · ${saved.area}`:""}</option>)}</select>:null}<div className="mt-4 grid gap-3 sm:grid-cols-2"><input required placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none"/><input required type="tel" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none"/><div className="sm:col-span-2"><CheckoutPhoneVerification phone={phone} onTokenChange={setPhoneVerificationToken} disabled={sending}/></div><input required type="email" placeholder="Email · required for secure tracking" value={email} onChange={e=>setEmail(e.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none sm:col-span-2"/><p className="text-xs leading-5 text-white/35 sm:col-span-2">We’ll send the order confirmation and one-time tracking code to this email.</p></div></section>
      <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-black">Delivery</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><select required value={cityId} onChange={e=>{setCityId(e.target.value);setDistrictId("");setDistricts([]);setDiscount(null)}} className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3.5"><option value="">Select city</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select required disabled={!cityId} value={districtId} onChange={e=>setDistrictId(e.target.value)} className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3.5 disabled:opacity-40"><option value="">Select district</option>{districts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><textarea required rows={3} placeholder="Full address" value={address} onChange={e=>setAddress(e.target.value)} className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none sm:col-span-2"/><textarea rows={2} placeholder="Notes · optional" value={notes} onChange={e=>setNotes(e.target.value)} className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 outline-none sm:col-span-2"/></div></section>
    </div><aside className="rounded-[28px] border border-white/10 bg-[#111] p-5 lg:sticky lg:top-24"><h2 className="text-xl font-black">Order summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-white/40">Product</span><b className="text-right">{product.name}</b></div><div className="flex justify-between"><span className="text-white/40">Option</span><b>{variant?.label||"Standard"}</b></div><div className="flex justify-between"><span className="text-white/40">Products</span><b>{money(productsTotal)}</b></div><div className="flex justify-between"><span className="text-white/40">Delivery</span><b>{city?money(totals.delivery):"Select city"}</b></div>{discount&&<div className="flex justify-between text-emerald-300"><span>Discount</span><b>-{money(totals.productDiscount+totals.deliveryDiscount)}</b></div>}</div>
      <div className="mt-5 border-t border-white/10 pt-5"><div className="flex gap-2"><input placeholder="Discount code" value={discountCode} onChange={e=>{setDiscountCode(e.target.value.toUpperCase());setDiscount(null);setDiscountMessage("")}} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 outline-none"/><button type="button" disabled={checking||!city} onClick={()=>void applyDiscount()} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-30">{checking?"…":"Apply"}</button></div>{discountMessage&&<p className={`mt-2 text-xs ${discount?"text-emerald-300":"text-red-300"}`}>{discountMessage}</p>}</div>
      <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5"><span className="font-black">Total</span><b className="text-3xl">{money(totals.total)}</b></div>{error&&<p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}<button disabled={sending||checking||unavailable||!city||!districtId} className="mt-5 w-full rounded-full bg-white px-5 py-4 text-lg font-black text-black disabled:opacity-30">{sending?"Placing order…":unavailable?"Unavailable":`Place order · ${money(totals.total)}`}</button><p className="mt-3 text-center text-[11px] leading-5 text-white/25">Final price, discount and stock are verified by ORVIX before confirmation.</p></aside></form>
  </div></section></main>;
}
