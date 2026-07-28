"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";

const colours = [
{
name: "Black",
image: "/black.png",
buttonStyle: "bg-black",
},
{
name: "Lavender",
image: "/lavender.jpeg",
buttonStyle: "bg-blue-300",
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
name: "New Valley, South Sinai, Sharm El Sheikh and Marsa Matrouh",
fee: 140,
},
];

export default function CheckoutPage() {
const [selectedColour, setSelectedColour] = useState(colours[0]);
const [selectedAreaCode, setSelectedAreaCode] = useState("");
const [quantity, setQuantity] = useState(1);
const [orderSent, setOrderSent] = useState(false);
const [orderNumber, setOrderNumber] = useState("");
const [isSending, setIsSending] = useState(false);
const [orderError, setOrderError] = useState("");

const productPrice = 7900;

const selectedArea = deliveryAreas.find(
(area) => area.code === selectedAreaCode
);

const deliveryFee = selectedArea?.fee ?? 0;
const productsTotal = productPrice * quantity;
const finalTotal = productsTotal + deliveryFee;

async function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

if (!selectedArea) {  
  setOrderError("Please select your delivery area.");  
  return;  
}  

setIsSending(true);  
setOrderError("");  

const form = event.currentTarget;  
const formData = new FormData(form);  

const orderData = {  
  fullName: String(formData.get("fullName") || ""),  
  phone: String(formData.get("phone") || ""),  
  governorate: selectedArea.name,  
  address: String(formData.get("address") || ""),  
  notes: String(formData.get("notes") || ""),  
  colour: selectedColour.name,  
  quantity,  
  productPrice,  
  deliveryFee,  
  totalPrice: finalTotal,  
};  

try {  
  const response = await fetch("/api/order", {  
    method: "POST",  
    headers: {  
      "Content-Type": "application/json",  
    },  
    body: JSON.stringify(orderData),  
  });  

  const result = await response.json();  

  if (!response.ok || !result.success) {  
    throw new Error(result.message || "The order could not be sent.");  
  }  

  setOrderNumber(result.orderNumber || "");  
  setOrderSent(true);  
  form.reset();  
} catch (error) {  
  setOrderError(  
    error instanceof Error  
      ? error.message  
      : "Something went wrong. Please try again."  
  );  
} finally {  
  setIsSending(false);  
}

}

function resetOrder() {
setOrderSent(false);
setOrderNumber("");
setOrderError("");
setQuantity(1);
setSelectedAreaCode("");
setSelectedColour(colours[0]);
}

