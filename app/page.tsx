"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  motion,
  useReducedMotion,
} from "motion/react";
import Navbar from "@/components/Navbar";
import {
  Language,
  useLanguage,
} from "@/components/LanguageProvider";
import {
  enterMotion,
  revealMotion,
} from "@/lib/motion-config";

type ProductStatus =
  | "available"
  | "coming_soon"
  | "out_of_stock"
  | "hidden";

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  image: string;
  status: ProductStatus;
  stockQuantity: number;
  lowStockLimit: number;
  showOnHomepage: boolean;
  allowWishlist: boolean;
  allowPurchase: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

const benefitsByLanguage = {
  en: [
    {
      number: "01",
      title: "Carefully Selected",
      description:
        "We focus on smart fitness technology that offers useful features, reliable performance and a clean design.",
    },
    {
      number: "02",
      title: "Simple Ordering",
      description:
        "Choose your product, colour and delivery area, then complete your order securely through our website.",
    },
    {
      number: "03",
      title: "Order Tracking",
      description:
        "Use your order number and phone number to check the latest status of your ORVIX order at any time.",
    },
  ],
  ar: [
    {
      number: "01",
      title: "اختيار بعناية",
      description:
        "نختار تقنيات اللياقة الذكية التي تجمع بين المزايا العملية والأداء الموثوق والتصميم الأنيق.",
    },
    {
      number: "02",
      title: "طلب سهل",
      description:
        "اختر المنتج واللون ومنطقة التوصيل، ثم أكمل طلبك بأمان عبر موقعنا.",
    },
    {
      number: "03",
      title: "تتبّع الطلب",
      description:
        "استخدم رقم الطلب ورقم الهاتف لمعرفة أحدث حالة لطلب ORVIX في أي وقت.",
    },
  ],
} as const;

const faqsByLanguage = {
  en: [
    {
      question: "How can I place an order?",
      answer:
        "Open an available product, select your preferred options and quantity, add it to your cart, then complete the checkout form.",
    },
    {
      question: "How do I track my order?",
      answer:
        "Open the Track Order page and enter the order number and phone number used during checkout. Your current order status will appear immediately.",
    },
    {
      question:
        "Where can I find my order number?",
      answer:
        "Your order number appears on the confirmation page after checkout and is also sent to the email address used during your order.",
    },
    {
      question:
        "What payment method is available?",
      answer:
        "Payment is completed through InstaPay when your order arrives. No advance payment is required.",
    },
    {
      question:
        "How much does delivery cost?",
      answer:
        "Delivery fees depend on your selected area and are calculated automatically during checkout before you place the order.",
    },
    {
      question:
        "Can I use a discount code?",
      answer:
        "Yes. Enter an active discount code in the order summary during checkout. The discount will appear before you submit the order.",
    },
    {
      question:
        "What happens when a product is out of stock?",
      answer:
        "The product remains visible, but purchasing is disabled until new stock is added.",
    },
    {
      question:
        "How can I get notified about coming-soon products?",
      answer:
        "Open the coming-soon product and complete its notification form when one is available.",
    },
    {
      question: "How can I contact ORVIX?",
      answer:
        "You can contact ORVIX through our official Instagram account. Include your order number when asking about an existing order.",
    },
  ],
  ar: [
    {
      question: "كيف يمكنني إنشاء طلب؟",
      answer:
        "افتح منتجًا متاحًا، واختر الخيارات والكمية المناسبة، ثم أضفه إلى السلة وأكمل بيانات إتمام الطلب.",
    },
    {
      question: "كيف أتتبّع طلبي؟",
      answer:
        "افتح صفحة تتبّع الطلب، ثم أدخل رقم الطلب ورقم الهاتف المستخدم أثناء الشراء لتظهر حالته الحالية فورًا.",
    },
    {
      question: "أين أجد رقم طلبي؟",
      answer:
        "يظهر رقم الطلب في صفحة التأكيد بعد إتمام الشراء، ويُرسل أيضًا إلى البريد الإلكتروني المستخدم في الطلب.",
    },
    {
      question: "ما طريقة الدفع المتاحة؟",
      answer:
        "يتم الدفع عبر InstaPay عند وصول الطلب، ولا يلزم دفع أي مبلغ مقدمًا.",
    },
    {
      question: "كم تبلغ رسوم التوصيل؟",
      answer:
        "تعتمد رسوم التوصيل على المنطقة التي تختارها، وتُحسب تلقائيًا قبل تأكيد الطلب.",
    },
    {
      question: "هل يمكنني استخدام كود خصم؟",
      answer:
        "نعم. أدخل كود خصم ساريًا في ملخص الطلب، وسيظهر الخصم قبل إرسال الطلب.",
    },
    {
      question: "ماذا يحدث إذا نفد المنتج؟",
      answer:
        "يظل المنتج ظاهرًا، لكن الشراء يتوقف مؤقتًا حتى تتوفر كمية جديدة.",
    },
    {
      question: "كيف أعرف عند توفر منتج قريبًا؟",
      answer:
        "افتح صفحة المنتج القادم وأكمل نموذج التنبيه عندما يكون متاحًا.",
    },
    {
      question: "كيف أتواصل مع ORVIX؟",
      answer:
        "يمكنك التواصل معنا عبر حساب ORVIX الرسمي على Instagram. اذكر رقم طلبك إذا كان استفسارك عن طلب قائم.",
    },
  ],
} as const;

