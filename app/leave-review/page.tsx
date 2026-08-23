"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

const copyByLanguage = {
  en: {
    eyebrow: "ORVIX Reviews",
    title: "Share Your Experience",
    subtitle:
      "Your feedback helps us improve and helps other customers shop with confidence.",
    orderNumber: "Order Number",
    phoneNumber: "Phone Number",
    rating: "Your Rating",
    starLabel: (star: number) =>
      `${star} star rating`,
    selectStars: "Select from 1 to 5 stars.",
    starsSelected: (rating: number) =>
      `${rating} out of 5 stars selected.`,
    review: "Your Review",
    reviewPlaceholder:
      "Tell us what you liked about your ORVIX experience...",
    minimum: "Minimum 5 characters",
    photos: "Photos (optional)",
    photosHelp: "Add up to 3 JPG, PNG or WebP photos, 1 MB each.",
    invalidPhotos: "Choose up to 3 valid images no larger than 1 MB each.",
    submitting: "Submitting Review...",
    submit: "Submit Review",
    reviewNote:
      "Reviews can only be submitted for delivered orders. Reviews are checked before appearing publicly.",
    track: "Track Your Order",
    back: "Back to Product",
    rights: "All rights reserved.",
    missingOrder: "Please enter your order number.",
    missingPhone: "Please enter your phone number.",
    missingRating:
      "Please select a rating from 1 to 5 stars.",
    shortReview:
      "Please write at least 5 characters.",
    genericError:
      "Could not submit your review.",
    success:
      "Thank you! Your review was submitted successfully.",
  },
  ar: {
    eyebrow: "تقييمات ORVIX",
    title: "شاركنا تجربتك",
    subtitle:
      "ملاحظاتك تساعدنا على التطور وتساعد العملاء الآخرين على التسوق بثقة.",
    orderNumber: "رقم الطلب",
    phoneNumber: "رقم الهاتف",
    rating: "تقييمك",
    starLabel: (star: number) =>
      `تقييم ${star} من 5 نجوم`,
    selectStars: "اختر تقييمًا من نجمة إلى 5 نجوم.",
    starsSelected: (rating: number) =>
      `اخترت ${rating.toLocaleString("ar-EG")} من 5 نجوم.`,
    review: "اكتب تقييمك",
    reviewPlaceholder:
      "أخبرنا بما أعجبك في تجربتك مع ORVIX...",
    minimum: "5 أحرف على الأقل",
    photos: "صور (اختياري)",
    photosHelp: "يمكنك إضافة 3 صور JPG أو PNG أو WebP بحد أقصى 1 ميجابايت للصورة.",
    invalidPhotos: "اختر حتى 3 صور صحيحة، وبحد أقصى 5 ميجابايت للصورة.",
    submitting: "جارٍ إرسال التقييم...",
    submit: "إرسال التقييم",
    reviewNote:
      "يمكن إضافة تقييم للطلبات التي تم توصيلها فقط، وتتم مراجعته قبل ظهوره للعامة.",
    track: "تتبّع طلبك",
    back: "العودة إلى المنتج",
    rights: "جميع الحقوق محفوظة.",
    missingOrder: "من فضلك أدخل رقم الطلب.",
    missingPhone: "من فضلك أدخل رقم الهاتف.",
    missingRating: "من فضلك اختر تقييمًا من 1 إلى 5.",
    shortReview: "من فضلك اكتب 5 أحرف على الأقل.",
    genericError:
      "تعذر إرسال تقييمك الآن. حاول مرة أخرى.",
    success: "شكرًا لك! تم إرسال تقييمك بنجاح.",
  },
} as const;