return (
<main className="min-h-screen bg-[#080808] text-white">
<header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
<Link href="/" className="flex items-center gap-3">
<Image  
src="/logo.jpeg"  
alt="ORVIX logo"  
width={48}  
height={48}  
className="rounded-xl"  
/>

<span className="text-lg font-bold tracking-[0.25em]">  
          ORVIX  
        </span>  
      </Link>  

      <Link  
        href="/"  
        className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold transition hover:border-white hover:bg-white hover:text-black"  
      >  
        Back to store  
      </Link>  
    </div>  
  </header>  

  <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 md:py-20">  
    <div className="mb-12">  
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">  
        Secure checkout  
      </p>  

      <h1 className="mt-4 text-4xl font-bold md:text-6xl">  
        Complete your order.  
      </h1>  

      <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-400">  
        Choose your colour, enter your delivery details and place your  
        order. Payment is cash on delivery.  
      </p>  
    </div>  

    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">  
      <div className="space-y-6">  
        <div className="overflow-hidden rounded-[32px] bg-white p-8">  
          <Image  
            src={selectedColour.image}  
            alt={`Google Fitbit Air in ${selectedColour.name}`}  
            width={700}  
            height={700}  
            priority  
            className="h-auto w-full object-contain"  
          />  
        </div>  

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">  
          <div className="flex items-start justify-between gap-6">  
            <div>  
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">  
                Your product  
              </p>  

              <h2 className="mt-3 text-2xl font-bold">  
                Google Fitbit Air  
              </h2>  

              <p className="mt-2 text-gray-400">  
                Colour: {selectedColour.name}  
              </p>  
            </div>  

            <p className="text-2xl font-bold">  
              7,900 EGP  
            </p>  
          </div>  

          <div className="mt-6 border-t border-white/10 pt-6">  
            <p className="mb-4 font-semibold">  
              Select colour  
            </p>  

            <div className="flex gap-4">  
              {colours.map((colour) => (  
                <button  
                  key={colour.name}  
                  type="button"  
                  onClick={() => setSelectedColour(colour)}  
                  aria-label={`Select ${colour.name}`}  
                  className={`h-12 w-12 rounded-full border-4 transition ${colour.buttonStyle} ${  
                    selectedColour.name === colour.name  
                      ? "scale-110 border-white"  
                      : "border-gray-700 hover:border-gray-400"  
                  }`}  
                />  
              ))}  
            </div>  
          </div>  

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-6">  
            <p className="font-semibold">  
              Quantity  
            </p>  

            <div className="flex items-center gap-4">  
              <button  
                type="button"  
                onClick={() =>  
                  setQuantity((current) => Math.max(1, current - 1))  
                }  
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"  
              >  
                −  
              </button>  

              <span className="min-w-6 text-center text-lg font-bold">  
                {quantity}  
              </span>  

              <button  
                type="button"  
                onClick={() => setQuantity((current) => current + 1)}  
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl transition hover:bg-white/20"  
              >  
                +  
              </button>  
            </div>  
          </div>  
        </div>  

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">  
          <h3 className="text-xl font-bold">  
            Order summary  
          </h3>  

          <div className="mt-6 space-y-4">  
            <div className="flex items-center justify-between">  
              <span className="text-gray-400">  
                Products  
              </span>  

              <span className="font-semibold">  
                {productsTotal.toLocaleString("en-GB")} EGP  
              </span>  
            </div>  

            <div className="flex items-center justify-between">  
              <span className="text-gray-400">  
                Delivery  
              </span>  

              <span className="font-semibold">  
                {selectedArea  
                  ? `${deliveryFee.toLocaleString("en-GB")} EGP`  
                  : "Select an area"}  
              </span>  
            </div>  

            <div className="flex items-center justify-between border-t border-white/10 pt-5">  
              <span className="text-lg font-bold">  
                Final total  
              </span>  

              <span className="text-2xl font-bold">  
                {finalTotal.toLocaleString("en-GB")} EGP  
              </span>  
            </div>  
          </div>  
        </div>  
      </div>  

      <div className="rounded-[32px] bg-white p-6 text-black shadow-2xl shadow-black/30 md:p-10">  
        {orderSent ? (  
          <div className="flex min-h-[650px] flex-col items-center justify-center text-center">  
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl font-bold text-green-700">  
              ✓  
            </div>  

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-green-700">  
              Order confirmed  
            </p>  

            <h2 className="mt-4 text-4xl font-bold">  
              Order received.  
            </h2>  

            <p className="mt-4 max-w-md text-lg leading-8 text-gray-600">  
              Thank you. ORVIX will contact you shortly to confirm your  
              order and delivery details.  
            </p>  

            {orderNumber && (  
              <div className="mt-8 rounded-2xl bg-gray-100 px-8 py-5">  
                <p className="text-sm text-gray-500">  
                  Order number  
                </p>  

                <p className="mt-1 text-lg font-bold">  
                  {orderNumber}  
                </p>  
              </div>  
            )}  

            <button  
              type="button"  
              onClick={resetOrder}  
              className="mt-8 rounded-full bg-black px-7 py-4 font-bold text-white transition hover:scale-105 hover:bg-gray-800"  
            >  
              Place another order  
            </button>  

            <Link  
              href="/"  
              className="mt-5 text-sm font-semibold text-gray-500 underline underline-offset-4"  
            >  
              Return to store  
            </Link>  
          </div>  
        ) : (  
          <form onSubmit={handleOrderSubmit} className="space-y-6">  
            <div>  
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">  
                Delivery details  
              </p>  

              <h2 className="mt-3 text-3xl font-bold">  
                Where should we send it?  
              </h2>  
            </div>  

            <div>  
              <label  
                htmlFor="fullName"  
                className="mb-2 block text-sm font-semibold"  
              >  
                Full name  
              </label>  

              <input  
                id="fullName"  
                name="fullName"  
                type="text"  
                required  
                placeholder="Enter your full name"  
                className="w-full rounded-2xl border border-gray-300 px-4 py-4 outline-none transition focus:border-black"  
              />  
            </div>  

            <div>  
              <label  
                htmlFor="phone"  
                className="mb-2 block text-sm font-semibold"  
              >  
                Phone number  
              </label>  

              <input  
                id="phone"  
                name="phone"  
                type="tel"  
                required  
                placeholder="Enter your phone number"  
                className="w-full rounded-2xl border border-gray-300 px-4 py-4 outline-none transition focus:border-black"  
              />  
            </div>  

            <div>  
              <label  
                htmlFor="deliveryArea"  
                className="mb-2 block text-sm font-semibold"  
              >  
                Delivery area  
              </label>  

              <select  
                id="deliveryArea"  
                name="deliveryArea"  
                required  
                value={selectedAreaCode}  
                onChange={(event) => {  
                  setSelectedAreaCode(event.target.value);  
                  setOrderError("");  
                }}  
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-4 outline-none transition focus:border-black"  
              >  
                <option value="">  
                  Select your delivery area  
                </option>  

                {deliveryAreas.map((area) => (  
                  <option key={area.code} value={area.code}>  
                    {area.name} — {area.fee} EGP  
                  </option>  
                ))}  
              </select>  
            </div>  

            {selectedArea && (  
              <div className="rounded-2xl bg-gray-100 p-4">  
                <div className="flex items-center justify-between gap-4">  
                  <span className="font-semibold">  
                    Delivery fee  
                  </span>  

                  <span className="text-lg font-bold">  
                    {deliveryFee.toLocaleString("en-GB")} EGP  
                  </span>  
                </div>  
              </div>  
            )}  

            <div>  
              <label  
                htmlFor="address"  
                className="mb-2 block text-sm font-semibold"  
              >  
                Full address  
              </label>  

              <textarea  
                id="address"  
                name="address"  
                required  
                rows={4}  
                placeholder="Street, building and apartment number"  
                className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-4 outline-none transition focus:border-black"  
              />  
            </div>  

            <div>  
              <label  
                htmlFor="notes"  
                className="mb-2 block text-sm font-semibold"  
              >  
                Order notes  
              </label>  

              <textarea  
                id="notes"  
                name="notes"  
                rows={3}  
                placeholder="Optional notes"  
                className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-4 outline-none transition focus:border-black"  
              />  
            </div>  

            <div className="rounded-2xl bg-gray-100 p-5">  
              <div className="flex justify-between gap-4">  
                <span className="text-gray-600">  
                  Product  
                </span>  

                <span className="text-right font-semibold">  
                  Google Fitbit Air  
                </span>  
              </div>  

              <div className="mt-3 flex justify-between gap-4">  
                <span className="text-gray-600">  
                  Colour  
                </span>  

                <span className="font-semibold">  
                  {selectedColour.name}  
                </span>  
              </div>  

              <div className="mt-3 flex justify-between gap-4">  
                <span className="text-gray-600">  
                  Quantity  
                </span>  

                <span className="font-semibold">  
                  {quantity}  
                </span>  
              </div>  

              <div className="mt-3 flex justify-between gap-4">  
                <span className="text-gray-600">  
                  Products total  
                </span>  

                <span className="font-semibold">  
                  {productsTotal.toLocaleString("en-GB")} EGP  
                </span>  
              </div>  

              <div className="mt-3 flex justify-between gap-4">  
                <span className="text-gray-600">  
                  Delivery  
                </span>  

                <span className="font-semibold">  
                  {selectedArea  
                    ? `${deliveryFee.toLocaleString("en-GB")} EGP`  
                    : "Not selected"}  
                </span>  
              </div>  

              <div className="mt-4 flex justify-between gap-4 border-t border-gray-300 pt-4 text-lg font-bold">  
                <span>  
                  Final total  
                </span>  

                <span>  
                  {finalTotal.toLocaleString("en-GB")} EGP  
                </span>  
              </div>  
            </div>  

            {orderError && (  
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">  
                {orderError}  
              </div>  
            )}  

            <button  
              type="submit"  
              disabled={isSending || !selectedArea}  
              className="w-full rounded-full bg-black px-6 py-4 text-lg font-bold text-white transition hover:scale-[1.02] hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:scale-100"  
            >  
              {isSending ? "Sending order..." : "Place Order"}  
            </button>  

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">  
              <span>✓</span>  
              <span>Cash on delivery</span>  
            </div>  
          </form>  
        )}  
      </div>  
    </div>  
  </section>  
</main>

);
}