const copyByLanguage = {
  en: {
    mobileHeroEyebrow:
      "SMART FITNESS / EGYPT",
    mobileHeroTitle: "MOVE SMARTER.",
    mobileHeroTitleAccent: "LIVE BETTER.",
    mobileHeroDescription:
      "Everyday fitness technology, selected by ORVIX and built around the way you move.",
    mobileHeroShop: "Shop Now",
    mobileHeroTrack: "Track Order",
    mobileHeroDelivery: "Bosta delivery",
    mobileHeroPayment: "No advance payment",
    mobileHeroTracking: "Live order tracking",
    mobileHeroFeatured: "Featured",
    mobileHeroSelected: "ORVIX selected",
    collection: "ORVIX COLLECTION",
    products: "OUR PRODUCTS",
    productsSubtitle:
      "Explore our fitness technology and choose the product that fits your lifestyle.",
    loadingProducts: "Loading products...",
    couldNotLoadProducts:
      "Could not load products",
    tryAgain: "Try Again",
    noProducts: "No products available",
    noProductsDescription:
      "New ORVIX products will appear here soon.",
    discoverProduct:
      "Discover this ORVIX product and explore its features.",
    comingSoon: "Coming soon",
    stockCount: (count: number) =>
      `${count} in stock`,
    comingSoonHelp:
      "Open the product page to view launch information and notification options.",
    unavailableHelp:
      "Purchasing is currently disabled until stock becomes available.",
    aboutEyebrow: "ABOUT ORVIX",
    aboutTitle:
      "Fitness technology made simple.",
    aboutDescription:
      "ORVIX is an Egyptian technology brand focused on modern fitness and health-tracking products. We provide carefully selected devices with a simple ordering experience and reliable customer support.",
    exploreProducts: "Explore Our Products",
    alreadyOrdered: "Already placed an order?",
    trackTitle: "Track your ORVIX order",
    trackDescription:
      "Enter your order number and phone number to view the latest status of your order.",
    trackButton: "Track Your Order",
    beFirst: "Be first to know.",
    garminDescription:
      "Join the notification list and we will contact you when Garmin CIRQA becomes available.",
    notify: "Notify Me When Available",
    helpEyebrow: "NEED HELP?",
    faqTitle: "Frequently Asked Questions",
    faqSubtitle:
      "Everything you need to know about ordering, delivery, tracking and products.",
    contactEyebrow: "CONTACT US",
    contactTitle: "We are here to help.",
    contactDescription:
      "Contact ORVIX for product questions, order assistance or general support. Include your order number when asking about an existing order.",
    instagramButton: "Message Us on Instagram",
    trackAnOrder: "Track an Order",
    officialAccount: "Official Account",
    safetyNote:
      "For your safety, only communicate with ORVIX through our official website and official social media account.",
    orderSupport: "Order support",
    orderSupportDescription:
      "Send us your order number and the phone number used during checkout so we can assist you faster.",
    rights: "All rights reserved.",
    productsNav: "Products",
    aboutNav: "About Us",
    faqNav: "FAQ",
    contactNav: "Contact Us",
    trackNav: "Track Order",
    garminNotifications: "Garmin Notifications",
    arrow: "→",
  },
  ar: {
    mobileHeroEyebrow:
      "لياقة ذكية / مصر",
    mobileHeroTitle: "تحرّك بذكاء.",
    mobileHeroTitleAccent: "وعِش بشكل أفضل.",
    mobileHeroDescription:
      "تقنيات لياقة يومية تختارها ORVIX بعناية لتناسب حركتك وأسلوب حياتك.",
    mobileHeroShop: "تسوّق الآن",
    mobileHeroTrack: "تتبّع الطلب",
    mobileHeroDelivery: "توصيل مع بوسطة",
    mobileHeroPayment: "بدون دفع مقدم",
    mobileHeroTracking: "تتبّع مباشر للطلب",
    mobileHeroFeatured: "المنتج المميز",
    mobileHeroSelected: "مختار من ORVIX",
    collection: "مجموعة ORVIX",
    products: "منتجاتنا",
    productsSubtitle:
      "اكتشف تقنيات اللياقة التي نقدمها واختر المنتج الأنسب لأسلوب حياتك.",
    loadingProducts: "جارٍ تحميل المنتجات...",
    couldNotLoadProducts:
      "تعذر تحميل المنتجات",
    tryAgain: "حاول مرة أخرى",
    noProducts: "لا توجد منتجات متاحة",
    noProductsDescription:
      "ستظهر منتجات ORVIX الجديدة هنا قريبًا.",
    discoverProduct:
      "اكتشف هذا المنتج من ORVIX وتعرّف على مزاياه.",
    comingSoon: "قريبًا",
    stockCount: (count: number) =>
      `${count.toLocaleString("ar-EG")} متوفر`,
    comingSoonHelp:
      "افتح صفحة المنتج لمعرفة تفاصيل الإطلاق وخيارات التنبيه.",
    unavailableHelp:
      "الشراء متوقف مؤقتًا حتى يتوفر المنتج من جديد.",
    aboutEyebrow: "عن ORVIX",
    aboutTitle: "تقنيات لياقة أكثر بساطة.",
    aboutDescription:
      "ORVIX علامة تكنولوجية مصرية تركّز على منتجات اللياقة الحديثة وتتبع الصحة. نوفر أجهزة مختارة بعناية، وتجربة طلب سهلة، ودعمًا موثوقًا للعملاء.",
    exploreProducts: "اكتشف منتجاتنا",
    alreadyOrdered: "أنشأت طلبًا بالفعل؟",
    trackTitle: "تتبّع طلبك من ORVIX",
    trackDescription:
      "أدخل رقم الطلب ورقم الهاتف لمعرفة أحدث حالة لطلبك.",
    trackButton: "تتبّع طلبك",
    beFirst: "كن أول من يعرف.",
    garminDescription:
      "انضم إلى قائمة التنبيهات وسنتواصل معك عند توفر Garmin CIRQA.",
    notify: "نبّهني عند التوفر",
    helpEyebrow: "تحتاج إلى مساعدة؟",
    faqTitle: "الأسئلة الشائعة",
    faqSubtitle:
      "كل ما تحتاج إلى معرفته عن الطلب والتوصيل والتتبّع والمنتجات.",
    contactEyebrow: "تواصل معنا",
    contactTitle: "نحن هنا لمساعدتك.",
    contactDescription:
      "تواصل مع ORVIX للاستفسار عن المنتجات أو الطلبات أو للحصول على الدعم. اذكر رقم طلبك عند السؤال عن طلب قائم.",
    instagramButton: "راسلنا على Instagram",
    trackAnOrder: "تتبّع طلبًا",
    officialAccount: "الحساب الرسمي",
    safetyNote:
      "لسلامتك، تواصل مع ORVIX فقط عبر موقعنا الرسمي وحسابنا الرسمي على وسائل التواصل.",
    orderSupport: "دعم الطلبات",
    orderSupportDescription:
      "أرسل لنا رقم الطلب ورقم الهاتف المستخدم عند الشراء حتى نساعدك بسرعة أكبر.",
    rights: "جميع الحقوق محفوظة.",
    productsNav: "المنتجات",
    aboutNav: "من نحن",
    faqNav: "الأسئلة الشائعة",
    contactNav: "تواصل معنا",
    trackNav: "تتبّع الطلب",
    garminNotifications: "تنبيهات Garmin",
    arrow: "←",
  },
} as const;

