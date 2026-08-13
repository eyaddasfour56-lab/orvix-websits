"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/components/LanguageProvider";

const PRODUCT_NAME = "Garmin CIRQA";
const PRODUCT_SLUG = "garmin-cirqa";

const colours = [
  {
    name: "Black",
    image: "/black.jpeg",
    dot: "bg-black",
  },
  {
    name: "French Gray",
    image: "/french gray.jpeg",
    dot: "bg-gray-400",
  },
  {
    name: "Mauve",
    image: "/mauve.jpeg",
    dot: "bg-purple-300",
  },
  {
    name: "Captain Blue",
    image: "/captain blue.jpeg",
    dot: "bg-blue-500",
  },
];

const sizes = ["S-M", "L-XL"];

const featureGroupsEn = [
  {
    title: "Health",
    features: [
      {
        title: "24/7 Heart Rate",
        description:
          "Continuous heart-rate tracking with high and low heart-rate alerts.",
      },
      {
        title: "Body Battery",
        description:
          "Track your energy levels to find the best times for activity and rest.",
      },
      {
        title: "Pulse Ox",
        description:
          "Monitor your blood oxygen saturation while you are awake or asleep.",
      },
      {
        title: "Stress Tracking",
        description:
          "See whether your day is calm, balanced or stressful.",
      },
      {
        title: "Health Status",
        description:
          "Discover changes in your health data and usual wellness range.",
      },
      {
        title: "Skin Temperature",
        description:
          "Track overnight changes in your average skin temperature.",
      },
    ],
  },
  {
    title: "Sleep",
    features: [
      {
        title: "Advanced Sleep Monitoring",
        description:
          "View your sleep stages, sleep score and a detailed sleep breakdown.",
      },
      {
        title: "Sleep Coach",
        description:
          "Get personalised guidance for how much sleep you need.",
      },
      {
        title: "Sleep Alignment",
        description:
          "Understand your sleep consistency and circadian rhythm.",
      },
      {
        title: "Breathing Variations",
        description:
          "Understand changes in your breathing patterns while sleeping.",
      },
      {
        title: "Nap Detection",
        description:
          "Automatically track naps and see their effect on your recovery.",
      },
      {
        title: "Smart Wake Alarm",
        description:
          "Wake up with a gentle vibration at a suitable time.",
      },
    ],
  },
  {
    title: "Fitness",
    features: [
      {
        title: "Automatic Activity Detection",
        description:
          "Automatically detects activities such as walking and running.",
      },
      {
        title: "80+ Activities",
        description:
          "Track running, yoga, cycling and many other activities.",
      },
      {
        title: "Training Readiness",
        description:
          "Get a readiness score based on sleep, recovery and other health data.",
      },
      {
        title: "Training Status",
        description:
          "Understand whether your training is productive, peaking or strained.",
      },
      {
        title: "Steps & Calories",
        description:
          "Track your daily steps, calories burned and activity levels.",
      },
      {
        title: "Intensity Minutes",
        description:
          "Track your moderate and vigorous activity minutes.",
      },
    ],
  },
  {
    title: "Garmin Connect",
    features: [
      {
        title: "Sync Across Devices",
        description:
          "Keep your health and fitness data synced across Garmin devices.",
      },
      {
        title: "Lifestyle Logging",
        description:
          "Log lifestyle habits and understand how they affect your wellness.",
      },
      {
        title: "Mindful Breathing",
        description:
          "Start guided breathing activities and track respiration and stress.",
      },
      {
        title: "Meditation",
        description:
          "Access guided meditation practices through Garmin Connect+.",
      },
      {
        title: "Garmin Coach",
        description:
          "Follow selected coaching and fitness plans through Garmin Connect.",
      },
      {
        title: "Broadcast Heart Rate",
        description:
          "Share live heart-rate data with compatible Garmin devices.",
      },
    ],
  },
];