export default function LeaveReviewPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];

  const [orderNumber, setOrderNumber] =
    useState("");

  const [phone, setPhone] = useState("");

  const [rating, setRating] = useState(0);

  const [hoveredRating, setHoveredRating] =
    useState(0);

  const [reviewText, setReviewText] =
    useState("");

  const [photos, setPhotos] = useState<File[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const animationFrame =
      window.requestAnimationFrame(() => {
        const searchParams =
          new URLSearchParams(
            window.location.search
          );

        const orderNumberFromUrl =
          searchParams.get("orderNumber");

        const savedPhone =
          sessionStorage.getItem(
            "orvixLastOrderPhone"
          );

        if (orderNumberFromUrl) {
          setOrderNumber(
            orderNumberFromUrl
              .trim()
              .toUpperCase()
          );
        }

        if (savedPhone) {
          setPhone(savedPhone);
        }
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setSuccess(false);

    if (!orderNumber.trim()) {
      setMessage(
        copy.missingOrder
      );

      return;
    }

    if (!phone.trim()) {
      setMessage(
        copy.missingPhone
      );

      return;
    }

    if (rating < 1 || rating > 5) {
      setMessage(
        copy.missingRating
      );

      return;
    }

    if (reviewText.trim().length < 5) {
      setMessage(
        copy.shortReview
      );

      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("orderNumber", orderNumber.trim().toUpperCase());
      formData.set("phone", phone.trim());
      formData.set("rating", String(rating));
      formData.set("reviewText", reviewText.trim());
      photos.forEach((photo) => formData.append("photos", photo));

      const response = await fetch(
        "/api/reviews/submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            copy.genericError
        );
      }

      setSuccess(true);

      setMessage(
        language === "ar"
          ? copy.success
          : result.message || copy.success
      );

      setRating(0);
      setHoveredRating(0);
      setReviewText("");
      setPhotos([]);
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? language === "ar"
            ? copy.genericError
            : error.message
          : copy.genericError
      );
    } finally {
      setLoading(false);
    }
  }

  const displayedRating =
    hoveredRating || rating;

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              {copy.eyebrow}
            </p>

            <h1 className="mt-4 text-4xl font-black sm:text-6xl">
              {copy.title}
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              {copy.subtitle}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  {copy.orderNumber}
                </span>

                <input
                  type="text"
                  dir="ltr"
                  value={orderNumber}
                  onChange={(event) => {
                    setOrderNumber(
                      event.target.value.toUpperCase()
                    );

                    setMessage("");
                    setSuccess(false);
                  }}
                  placeholder="ORVIX-..."
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 uppercase text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-gray-300">
                  {copy.phoneNumber}
                </span>

                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(event) => {
                    setPhone(
                      event.target.value
                    );

                    setMessage("");
                    setSuccess(false);
                  }}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                />
              </label>
            </div>

            <div className="mt-7">
              <p className="text-sm font-bold text-gray-300">
                {copy.rating}
              </p>

              <div
                className="mt-4 flex flex-wrap gap-2"
                onMouseLeave={() =>
                  setHoveredRating(0)
                }
              >
                {[1, 2, 3, 4, 5].map(
                  (star) => {
                    const active =
                      star <=
                      displayedRating;

                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setMessage("");
                          setSuccess(false);
                        }}
                        onMouseEnter={() =>
                          setHoveredRating(
                            star
                          )
                        }
                        disabled={loading}
                        aria-label={copy.starLabel(
                          star
                        )}
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl transition disabled:opacity-50 ${
                          active
                            ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                            : "border-white/10 bg-black/40 text-gray-600 hover:border-white/30 hover:text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    );
                  }
                )}
              </div>

              <p className="mt-3 text-sm text-gray-500">
                {rating === 0
                  ? copy.selectStars
                  : copy.starsSelected(rating)}
              </p>
            </div>

            <label className="mt-7 block">
              <span className="mb-2 block text-sm font-bold text-gray-300">
                {copy.review}
              </span>

              <textarea
                value={reviewText}
                onChange={(event) => {
                  setReviewText(
                    event.target.value
                  );

                  setMessage("");
                  setSuccess(false);
                }}
                placeholder={copy.reviewPlaceholder}
                rows={6}
                maxLength={1000}
                disabled={loading}
                className="w-full resize-none rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
              />

              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-gray-500">
                <span>
                  {copy.minimum}
                </span>

                <span>
                  {reviewText.length}/1000
                </span>
              </div>
            </label>

            <label className="mt-6 block rounded-2xl border border-dashed border-white/15 bg-black/25 p-4">
              <span className="block text-sm font-bold text-gray-300">{copy.photos}</span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">{copy.photosHelp}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={loading}
                onChange={(event) => {
                  const selected = Array.from(event.target.files || []);
                  const valid = selected.length <= 3 && selected.every((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 1024 * 1024);
                  if (!valid) {
                    setPhotos([]);
                    setMessage(copy.invalidPhotos);
                    setSuccess(false);
                    event.target.value = "";
                    return;
                  }
                  setPhotos(selected);
                  setMessage("");
                  setSuccess(false);
                }}
                className="mt-4 block w-full text-xs text-white/55 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2.5 file:text-xs file:font-black file:text-black"
              />
              {photos.length ? <ul className="mt-3 space-y-1 text-xs text-white/45">{photos.map((photo) => <li key={`${photo.name}-${photo.size}`}>✓ {photo.name}</li>)}</ul> : null}
            </label>

            {message && (
              <p
                role="alert"
                className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
                  success
                    ? "border-green-500/20 bg-green-500/10 text-green-300"
                    : "border-red-500/20 bg-red-500/10 text-red-300"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !orderNumber.trim() ||
                !phone.trim() ||
                rating === 0 ||
                reviewText.trim().length < 5
              }
              className="mt-7 flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? copy.submitting
                : copy.submit}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-gray-500">
              {copy.reviewNote}
            </p>
          </form>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/track-order"
              className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-center font-bold transition hover:bg-white/10"
            >
              {copy.track}
            </Link>

            <Link
              href="/products/google-fitbit-air"
              className="flex items-center justify-center rounded-full border border-white/15 px-6 py-4 text-center font-bold transition hover:bg-white/10"
            >
              {copy.back}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8">
        <p className="text-center text-sm text-gray-600">
          © 2026 ORVIX. {copy.rights}
        </p>
      </footer>
    </main>
  );
}