function formatPrice(
  price: number,
  language: Language
) {
  if (price <= 0) {
    return language === "ar"
      ? "السعر قريبًا"
      : "Price coming soon";
  }

  return `${price.toLocaleString(
    language === "ar" ? "ar-EG" : "en-GB"
  )} ${language === "ar" ? "ج.م" : "EGP"}`;
}

function getProductHref(product: Product) {
  return `/products/${encodeURIComponent(
    product.slug
  )}`;
}

function getStatusLabel(
  product: Product,
  language: Language
) {
  if (
    product.status === "available" &&
    product.stockQuantity <= 0
  ) {
    return language === "ar"
      ? "غير متوفر"
      : "Out of stock";
  }

  if (product.status === "available") {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return language === "ar"
        ? `متبقي ${product.stockQuantity.toLocaleString(
            "ar-EG"
          )} فقط`
        : `Only ${product.stockQuantity} left`;
    }

    return language === "ar"
      ? "متوفر الآن"
      : "Available now";
  }

  if (product.status === "coming_soon") {
    return language === "ar"
      ? "قريبًا"
      : "Coming soon";
  }

  if (
    product.status === "out_of_stock"
  ) {
    return language === "ar"
      ? "غير متوفر"
      : "Out of stock";
  }

  return language === "ar" ? "مخفي" : "Hidden";
}