const featureGroupsAr = [
  {
    title: "الصحة",
    features: [
      {
        title: "معدل ضربات القلب طوال اليوم",
        description:
          "تتبّع مستمر لمعدل ضربات القلب مع تنبيهات الارتفاع والانخفاض.",
      },
      {
        title: "Body Battery",
        description:
          "تابع مستويات طاقتك لمعرفة أنسب أوقات النشاط والراحة.",
      },
      {
        title: "Pulse Ox",
        description:
          "راقب تشبع الأكسجين في الدم أثناء الاستيقاظ أو النوم.",
      },
      {
        title: "تتبّع التوتر",
        description:
          "تعرّف على ما إذا كان يومك هادئًا أو متوازنًا أو مرهقًا.",
      },
      {
        title: "الحالة الصحية",
        description:
          "اكتشف التغيرات في بياناتك الصحية ونطاق العافية المعتاد لديك.",
      },
      {
        title: "حرارة الجلد",
        description:
          "تابع التغيرات الليلية في متوسط درجة حرارة الجلد.",
      },
    ],
  },
  {
    title: "النوم",
    features: [
      {
        title: "مراقبة متقدمة للنوم",
        description:
          "شاهد مراحل النوم ودرجته وتحليلًا مفصلًا له.",
      },
      {
        title: "مدرب النوم",
        description:
          "احصل على إرشادات مخصصة لمدة النوم التي تحتاج إليها.",
      },
      {
        title: "انتظام النوم",
        description:
          "افهم مدى انتظام نومك وإيقاعك اليومي.",
      },
      {
        title: "تغيرات التنفس",
        description:
          "افهم التغيرات في نمط تنفسك أثناء النوم.",
      },
      {
        title: "اكتشاف القيلولة",
        description:
          "يتتبّع القيلولة تلقائيًا ويوضح تأثيرها في التعافي.",
      },
      {
        title: "منبه استيقاظ ذكي",
        description:
          "استيقظ باهتزاز لطيف في وقت مناسب.",
      },
    ],
  },
  {
    title: "اللياقة",
    features: [
      {
        title: "اكتشاف النشاط تلقائيًا",
        description:
          "يكتشف تلقائيًا أنشطة مثل المشي والجري.",
      },
      {
        title: "أكثر من 80 نشاطًا",
        description:
          "تابع الجري واليوغا وركوب الدراجات وأنشطة كثيرة أخرى.",
      },
      {
        title: "الاستعداد للتمرين",
        description:
          "احصل على درجة استعداد استنادًا إلى النوم والتعافي وبيانات صحية أخرى.",
      },
      {
        title: "حالة التدريب",
        description:
          "تعرّف على ما إذا كان تدريبك منتجًا أو في ذروته أو مرهقًا.",
      },
      {
        title: "الخطوات والنشاط",
        description:
          "تابع خطواتك اليومية ومستوى نشاطك.",
      },
      {
        title: "دقائق النشاط المكثف",
        description:
          "تابع دقائق النشاط المتوسط والقوي.",
      },
    ],
  },
  {
    title: "Garmin Connect",
    features: [
      {
        title: "المزامنة بين الأجهزة",
        description:
          "حافظ على مزامنة بيانات الصحة واللياقة بين أجهزة Garmin.",
      },
      {
        title: "تسجيل العادات اليومية",
        description:
          "سجل عاداتك وافهم تأثيرها في صحتك العامة.",
      },
      {
        title: "التنفس الواعي",
        description:
          "ابدأ تمارين تنفس موجهة وتابع التنفس والتوتر.",
      },
      {
        title: "التأمل",
        description:
          "استخدم جلسات تأمل موجهة عبر Garmin Connect+.",
      },
      {
        title: "Garmin Coach",
        description:
          "اتبع خطط تدريب ولياقة مختارة عبر Garmin Connect.",
      },
      {
        title: "بث معدل ضربات القلب",
        description:
          "شارك بيانات معدل ضربات القلب المباشرة مع أجهزة Garmin المتوافقة.",
      },
    ],
  },
];

const copyByLanguage = {
  en: {
    colours: {
      Black: "Black",
      "French Gray": "French Gray",
      Mauve: "Mauve",
      "Captain Blue": "Captain Blue",
    },
    enterName: "Please enter your name.",
    contactRequired:
      "Please enter your email or phone number.",
    validEmail:
      "Please enter a valid email address.",
    validPhone:
      "Please enter a valid phone number.",
    joinError:
      "Could not join the notification list.",
    joined:
      "You are on the list. We will notify you when Garmin CIRQA becomes available.",
    comingSoon: "Coming Soon",
    band: "Screen-Free Smart Band",
    description:
      "A screen-free smart band designed to track your health, sleep, recovery and daily activity through Garmin Connect.",
    chooseColour: "Choose your colour",
    chooseSize: "Choose your size",
    selectedOption: "Selected option",
    launchNote:
      "Price and official launch date will be announced soon.",
    notifyAvailable: "Notify Me When Available",
    notifyNote:
      "Join the list and we will contact you by email or phone when Garmin CIRQA becomes available.",
    launchNotification: "Launch Notification",
    joinList: "Join the Garmin CIRQA List",
    formDescription:
      "Enter your email or phone number and we will contact you when the product launches.",
    closeForm: "Close notification form",
    yourSelection: "Your selection",
    name: "Name",
    namePlaceholder: "Enter your name",
    email: "Email address",
    or: "Or",
    phone: "Phone number",
    contactNote:
      "Enter at least one contact method: email or phone number.",
    joining: "Joining List...",
    notifyLaunch: "Notify Me at Launch",
    done: "Done",
    featuresTitle: "Features at a glance",
    featuresSubtitle:
      "The most important health, sleep and fitness features, organised into simple cards.",
    availabilityNote:
      "Feature availability may depend on your country, compatible device, Garmin Connect version or a Garmin Connect+ subscription.",
    rights: "All rights reserved.",
    allProducts: "View all products",
  },
  ar: {
    colours: {
      Black: "أسود",
      "French Gray": "رمادي فرنسي",
      Mauve: "موف",
      "Captain Blue": "أزرق كابتن",
    },
    enterName: "من فضلك أدخل اسمك.",
    contactRequired:
      "من فضلك أدخل بريدك الإلكتروني أو رقم هاتفك.",
    validEmail:
      "من فضلك أدخل بريدًا إلكترونيًا صحيحًا.",
    validPhone:
      "من فضلك أدخل رقم هاتف صحيحًا.",
    joinError:
      "تعذر الانضمام إلى قائمة التنبيهات.",
    joined:
      "تم انضمامك إلى القائمة. سننبهك عند توفر Garmin CIRQA.",
    comingSoon: "قريبًا",
    band: "سوار ذكي من دون شاشة",
    description:
      "سوار ذكي من دون شاشة لمتابعة الصحة والنوم والتعافي والنشاط اليومي عبر Garmin Connect.",
    chooseColour: "اختر اللون",
    chooseSize: "اختر المقاس",
    selectedOption: "اختيارك",
    launchNote:
      "سيتم الإعلان عن السعر وموعد الإطلاق الرسمي قريبًا.",
    notifyAvailable: "نبّهني عند التوفر",
    notifyNote:
      "انضم إلى القائمة وسنتواصل معك عبر البريد أو الهاتف عند توفر Garmin CIRQA.",
    launchNotification: "تنبيه الإطلاق",
    joinList: "انضم إلى قائمة Garmin CIRQA",
    formDescription:
      "أدخل بريدك الإلكتروني أو رقم هاتفك وسنتواصل معك عند إطلاق المنتج.",
    closeForm: "إغلاق نموذج التنبيه",
    yourSelection: "اختيارك",
    name: "الاسم",
    namePlaceholder: "أدخل اسمك",
    email: "البريد الإلكتروني",
    or: "أو",
    phone: "رقم الهاتف",
    contactNote:
      "أدخل وسيلة تواصل واحدة على الأقل: البريد الإلكتروني أو رقم الهاتف.",
    joining: "جارٍ الانضمام...",
    notifyLaunch: "نبّهني عند الإطلاق",
    done: "تم",
    featuresTitle: "أهم المزايا",
    featuresSubtitle:
      "أهم مزايا الصحة والنوم واللياقة مرتبة في بطاقات واضحة.",
    availabilityNote:
      "قد يختلف توفر المزايا حسب بلدك والجهاز المتوافق وإصدار Garmin Connect أو اشتراك Garmin Connect+.",
    rights: "جميع الحقوق محفوظة.",
    allProducts: "عرض جميع المنتجات",
  },
} as const;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value.trim()
  );
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.length >= 10;
}