function getStatusClasses(
  product: Product
) {
  if (
    product.status === "available" &&
    product.stockQuantity > 0
  ) {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return "text-orange-300";
    }

    return "text-green-400";
  }

  if (product.status === "coming_soon") {
    return "text-yellow-300";
  }

  return "text-red-300";
}

function getBadgeClasses(
  product: Product
) {
  if (
    product.status === "available" &&
    product.stockQuantity > 0
  ) {
    if (
      product.stockQuantity <=
      product.lowStockLimit
    ) {
      return "border-orange-500/20 bg-orange-500/90 text-black";
    }

    return "border-green-500/20 bg-green-500/90 text-black";
  }

  if (product.status === "coming_soon") {
    return "border-yellow-500/20 bg-yellow-400 text-black";
  }

  return "border-red-500/20 bg-red-500 text-white";
}

function getButtonText(
  product: Product,
  language: Language
) {
  if (product.status === "coming_soon") {
    if (product.slug === "garmin-cirqa") {
      return language === "ar"
        ? "نبّهني عند التوفر"
        : "Notify Me When Available";
    }

    return language === "ar"
      ? "شاهد المنتج القادم"
      : "View Coming Soon Product";
  }

  if (
    product.status === "out_of_stock" ||
    product.stockQuantity <= 0 ||
    !product.allowPurchase
  ) {
    return language === "ar"
      ? "عرض المنتج"
      : "View Product";
  }

  return language === "ar"
    ? "عرض المنتج"
    : "View Product";
}

function getButtonClasses(
  product: Product
) {
  const canPurchase =
    product.status === "available" &&
    product.stockQuantity > 0 &&
    product.allowPurchase;

  if (canPurchase) {
    return "bg-white text-black hover:bg-gray-200";
  }

  if (product.status === "coming_soon") {
    return "border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 hover:bg-yellow-500/20";
  }

  return "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10";
}