export default function GarminCirqaPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];
  const featureGroups =
    language === "ar"
      ? featureGroupsAr
      : featureGroupsEn;

  const [
    selectedColour,
    setSelectedColour,
  ] = useState(colours[0]);

  const [
    selectedSize,
    setSelectedSize,
  ] = useState(sizes[0]);

  const [
    showNotifyForm,
    setShowNotifyForm,
  ] = useState(false);

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [sending, setSending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  function openNotifyForm() {
    setShowNotifyForm(true);
    setMessage("");
    setSuccess(false);

    window.setTimeout(() => {
      document
        .getElementById(
          "garmin-notify-form"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

  function closeNotifyForm() {
    setShowNotifyForm(false);
    setMessage("");
    setSuccess(false);
  }

  async function handleNotifySubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (sending) {
      return;
    }

    setMessage("");
    setSuccess(false);

    if (!customerName.trim()) {
      setMessage(
        copy.enterName
      );

      return;
    }

    if (!email.trim() && !phone.trim()) {
      setMessage(
        copy.contactRequired
      );

      return;
    }

    if (
      email.trim() &&
      !isValidEmail(email)
    ) {
      setMessage(
        copy.validEmail
      );

      return;
    }

    if (
      phone.trim() &&
      !isValidPhone(phone)
    ) {
      setMessage(
        copy.validPhone
      );

      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/waitlist",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productName: PRODUCT_NAME,
            productSlug: PRODUCT_SLUG,

            customerName:
              customerName.trim(),

            email: email
              .trim()
              .toLowerCase(),

            phone: phone.trim(),

            colour:
              selectedColour.name,

            size: selectedSize,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            copy.joinError
        );
      }

      setSuccess(true);

      setMessage(
        language === "ar"
          ? copy.joined
          : result.message || copy.joined
      );

      setCustomerName("");
      setEmail("");
      setPhone("");
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? language === "ar"
            ? copy.joinError
            : error.message
          : copy.joinError
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      {/* Product Section */}
      <section className="py-14 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
          {/* Product Image */}
          <div className="rounded-[40px] bg-white p-6 sm:sticky sm:top-28 sm:p-8">
            <Image
              key={selectedColour.name}
              src={selectedColour.image}
              alt={`${PRODUCT_NAME} - ${
                copy.colours[
                  selectedColour.name as keyof typeof copy.colours
                ]
              }`}
              width={700}
              height={700}
              priority
              className="h-auto w-full rounded-[30px] object-contain"
            />
          </div>

          {/* Product Details */}
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-bold uppercase tracking-[0.25em] text-gray-300">
              {copy.comingSoon}
            </span>

            <p className="mt-7 text-sm uppercase tracking-[0.4em] text-gray-500">
              {copy.band}
            </p>

            <h1 className="mt-5 text-5xl font-black leading-none sm:text-6xl">
              {PRODUCT_NAME}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
              {copy.description}
            </p>

            {/* Colour */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              {copy.chooseColour}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {colours.map((colour) => {
                const selected =
                  selectedColour.name ===
                  colour.name;

                return (
                  <button
                    key={colour.name}
                    type="button"
                    onClick={() => {
                      setSelectedColour(
                        colour
                      );

                      setMessage("");
                      setSuccess(false);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-start font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-full border ${
                        selected
                          ? "border-black/20"
                          : "border-white/20"
                      } ${colour.dot}`}
                    />

                    <span>
                      {
                        copy.colours[
                          colour.name as keyof typeof copy.colours
                        ]
                      }
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Size */}
            <p className="mt-10 text-sm uppercase tracking-[0.35em] text-gray-500">
              {copy.chooseSize}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {sizes.map((size) => {
                const selected =
                  selectedSize === size;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setSelectedSize(size);
                      setMessage("");
                      setSuccess(false);
                    }}
                    className={`rounded-2xl border p-4 text-center font-bold transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Selection */}
            <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                {copy.selectedOption}
              </p>

              <p className="mt-3 text-xl font-bold">
                {
                  copy.colours[
                    selectedColour.name as keyof typeof copy.colours
                  ]
                } ·{" "}
                {selectedSize}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {copy.launchNote}
              </p>
            </div>

            {/* Notify Button */}
            <button
              type="button"
              onClick={openNotifyForm}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200 active:scale-[0.99]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path
                  d="M18 8C18 4.69 15.31 2 12 2C8.69 2 6 4.69 6 8V11.5C6 13.3 5.4 15.05 4.3 16.48L3 18H21L19.7 16.48C18.6 15.05 18 13.3 18 11.5V8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M10 21H14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

              {copy.notifyAvailable}
            </button>

            <p className="mt-4 text-center text-sm leading-6 text-gray-500">
              {copy.notifyNote}
            </p>

            {/* Notify Form */}
            {showNotifyForm && (
              <form
                id="garmin-notify-form"
                onSubmit={handleNotifySubmit}
                className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                      {copy.launchNotification}
                    </p>

                    <h2 className="mt-3 text-2xl font-black">
                      {copy.joinList}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                      {copy.formDescription}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeNotifyForm}
                    aria-label={copy.closeForm}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-2xl transition hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {copy.yourSelection}
                  </p>

                  <p className="mt-2 font-black">
                    {
                      copy.colours[
                        selectedColour.name as keyof typeof copy.colours
                      ]
                    } ·{" "}
                    {selectedSize}
                  </p>
                </div>

                <div className="mt-6 grid gap-5">
                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      {copy.name}
                    </span>

                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) => {
                        setCustomerName(
                          event.target.value
                        );

                        setMessage("");
                        setSuccess(false);
                      }}
                      placeholder={copy.namePlaceholder}
                      autoComplete="name"
                      disabled={sending}
                      required
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      {copy.email}
                    </span>

                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value
                        );

                        setMessage("");
                        setSuccess(false);
                      }}
                      placeholder="name@example.com"
                      autoComplete="email"
                      inputMode="email"
                      disabled={sending}
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>

                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />

                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
                      {copy.or}
                    </span>

                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <label>
                    <span className="mb-2 block text-sm font-bold text-gray-300">
                      {copy.phone}
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
                      disabled={sending}
                      className="w-full rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-white outline-none placeholder:text-gray-600 focus:border-white disabled:opacity-50"
                    />
                  </label>
                </div>

                <p className="mt-4 text-xs leading-6 text-gray-500">
                  {copy.contactNote}
                </p>

                {message && (
                  <p
                    role="alert"
                    className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                      success
                        ? "border-green-500/20 bg-green-500/10 text-green-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {message}
                  </p>
                )}

                {!success ? (
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      !customerName.trim() ||
                      (!email.trim() &&
                        !phone.trim())
                    }
                    className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-7 py-5 font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending
                      ? copy.joining
                      : copy.notifyLaunch}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeNotifyForm}
                    className="mt-6 flex w-full items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
                  >
                    {copy.done}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-[#0b0b0b] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              {PRODUCT_NAME}
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              {copy.featuresTitle}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              {copy.featuresSubtitle}
            </p>
          </div>

          <div className="mt-16 space-y-16">
            {featureGroups.map(
              (group) => (
                <section key={group.title}>
                  <div className="flex items-center gap-5">
                    <h3 className="shrink-0 text-2xl font-black uppercase tracking-[0.15em] sm:text-3xl">
                      {group.title}
                    </h3>

                    <div className="h-px flex-1 bg-white/15" />
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {group.features.map(
                      (feature) => (
                        <article
                          key={
                            feature.title
                          }
                          className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
                        >
                          <h4 className="font-bold leading-6 text-white sm:text-lg">
                            {feature.title}
                          </h4>

                          <p className="mt-3 text-sm leading-6 text-gray-400">
                            {
                              feature.description
                            }
                          </p>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>

          <p className="mx-auto mt-16 max-w-3xl text-center text-xs leading-6 text-gray-600">
            {copy.availabilityNote}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:px-6 md:flex-row">
          <p>
            © 2026 ORVIX. {copy.rights}
          </p>

          <Link
            href="/#products"
            className="font-bold text-white"
          >
            {copy.allProducts}
          </Link>
        </div>
      </footer>
    </main>
  );
}