export default function Home() {
  const { language, isArabic } =
    useLanguage();
  const reduceMotion = useReducedMotion();
  const copy = copyByLanguage[language];
  const benefits =
    benefitsByLanguage[language];
  const frequentlyAskedQuestions =
    faqsByLanguage[language];

  const [products, setProducts] =
    useState<Product[]>([]);

  const [productsLoading, setProductsLoading] =
    useState(true);

  const [productsError, setProductsError] =
    useState("");

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");

    try {
      const response = await fetch(
        "/api/products?homepage=true",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load products."
        );
      }

      setProducts(
        Array.isArray(result.products)
          ? result.products
          : []
      );
    } catch (error) {
      setProductsError(
        error instanceof Error
          ? error.message
          : "Could not load products."
      );
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    const animationFrame =
      window.requestAnimationFrame(() => {
        void loadProducts();
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, []);

  const firstProduct = useMemo(
    () => products[0] || null,
    [products]
  );

  const mobileFeaturedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.status === "available" &&
          product.stockQuantity > 0 &&
          product.allowPurchase
      ) ||
      firstProduct,
    [firstProduct, products]
  );

  const garminProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.slug === "garmin-cirqa"
      ) || null,
    [products]
  );

  const mobileHeroHref = mobileFeaturedProduct
    ? getProductHref(mobileFeaturedProduct)
    : "/products/google-fitbit-air";

  const mobileHeroImage =
    mobileFeaturedProduct?.image || "/black.png";

  const mobileHeroName =
    mobileFeaturedProduct?.name ||
    "Google Fitbit Air";

  const mobileTrustItems = [
    {
      label: copy.mobileHeroDelivery,
      dot: "bg-blue-400",
    },
    {
      label: copy.mobileHeroPayment,
      dot: "bg-emerald-400",
    },
    {
      label: copy.mobileHeroTracking,
      dot: "bg-violet-400",
    },
  ];

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="relative min-h-screen bg-[#070707] text-white"
    >
      <Navbar />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[72px] h-[720px] overflow-hidden"
      >
        <div className="orvix-ambient-grid absolute inset-0" />

        <motion.div
          className="absolute left-1/2 top-12 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[110px] sm:h-[540px] sm:w-[540px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.12, 1],
                  opacity: [0.45, 0.75, 0.45],
                }
          }
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Mobile storefront hero — intentionally hidden on laptop and desktop. */}
      <section
        aria-labelledby="mobile-storefront-title"
        className="relative overflow-hidden px-4 pb-10 pt-7 md:hidden"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-32 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.12, 1],
                  opacity: [0.45, 0.75, 0.45],
                }
          }
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          {...enterMotion(reduceMotion, 0.04, 18)}
          className="relative mx-auto max-w-md"
        >
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,0.85)]" />
              {copy.mobileHeroEyebrow}
            </span>
          </div>

          <h1
            id="mobile-storefront-title"
            className="mt-6 text-center text-[clamp(2.7rem,13vw,4.2rem)] font-black leading-[0.91] tracking-[-0.055em]"
          >
            {copy.mobileHeroTitle}
            <span className="mt-2 block text-white/40">
              {copy.mobileHeroTitleAccent}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-sm text-center text-[15px] leading-6 text-white/55">
            {copy.mobileHeroDescription}
          </p>

          <motion.div
            {...enterMotion(reduceMotion, 0.12, 24)}
            className="relative mt-7 overflow-hidden rounded-[34px] border border-white/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
          >
            <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-3">
              <span className="rounded-full bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                {copy.mobileHeroFeatured}
              </span>

              {mobileFeaturedProduct && (
                <span
                  className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wider ${getBadgeClasses(
                    mobileFeaturedProduct
                  )}`}
                >
                  {getStatusLabel(
                    mobileFeaturedProduct,
                    language
                  )}
                </span>
              )}
            </div>

            <motion.div
              className="flex aspect-[1.2/1] items-center justify-center p-7 pt-11"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      y: [0, -7, 0],
                    }
              }
              transition={{
                duration: 4.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Image
                src={mobileHeroImage}
                alt={mobileHeroName}
                width={620}
                height={620}
                sizes="(max-width: 767px) calc(100vw - 60px), 1px"
                className="h-full w-full object-contain"
              />
            </motion.div>

            <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 rounded-2xl bg-black/90 px-4 py-3 text-white backdrop-blur-lg">
              <div className="min-w-0">
                <p className="truncate text-xs font-black">
                  {mobileHeroName}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {copy.mobileHeroSelected}
                </p>
              </div>

              {mobileFeaturedProduct && (
                <strong className="shrink-0 text-xs">
                  {formatPrice(
                    mobileFeaturedProduct.price,
                    language
                  )}
                </strong>
              )}
            </div>
          </motion.div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href={mobileHeroHref}
              className="orvix-premium-button flex min-h-14 items-center justify-center rounded-2xl bg-white px-4 text-center text-sm font-black text-black"
            >
              {copy.mobileHeroShop}
            </Link>

            <Link
              href="/track-order"
              className="flex min-h-14 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] px-4 text-center text-sm font-black text-white transition active:scale-[0.98]"
            >
              {copy.mobileHeroTrack}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {mobileTrustItems.map((item) => (
              <div
                key={item.label}
                className="flex min-h-[68px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] px-2 py-3 text-center"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${item.dot}`}
                />
                <span className="mt-2 text-[10px] font-bold leading-[1.35] text-white/55">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Products */}
      <section
        id="products"
        className="scroll-mt-24 px-4 pb-16 pt-8 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            {...enterMotion(
              reduceMotion,
              0.04,
              20
            )}
            className="relative text-center"
          >
            <p className="text-sm uppercase tracking-[0.45em] text-gray-500">
              {copy.collection}
            </p>

            <h1 className="mt-5 hidden text-7xl font-black md:block">
              {copy.products}
            </h1>

            <h2 className="mt-5 text-4xl font-black sm:text-7xl md:hidden">
              {copy.products}
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
              {copy.productsSubtitle}
            </p>
          </motion.div>

          {productsLoading ? (
            <div className="mt-14 rounded-[36px] border border-white/10 bg-white/5 p-12 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

              <p className="mt-5 font-bold text-gray-400">
                {copy.loadingProducts}
              </p>
            </div>
          ) : productsError ? (
            <div className="mt-14 rounded-[36px] border border-red-500/20 bg-red-500/10 p-8 text-center">
              <h2 className="text-2xl font-black text-red-300">
                {copy.couldNotLoadProducts}
              </h2>

              <p className="mt-3 text-red-200/70">
                {language === "ar"
                  ? copy.couldNotLoadProducts
                  : productsError}
              </p>

              <button
                type="button"
                onClick={loadProducts}
                className="mt-6 rounded-full bg-white px-7 py-4 font-black text-black"
              >
                {copy.tryAgain}
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="mt-14 rounded-[36px] border border-white/10 bg-white/5 p-12 text-center">
              <h2 className="text-2xl font-black">
                {copy.noProducts}
              </h2>

              <p className="mt-3 text-gray-400">
                {copy.noProductsDescription}
              </p>
            </div>
          ) : (
            <div className="relative mt-10 grid gap-6 sm:mt-14 sm:gap-8 lg:grid-cols-2">
              {products.map(
                (product, index) => {
                  const productHref =
                    getProductHref(product);

                  return (
                    <motion.article
                      key={product.id}
                      {...enterMotion(
                        reduceMotion,
                        index * 0.08,
                        30
                      )}
                      className="orvix-card-lift group overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-4 sm:rounded-[40px] sm:p-7"
                    >
                      <Link
                        href={productHref}
                        className="block"
                      >
                        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[26px] bg-white p-4 sm:rounded-[32px] sm:p-6">
                          <Image
                            src={
                              product.image ||
                              "/black.png"
                            }
                            alt={product.name}
                            width={700}
                            height={700}
                            priority={index < 2}
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-105"
                          />

                          <span
                            className={`absolute right-4 top-4 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${getBadgeClasses(
                              product
                            )}`}
                          >
                            {getStatusLabel(
                              product,
                              language
                            )}
                          </span>
                        </div>
                      </Link>

                      <div className="px-2 pb-2 pt-7">
                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <p
                              className={`text-sm font-black uppercase tracking-[0.3em] ${getStatusClasses(
                                product
                              )}`}
                            >
                              {getStatusLabel(
                                product,
                                language
                              )}
                            </p>

                            <Link
                              href={
                                productHref
                              }
                              className="block"
                            >
                              <h2 className="mt-3 text-2xl font-black transition group-hover:text-gray-200 sm:text-4xl">
                                {
                                  product.name
                                }
                              </h2>
                            </Link>
                          </div>

                          <span className="text-3xl transition group-hover:translate-x-1">
                            {copy.arrow}
                          </span>
                        </div>

                        <p className="mt-5 min-h-[84px] leading-7 text-gray-400">
                          {language === "ar"
                            ? copy.discoverProduct
                            : product.shortDescription ||
                              product.description ||
                              copy.discoverProduct}
                        </p>

                        <div className="mt-7">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <strong className="block text-xl">
                              {product.status ===
                              "coming_soon"
                                ? product.price > 0
                                  ? formatPrice(
                                      product.price,
                                      language
                                    )
                                  : copy.comingSoon
                                : formatPrice(
                                    product.price,
                                    language
                                  )}
                            </strong>

                            {product.status ===
                              "available" &&
                              product.stockQuantity >
                                0 && (
                                <span className="text-sm font-bold text-gray-500">
                                  {copy.stockCount(
                                    product.stockQuantity
                                  )}
                                </span>
                              )}
                          </div>

                          <Link
                            href={productHref}
                            className={`orvix-premium-button mt-5 flex w-full items-center justify-center rounded-full px-6 py-4 text-center font-black transition ${getButtonClasses(
                              product
                            )}`}
                          >
                            {getButtonText(
                              product,
                              language
                            )}
                          </Link>

                          {product.status ===
                            "coming_soon" && (
                            <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                              {copy.comingSoonHelp}
                            </p>
                          )}

                          {(product.status ===
                            "out_of_stock" ||
                            product.stockQuantity <=
                              0) &&
                            product.status !==
                              "coming_soon" && (
                              <p className="mt-3 text-center text-xs leading-5 text-red-300/70">
                                {copy.unavailableHelp}
                              </p>
                            )}
                        </div>
                      </div>
                    </motion.article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="scroll-mt-24 border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <motion.div
              {...revealMotion(
                reduceMotion,
                0,
                28
              )}
            >
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                {copy.aboutEyebrow}
              </p>

              <h2 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">
                {copy.aboutTitle}
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
                {copy.aboutDescription}
              </p>

              <Link
                href={
                  firstProduct
                    ? getProductHref(
                        firstProduct
                      )
                    : "/#products"
                }
                className="orvix-premium-button mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
              >
                {copy.exploreProducts}
              </Link>
            </motion.div>

            <div className="grid gap-4">
              {benefits.map((benefit, index) => (
                <motion.article
                  key={benefit.number}
                  {...revealMotion(
                    reduceMotion,
                    index * 0.08,
                    24
                  )}
                  className="orvix-card-lift rounded-[28px] border border-white/10 bg-black/30 p-6 sm:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span className="text-sm font-black tracking-[0.25em] text-gray-600">
                      {benefit.number}
                    </span>

                    <div>
                      <h3 className="text-2xl font-black">
                        {benefit.title}
                      </h3>

                      <p className="mt-3 leading-7 text-gray-400">
                        {
                          benefit.description
                        }
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Track Order */}
      <section className="px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            {...revealMotion(
              reduceMotion,
              0,
              26
            )}
            className="overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-7 text-center sm:p-12"
          >
            <p className="text-sm uppercase tracking-[0.35em] text-gray-500">
              {copy.alreadyOrdered}
            </p>

            <h2 className="mt-4 text-3xl font-black sm:text-5xl">
              {copy.trackTitle}
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-400">
              {copy.trackDescription}
            </p>

            <Link
              href="/track-order"
              className="orvix-premium-button mx-auto mt-8 flex w-full max-w-sm items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-black text-black transition hover:bg-gray-200"
            >
              {copy.trackButton}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Garmin CTA */}
      {garminProduct &&
        garminProduct.status ===
          "coming_soon" && (
          <section className="px-4 pb-20 sm:px-6 sm:pb-24">
            <div className="mx-auto max-w-7xl">
              <motion.div
                {...revealMotion(
                  reduceMotion,
                  0,
                  30
                )}
                className="grid overflow-hidden rounded-[36px] border border-white/10 bg-[#111111] lg:grid-cols-[0.8fr_1.2fr]"
              >
                <motion.div
                  className="flex items-center justify-center bg-white p-6 sm:p-10"
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: [0, -7, 0],
                        }
                  }
                  transition={{
                    duration: 5.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Image
                    src={
                      garminProduct.image ||
                      "/black.jpeg"
                    }
                    alt={garminProduct.name}
                    width={700}
                    height={700}
                    className="h-full w-full object-contain"
                  />
                </motion.div>

                <div className="flex flex-col justify-center p-7 sm:p-12">
                  <span className="w-fit rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-200">
                    {copy.comingSoon}
                  </span>

                  <h2 className="mt-5 text-4xl font-black sm:text-6xl">
                    {copy.beFirst}
                  </h2>

                  <p className="mt-5 max-w-xl text-lg leading-8 text-gray-400">
                    {language === "ar"
                      ? copy.garminDescription
                      : garminProduct.description ||
                        copy.garminDescription}
                  </p>

                  <Link
                    href={getProductHref(
                      garminProduct
                    )}
                    className="orvix-premium-button mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-8 py-5 text-center text-lg font-black text-black transition hover:bg-gray-200 sm:w-fit"
                  >
                    {copy.notify}
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        )}

      {/* FAQ */}
      <section
        id="faq"
        className="scroll-mt-24 border-y border-white/10 bg-white/[0.03] px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-4xl">
          <motion.div
            {...revealMotion(
              reduceMotion,
              0,
              24
            )}
            className="text-center"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
              {copy.helpEyebrow}
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              {copy.faqTitle}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-400">
              {copy.faqSubtitle}
            </p>
          </motion.div>

          <div className="mt-12 space-y-4">
            {frequentlyAskedQuestions.map(
              (item, index) => (
                <motion.details
                  key={`${language}-${item.question}`}
                  {...revealMotion(
                    reduceMotion,
                    index * 0.035,
                    18
                  )}
                  className="group rounded-[24px] border border-white/10 bg-black/30 p-5 transition-colors open:border-white/25 sm:p-6"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-black">
                    <span>
                      {index + 1}.{" "}
                      {item.question}
                    </span>

                    <span className="text-2xl text-gray-500 transition group-open:rotate-45 group-open:text-white">
                      +
                    </span>
                  </summary>

                  <p className="mt-5 border-t border-white/10 pt-5 leading-7 text-gray-400">
                    {item.answer}
                  </p>
                </motion.details>
              )
            )}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <motion.div
            {...revealMotion(
              reduceMotion,
              0,
              28
            )}
            className="overflow-hidden rounded-[40px] border border-white/10 bg-white/5"
          >
            <div className="grid lg:grid-cols-2">
              <div className="p-7 sm:p-12">
                <p className="text-sm uppercase tracking-[0.4em] text-gray-500">
                  {copy.contactEyebrow}
                </p>

                <h2 className="mt-5 text-4xl font-black sm:text-6xl">
                  {copy.contactTitle}
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
                  {copy.contactDescription}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://www.instagram.com/orvix_tech/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="orvix-premium-button inline-flex items-center justify-center rounded-full bg-white px-7 py-4 font-black text-black transition hover:bg-gray-200"
                  >
                    {copy.instagramButton}
                  </a>

                  <Link
                    href="/track-order"
                    className="orvix-premium-button inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black transition hover:bg-white/10"
                  >
                    {copy.trackAnOrder}
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/30 p-7 sm:p-12 lg:border-l lg:border-t-0">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-500">
                  {copy.officialAccount}
                </p>

                <a
                  href="https://www.instagram.com/orvix_tech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 block break-words text-3xl font-black transition hover:text-gray-300"
                >
                  @orvix_tech
                </a>

                <p className="mt-5 leading-7 text-gray-400">
                  {copy.safetyNote}
                </p>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-bold text-gray-300">
                    {copy.orderSupport}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {copy.orderSupportDescription}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center lg:flex-row lg:text-start">
          <div>
            <p className="font-black tracking-[0.3em]">
              ORVIX
            </p>

            <p className="mt-2 text-sm text-gray-600">
              © 2026 ORVIX. {copy.rights}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-semibold text-gray-500">
            <Link
              href="/#products"
              className="transition hover:text-white"
            >
              {copy.productsNav}
            </Link>

            <Link
              href="/#about"
              className="transition hover:text-white"
            >
              {copy.aboutNav}
            </Link>

            <Link
              href="/#faq"
              className="transition hover:text-white"
            >
              {copy.faqNav}
            </Link>

            <Link
              href="/#contact"
              className="transition hover:text-white"
            >
              {copy.contactNav}
            </Link>

            <Link
              href="/track-order"
              className="transition hover:text-white"
            >
              {copy.trackNav}
            </Link>

            {garminProduct && (
              <Link
                href={getProductHref(
                  garminProduct
                )}
                className="transition hover:text-white"
              >
                {copy.garminNotifications}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
