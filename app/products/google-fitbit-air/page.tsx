"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FormEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Navbar from "@/components/Navbar";
import {
  Language,
  useLanguage,
} from "@/components/LanguageProvider";

type ProductStatus =
  | "available"
  | "coming_soon"
  | "out_of_stock"
  | "hidden";

type ColourName =
  | "Black"
  | "Lavender"
  | "Berry";

type Product = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  status: ProductStatus;
  stockQuantity: number;
  lowStockLimit: number;
  allowWishlist: boolean;
  allowPurchase: boolean;
};

type CartItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  colour: ColourName;
  quantity: number;
};

type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
};

type Review = {
  id: string;
  name?: string;
  customer_name?: string;
  rating: number;
  comment?: string;
  review?: string;
  status?: string;
  created_at?: string;
};

type TechCategory = {
  title: string;
  icon: string;
  description?: string;
  items: string[];
};

const colours: {
  name: ColourName;
  value: string;
  className: string;
}[] = [
  {
    name: "Black",
    value: "black",
    className: "bg-[#111111]",
  },
  {
    name: "Lavender",
    value: "lavender",
    className: "bg-[#b7a7d8]",
  },
  {
    name: "Berry",
    value: "berry",
    className: "bg-[#8c3157]",
  },
];

const colourImages: Record<
  ColourName,
  string[]
> = {
  Black: ["/black.png"],
  Lavender: ["/lavender.jpeg"],
  Berry: ["/berry.jpeg"],
};

const featuresEn = [
  {
    number: "01",
    title: "Screen-free tracking",
    description:
      "Track your health and fitness without another distracting screen on your wrist.",
  },
  {
    number: "02",
    title: "Heart-rate monitoring",
    description:
      "Follow daily heart-rate information and better understand your activity.",
  },
  {
    number: "03",
    title: "Sleep tracking",
    description:
      "Review sleep duration and overnight health information through the connected app.",
  },
  {
    number: "04",
    title: "Up to 7-day battery",
    description:
      "Spend less time charging and more time tracking your routine.",
  },
  {
    number: "05",
    title: "Lightweight design",
    description:
      "Designed for comfortable everyday wear, workouts and sleep.",
  },
  {
    number: "06",
    title: "Health insights",
    description:
      "Track activity, SpO₂ and recovery trends through the connected app.",
  },
];

const techCategoriesEn: TechCategory[] = [
  {
    title: "Memory",
    icon: "◫",
    description:
      "Health information remains available between synchronisations.",
    items: [
      "Saves up to 7 days of detailed motion data",
      "Saves daily totals for the previous 30 days",
      "Stores heart-rate information at short intervals",
    ],
  },
  {
    title: "Battery & Power",
    icon: "ϟ",
    items: [
      "Battery life of up to 7 days",
      "Approximately 90 minutes charging time",
      "Quick-charging support",
      "Lithium-polymer battery",
      "USB-C charging cable included",
      "Bluetooth 5.0 connectivity",
    ],
  },
  {
    title: "Materials",
    icon: "◇",
    items: [
      "Lightweight tracker housing",
      "Flexible silicone wristband",
      "Designed for comfortable everyday wear",
      "Fibre-based recyclable packaging",
    ],
  },
  {
    title: "Sensors & Components",
    icon: "◎",
    items: [
      "Optical heart-rate monitor",
      "Three-axis accelerometer",
      "Gyroscope",
      "Red and infrared sensors",
      "Temperature sensor",
      "Ambient-light sensor",
      "Vibration motor",
    ],
  },
  {
    title: "Band Size",
    icon: "⌁",
    items: [
      "One-size adjustable wristband",
      "Small wrist size: approximately 130–175 mm",
      "Large wrist size: approximately 165–210 mm",
      "Flexible silicone band included",
    ],
  },
  {
    title: "Water Resistance",
    icon: "≈",
    items: [
      "Water-resistant up to 50 metres",
      "Suitable for everyday use",
      "Dry the tracker before wearing it again",
      "Not intended for deep-water activities",
    ],
  },
  {
    title: "Heart Rate",
    icon: "♥",
    items: [
      "Continuous optical heart-rate tracking",
      "Accuracy may vary with movement and placement",
      "Results may vary by physiology and environment",
      "Designed for general wellness information",
    ],
  },
  {
    title: "Care",
    icon: "✦",
    items: [
      "Clean the band gently after exercise",
      "Allow your skin to breathe regularly",
      "Dry the tracker and band before wearing",
      "Avoid harsh cleaning chemicals",
    ],
  },
  {
    title: "Dimensions",
    icon: "↔",
    items: [
      "Length: approximately 34.9 mm",
      "Width: approximately 17 mm",
      "Height: approximately 8.3 mm",
      "Compact screen-free tracker body",
    ],
  },
  {
    title: "Weight",
    icon: "●",
    items: [
      "Tracker without band: approximately 5.2 g",
      "Tracker with band: approximately 12 g",
      "Suitable for day and night wear",
    ],
  },
  {
    title: "Compatibility",
    icon: "⌘",
    items: [
      "Google Account required",
      "Compatible mobile application required",
      "Supports compatible Android devices",
      "Supports compatible iPhone devices",
      "Bluetooth Low Energy required",
      "Internet connection may be required",
    ],
  },
  {
    title: "Safety Information",
    icon: "!",
    items: [
      "Designed for general wellness use",
      "Not a replacement for professional medical advice",
      "Stop using it if irritation develops",
      "Read the safety documentation before use",
    ],
  },
  {
    title: "What’s in the Box",
    icon: "□",
    items: [
      "Google Fitbit Air tracker",
      "Wristband",
      "USB-C charging cable",
      "Quick-start guide",
      "Safety information",
    ],
  },
];

const featuresAr = [
  {
    number: "01",
    title: "تتبّع من دون شاشة",
    description:
      "تابع صحتك ونشاطك من دون شاشة إضافية تشتت انتباهك على معصمك.",
  },
  {
    number: "02",
    title: "مراقبة معدل ضربات القلب",
    description:
      "تابع بيانات معدل ضربات القلب اليومية وافهم نشاطك بشكل أفضل.",
  },
  {
    number: "03",
    title: "تتبّع النوم",
    description:
      "راجع مدة النوم وبيانات الصحة الليلية من خلال التطبيق المتصل.",
  },
  {
    number: "04",
    title: "بطارية حتى 7 أيام",
    description:
      "اقضِ وقتًا أقل في الشحن ووقتًا أطول في متابعة روتينك.",
  },
  {
    number: "05",
    title: "تصميم خفيف",
    description:
      "مصمم للارتداء المريح يوميًا وأثناء التمرين والنوم.",
  },
  {
    number: "06",
    title: "مؤشرات صحية",
    description:
      "تابع النشاط وSpO₂ ومؤشرات التعافي عبر التطبيق المتصل.",
  },
];

const techCategoriesAr: TechCategory[] = [
  {
    title: "الذاكرة",
    icon: "◫",
    description:
      "تظل البيانات الصحية متاحة بين عمليات المزامنة.",
    items: [
      "يحفظ حتى 7 أيام من بيانات الحركة التفصيلية",
      "يحفظ الإجماليات اليومية لآخر 30 يومًا",
      "يخزن بيانات معدل ضربات القلب على فترات قصيرة",
    ],
  },
  {
    title: "البطارية والطاقة",
    icon: "ϟ",
    items: [
      "عمر بطارية يصل إلى 7 أيام",
      "مدة شحن تقارب 90 دقيقة",
      "يدعم الشحن السريع",
      "بطارية ليثيوم بوليمر",
      "كابل شحن USB-C مرفق",
      "اتصال Bluetooth 5.0",
    ],
  },
  {
    title: "الخامات",
    icon: "◇",
    items: [
      "هيكل خفيف لجهاز التتبّع",
      "سوار سيليكون مرن",
      "مصمم للارتداء اليومي المريح",
      "عبوة ألياف قابلة لإعادة التدوير",
    ],
  },
  {
    title: "المستشعرات والمكونات",
    icon: "◎",
    items: [
      "مستشعر بصري لمعدل ضربات القلب",
      "مقياس تسارع ثلاثي المحاور",
      "جيروسكوب",
      "مستشعرات حمراء وتحت حمراء",
      "مستشعر حرارة",
      "مستشعر إضاءة محيطة",
      "محرك اهتزاز",
    ],
  },
  {
    title: "مقاس السوار",
    icon: "⌁",
    items: [
      "سوار قابل للتعديل بمقاس واحد",
      "المقاس الصغير: نحو 130–175 مم",
      "المقاس الكبير: نحو 165–210 مم",
      "سوار سيليكون مرن مرفق",
    ],
  },
  {
    title: "مقاومة الماء",
    icon: "≈",
    items: [
      "مقاوم للماء حتى عمق 50 مترًا",
      "مناسب للاستخدام اليومي",
      "جفف الجهاز قبل ارتدائه مرة أخرى",
      "غير مخصص لأنشطة المياه العميقة",
    ],
  },
  {
    title: "معدل ضربات القلب",
    icon: "♥",
    items: [
      "تتبّع بصري مستمر لمعدل ضربات القلب",
      "قد تختلف الدقة حسب الحركة وموضع الجهاز",
      "قد تختلف النتائج حسب الجسم والبيئة",
      "مصمم لتقديم معلومات عامة عن العافية",
    ],
  },
  {
    title: "العناية",
    icon: "✦",
    items: [
      "نظف السوار برفق بعد التمرين",
      "امنح بشرتك فرصة للتهوية بانتظام",
      "جفف الجهاز والسوار قبل الارتداء",
      "تجنب مواد التنظيف القاسية",
    ],
  },
  {
    title: "الأبعاد",
    icon: "↔",
    items: [
      "الطول: نحو 34.9 مم",
      "العرض: نحو 17 مم",
      "الارتفاع: نحو 8.3 مم",
      "هيكل صغير من دون شاشة",
    ],
  },
  {
    title: "الوزن",
    icon: "●",
    items: [
      "الجهاز من دون السوار: نحو 5.2 جم",
      "الجهاز مع السوار: نحو 12 جم",
      "مناسب للارتداء نهارًا وليلًا",
    ],
  },
  {
    title: "التوافق",
    icon: "⌘",
    items: [
      "يتطلب حساب Google",
      "يتطلب تطبيق هاتف متوافقًا",
      "يدعم أجهزة Android المتوافقة",
      "يدعم أجهزة iPhone المتوافقة",
      "يتطلب Bluetooth Low Energy",
      "قد يلزم الاتصال بالإنترنت",
    ],
  },
  {
    title: "معلومات السلامة",
    icon: "!",
    items: [
      "مصمم للاستخدام العام المتعلق بالعافية",
      "لا يغني عن الاستشارة الطبية المتخصصة",
      "توقف عن استخدامه إذا ظهر تهيج",
      "اقرأ تعليمات السلامة قبل الاستخدام",
    ],
  },
  {
    title: "محتويات العلبة",
    icon: "□",
    items: [
      "جهاز Google Fitbit Air",
      "سوار معصم",
      "كابل شحن USB-C",
      "دليل البدء السريع",
      "معلومات السلامة",
    ],
  },
];

const copyByLanguage = {
  en: {
    colourNames: {
      Black: "Black",
      Lavender: "Lavender",
      Berry: "Berry",
    },
    priceSoon: "Price coming soon",
    customer: "ORVIX Customer",
    loadApiError:
      "Google Fitbit Air could not be loaded.",
    loadError: "The product could not be loaded.",
    unavailableMessage:
      "This product is currently unavailable.",
    cartAdded: (
      name: string,
      colour: string
    ) => `${name} in ${colour} was added to your cart.`,
    removedWishlist:
      "Removed from your wishlist.",
    addedWishlist: "Added to your wishlist.",
    enterName: "Please enter your name.",
    longerReview: "Please write a longer review.",
    reviewError: "Review could not be submitted.",
    reviewSuccess:
      "Your review was submitted for approval.",
    loading: "Loading Google Fitbit Air...",
    unavailable: "Product unavailable",
    loadTitle: "We couldn’t load this product.",
    back: "← Back to products",
    onlyLeft: (count: number) =>
      `Only ${count} left`,
    availableNow: "Available now",
    outOfStock: "Out of stock",
    tracker: "Screen-free tracker",
    fallbackDescription:
      "A lightweight screen-free tracker designed to monitor daily activity, heart rate, sleep and recovery.",
    chooseColour: "Choose colour",
    quantity: "Quantity",
    piecesAvailable: (count: number) =>
      `${count} pieces available`,
    addToCart: "Add to cart",
    currentlyUnavailable: "Currently unavailable",
    removeWishlist: "Remove from wishlist",
    addWishlist: "Add to wishlist",
    overview: "Overview",
    specs: "Tech Specs",
    reviews: "Reviews",
    productDetails: "Product details",
    overviewTitle:
      "Fitness tracking without distractions.",
    overviewDescription:
      "Google Fitbit Air combines everyday health tracking with a lightweight screen-free design.",
    technicalSpecifications:
      "Technical specifications",
    specsTitle: "Everything, neatly organised.",
    customerReviews: "Customer reviews",
    shareExperience: "Share your experience.",
    yourName: "Your name",
    ratingLabel: (rating: number) =>
      `${rating} star rating`,
    yourReview: "Your review",
    submitting: "Submitting...",
    submitReview: "Submit review",
    loadingReviews: "Loading reviews...",
    noReviews: "No reviews yet.",
    previousImage: "Previous image",
    nextImage: "Next image",
  },
  ar: {
    colourNames: {
      Black: "أسود",
      Lavender: "لافندر",
      Berry: "توتي",
    },
    priceSoon: "السعر قريبًا",
    customer: "عميل ORVIX",
    loadApiError:
      "تعذر تحميل Google Fitbit Air.",
    loadError: "تعذر تحميل المنتج.",
    unavailableMessage:
      "هذا المنتج غير متاح حاليًا.",
    cartAdded: (
      name: string,
      colour: string
    ) => `تمت إضافة ${name} باللون ${colour} إلى السلة.`,
    removedWishlist:
      "تمت الإزالة من قائمة المفضلة.",
    addedWishlist:
      "تمت الإضافة إلى قائمة المفضلة.",
    enterName: "من فضلك أدخل اسمك.",
    longerReview:
      "من فضلك اكتب تقييمًا أطول.",
    reviewError: "تعذر إرسال التقييم.",
    reviewSuccess:
      "تم إرسال تقييمك للمراجعة.",
    loading: "جارٍ تحميل Google Fitbit Air...",
    unavailable: "المنتج غير متاح",
    loadTitle: "تعذر تحميل هذا المنتج.",
    back: "→ العودة إلى المنتجات",
    onlyLeft: (count: number) =>
      `متبقي ${count.toLocaleString("ar-EG")} فقط`,
    availableNow: "متوفر الآن",
    outOfStock: "غير متوفر",
    tracker: "جهاز تتبّع من دون شاشة",
    fallbackDescription:
      "جهاز خفيف من دون شاشة لمتابعة النشاط اليومي ومعدل ضربات القلب والنوم والتعافي.",
    chooseColour: "اختر اللون",
    quantity: "الكمية",
    piecesAvailable: (count: number) =>
      `${count.toLocaleString("ar-EG")} قطعة متوفرة`,
    addToCart: "أضف إلى السلة",
    currentlyUnavailable: "غير متاح حاليًا",
    removeWishlist: "إزالة من المفضلة",
    addWishlist: "أضف إلى المفضلة",
    overview: "نظرة عامة",
    specs: "المواصفات",
    reviews: "التقييمات",
    productDetails: "تفاصيل المنتج",
    overviewTitle: "تتبّع اللياقة من دون تشتيت.",
    overviewDescription:
      "يجمع Google Fitbit Air بين متابعة الصحة اليومية وتصميم خفيف من دون شاشة.",
    technicalSpecifications: "المواصفات التقنية",
    specsTitle: "كل التفاصيل مرتبة بوضوح.",
    customerReviews: "تقييمات العملاء",
    shareExperience: "شاركنا تجربتك.",
    yourName: "اسمك",
    ratingLabel: (rating: number) =>
      `تقييم ${rating} من 5 نجوم`,
    yourReview: "اكتب تقييمك",
    submitting: "جارٍ الإرسال...",
    submitReview: "إرسال التقييم",
    loadingReviews: "جارٍ تحميل التقييمات...",
    noReviews: "لا توجد تقييمات بعد.",
    previousImage: "الصورة السابقة",
    nextImage: "الصورة التالية",
  },
} as const;

function formatPrice(
  price: number,
  language: Language
) {
  if (!price || price <= 0) {
    return copyByLanguage[language].priceSoon;
  }

  return `${price.toLocaleString(
    language === "ar" ? "ar-EG" : "en-GB"
  )} ${language === "ar" ? "ج.م" : "EGP"}`;
}

function readStorage<T>(
  key: string,
  fallback: T
): T {
  try {
    const saved =
      window.localStorage.getItem(key);

    if (!saved) {
      return fallback;
    }

    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

function getReviewName(
  review: Review,
  language: Language
) {
  return (
    review.name ||
    review.customer_name ||
    copyByLanguage[language].customer
  );
}

function getReviewComment(review: Review) {
  return review.comment || review.review || "";
}

export default function GoogleFitbitAirPage() {
  const { language, isArabic } =
    useLanguage();
  const copy = copyByLanguage[language];
  const features =
    language === "ar" ? featuresAr : featuresEn;
  const techCategories =
    language === "ar"
      ? techCategoriesAr
      : techCategoriesEn;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [
    selectedColour,
    setSelectedColour,
  ] = useState<ColourName>("Black");

  const [quantity, setQuantity] =
    useState(1);

  const [
    activeImageIndex,
    setActiveImageIndex,
  ] = useState(0);

  const [touchStartX, setTouchStartX] =
    useState<number | null>(null);

  const [touchEndX, setTouchEndX] =
    useState<number | null>(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">(
      ""
    );

  const [
    isInWishlist,
    setIsInWishlist,
  ] = useState(false);

  const [
    activeSection,
    setActiveSection,
  ] = useState<
    "overview" | "specifications" | "reviews"
  >("overview");

  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [
    reviewsLoading,
    setReviewsLoading,
  ] = useState(true);

  const [reviewName, setReviewName] =
    useState("");

  const [
    reviewRating,
    setReviewRating,
  ] = useState(5);

  const [
    reviewComment,
    setReviewComment,
  ] = useState("");

  const [
    submittingReview,
    setSubmittingReview,
  ] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setPageError("");

      try {
        const response = await fetch(
          "/api/products?slug=google-fitbit-air",
          {
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.product
        ) {
          throw new Error(
            result.message ||
              "Google Fitbit Air could not be loaded."
          );
        }

        const loadedProduct: Product = {
          ...result.product,
          price: Number(
            result.product.price || 0
          ),
          stockQuantity: Number(
            result.product.stockQuantity || 0
          ),
          lowStockLimit: Number(
            result.product.lowStockLimit || 0
          ),
          allowWishlist: Boolean(
            result.product.allowWishlist
          ),
          allowPurchase: Boolean(
            result.product.allowPurchase
          ),
        };

        setProduct(loadedProduct);

        const wishlist =
          readStorage<WishlistItem[]>(
            "orvixWishlist",
            []
          );

        setIsInWishlist(
          wishlist.some(
            (item) =>
              item.id ===
                loadedProduct.id ||
              item.slug ===
                loadedProduct.slug
          )
        );
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "The product could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    }

    const animationFrame =
      window.requestAnimationFrame(() => {
        void loadProduct();
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, []);

  useEffect(() => {
    async function loadReviews() {
      setReviewsLoading(true);

      try {
        const response = await fetch(
          "/api/reviews?productSlug=google-fitbit-air",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          setReviews([]);
          return;
        }

        const result =
          await response.json();

        const reviewList =
          Array.isArray(result.reviews)
            ? result.reviews.filter(
                (review: Review) =>
                  !review.status ||
                  review.status ===
                    "approved"
              )
            : [];

        setReviews(reviewList);
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    }

    const animationFrame =
      window.requestAnimationFrame(() => {
        void loadReviews();
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, []);

  const productImages = useMemo(
    () => colourImages[selectedColour],
    [selectedColour]
  );

  const activeImage =
    productImages[activeImageIndex] ||
    productImages[0] ||
    "/black.png";

  const canPurchase = Boolean(
    product &&
      product.status === "available" &&
      product.stockQuantity > 0 &&
      product.allowPurchase
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum +
        Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  function showMessage(
    text: string,
    type: "success" | "error"
  ) {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4500);
  }

  function selectColour(
    colour: ColourName
  ) {
    setSelectedColour(colour);
    setActiveImageIndex(0);
  }

  function previousImage() {
    setActiveImageIndex((current) =>
      current === 0
        ? productImages.length - 1
        : current - 1
    );
  }

  function nextImage() {
    setActiveImageIndex((current) =>
      current ===
      productImages.length - 1
        ? 0
        : current + 1
    );
  }

  function handleTouchStart(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(null);

    setTouchStartX(
      event.targetTouches[0].clientX
    );
  }

  function handleTouchMove(
    event: TouchEvent<HTMLDivElement>
  ) {
    setTouchEndX(
      event.targetTouches[0].clientX
    );
  }

  function handleTouchEnd() {
    if (
      touchStartX === null ||
      touchEndX === null ||
      productImages.length <= 1
    ) {
      return;
    }

    const distance =
      touchStartX - touchEndX;

    if (distance > 50) {
      nextImage();
    } else if (distance < -50) {
      previousImage();
    }

    setTouchStartX(null);
    setTouchEndX(null);
  }

  function updateQuantity(value: number) {
    if (!product) {
      return;
    }

    setQuantity(
      Math.min(
        Math.max(value, 1),
        Math.max(
          product.stockQuantity,
          1
        )
      )
    );
  }

  function addToCart() {
    if (!product || !canPurchase) {
      showMessage(
        copy.unavailableMessage,
        "error"
      );
      return;
    }

    const cart =
      readStorage<CartItem[]>(
        "orvixCart",
        []
      );

    const existingIndex =
      cart.findIndex(
        (item) =>
          item.id === product.id &&
          item.colour ===
            selectedColour
      );

    if (existingIndex >= 0) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        image: activeImage,
        quantity: Math.min(
          Number(
            cart[existingIndex]
              .quantity || 1
          ) + quantity,
          product.stockQuantity
        ),
      };
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: activeImage,
        colour: selectedColour,
        quantity: Math.min(
          quantity,
          product.stockQuantity
        ),
      });
    }

    window.localStorage.setItem(
      "orvixCart",
      JSON.stringify(cart)
    );

    window.dispatchEvent(
      new Event("storage")
    );

    window.dispatchEvent(
      new CustomEvent(
        "orvix-cart-updated"
      )
    );

    showMessage(
      copy.cartAdded(
        product.name,
        copy.colourNames[selectedColour]
      ),
      "success"
    );
  }

  function toggleWishlist() {
    if (
      !product ||
      !product.allowWishlist
    ) {
      return;
    }

    const wishlist =
      readStorage<WishlistItem[]>(
        "orvixWishlist",
        []
      );

    const alreadyAdded =
      wishlist.some(
        (item) =>
          item.id === product.id ||
          item.slug === product.slug
      );

    const updatedWishlist =
      alreadyAdded
        ? wishlist.filter(
            (item) =>
              item.id !== product.id &&
              item.slug !== product.slug
          )
        : [
            ...wishlist,
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image: activeImage,
            },
          ];

    window.localStorage.setItem(
      "orvixWishlist",
      JSON.stringify(
        updatedWishlist
      )
    );

    window.dispatchEvent(
      new Event("storage")
    );

    window.dispatchEvent(
      new CustomEvent(
        "orvix-wishlist-updated"
      )
    );

    setIsInWishlist(!alreadyAdded);

    showMessage(
      alreadyAdded
        ? copy.removedWishlist
        : copy.addedWishlist,
      "success"
    );
  }

  async function submitReview(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!reviewName.trim()) {
      showMessage(
        copy.enterName,
        "error"
      );
      return;
    }

    if (
      reviewComment.trim().length < 5
    ) {
      showMessage(
        copy.longerReview,
        "error"
      );
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch(
        "/api/reviews",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productSlug:
              "google-fitbit-air",
            name: reviewName.trim(),
            rating: reviewRating,
            comment:
              reviewComment.trim(),
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
            copy.reviewError
        );
      }

      setReviewName("");
      setReviewRating(5);
      setReviewComment("");

      showMessage(
        copy.reviewSuccess,
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? language === "ar"
            ? copy.reviewError
            : error.message
          : copy.reviewError,
        "error"
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  function scrollToSection(
    section:
      | "overview"
      | "specifications"
      | "reviews"
  ) {
    setActiveSection(section);

    document
      .getElementById(section)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  if (loading) {
    return (
      <main
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-[#050505] text-white"
      >
        <Navbar />

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-white" />

            <p className="mt-5 text-sm font-semibold text-white/45">
              {copy.loading}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (pageError || !product) {
    return (
      <main
        lang={language}
        dir={isArabic ? "rtl" : "ltr"}
        className="min-h-screen bg-[#050505] text-white"
      >
        <Navbar />

        <section className="flex min-h-[80vh] items-center justify-center px-5">
          <div className="max-w-lg rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
              {copy.unavailable}
            </p>

            <h1 className="mt-4 text-3xl font-black">
              {copy.loadTitle}
            </h1>

            <p className="mt-4 leading-7 text-red-100/60">
              {language === "ar"
                ? copy.loadError
                : pageError}
            </p>

            <Link
              href="/#products"
              className="mt-7 inline-flex rounded-full bg-white px-7 py-4 font-black text-black"
            >
              {copy.back}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      lang={language}
      dir={isArabic ? "rtl" : "ltr"}
      className="min-h-screen bg-[#050505] pb-28 text-white lg:pb-0"
    >
      <Navbar />

      <section className="relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
        <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/#products"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/45 transition hover:text-white"
          >
            {copy.back}
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <div
                onTouchStart={
                  handleTouchStart
                }
                onTouchMove={
                  handleTouchMove
                }
                onTouchEnd={
                  handleTouchEnd
                }
                className="group relative touch-pan-y select-none overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-b from-white to-[#e9e9e9] p-5 shadow-2xl shadow-black/30 sm:p-10"
              >
                <Image
                  src={activeImage}
                  alt={`${product.name} ${selectedColour}`}
                  draggable={false}
                  width={900}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="aspect-square h-auto w-full object-contain transition duration-500 group-hover:scale-[1.02]"
                />

                {productImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={
                        previousImage
                      }
                      aria-label={copy.previousImage}
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black sm:left-5"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      aria-label={copy.nextImage}
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/75 text-2xl font-black sm:right-5"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {colours.map((colour) => {
                  const image =
                    colourImages[
                      colour.name
                    ][0];

                  return (
                    <button
                      key={colour.name}
                      type="button"
                      onClick={() =>
                        selectColour(
                          colour.name
                        )
                      }
                      className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-2 transition sm:h-24 sm:w-24 ${
                        selectedColour ===
                        colour.name
                          ? "border-white ring-2 ring-white/60"
                          : "border-white/10 opacity-50"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={
                          copy.colourNames[
                            colour.name
                          ]
                        }
                        width={160}
                        height={160}
                        className="h-full w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:sticky lg:top-28">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] ${
                    canPurchase
                      ? "border-green-400/20 bg-green-400/10 text-green-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300"
                  }`}
                >
                  {canPurchase
                    ? product.stockQuantity <=
                      product.lowStockLimit
                      ? copy.onlyLeft(
                          product.stockQuantity
                        )
                      : copy.availableNow
                    : copy.outOfStock}
                </span>

                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
                  {copy.tracker}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                {product.name}
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/55">
                {language === "ar"
                  ? copy.fallbackDescription
                  : product.shortDescription ||
                    copy.fallbackDescription}
              </p>

              <p className="mt-7 text-3xl font-black sm:text-4xl">
                {formatPrice(
                  product.price,
                  language
                )}
              </p>

              <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                    {copy.chooseColour}
                  </p>

                  <p className="font-black">
                    {
                      copy.colourNames[
                        selectedColour
                      ]
                    }
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {colours.map((colour) => {
                    const selected =
                      selectedColour ===
                      colour.name;

                    return (
                      <button
                        key={colour.value}
                        type="button"
                        onClick={() =>
                          selectColour(
                            colour.name
                          )
                        }
                        className={`rounded-2xl border p-3 transition sm:p-4 ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-black/30"
                        }`}
                      >
                        <span
                          className={`mx-auto block h-8 w-8 rounded-full border border-black/15 ${colour.className}`}
                        />

                        <span className="mt-3 block text-xs font-black sm:text-sm">
                          {
                            copy.colourNames[
                              colour.name
                            ]
                          }
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
                      {copy.quantity}
                    </p>

                    <p className="mt-2 text-sm text-white/45">
                      {copy.piecesAvailable(
                        product.stockQuantity
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          quantity - 1
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-black"
                    >
                      −
                    </button>

                    <span className="min-w-10 text-center text-lg font-black">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          quantity + 1
                        )
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {message && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
                    messageType ===
                    "success"
                      ? "border-green-400/20 bg-green-400/10 text-green-300"
                      : "border-red-400/20 bg-red-400/10 text-red-300"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="button"
                onClick={addToCart}
                disabled={!canPurchase}
                className="mt-5 w-full rounded-full bg-white px-7 py-5 font-black text-black disabled:opacity-35"
              >
                {canPurchase
                  ? copy.addToCart
                  : copy.currentlyUnavailable}
              </button>

              {product.allowWishlist && (
                <button
                  type="button"
                  onClick={toggleWishlist}
                  className="mt-3 w-full rounded-full border border-white/10 px-7 py-5 font-black"
                >
                  {isInWishlist
                    ? copy.removeWishlist
                    : copy.addWishlist}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[72px] z-30 border-y border-white/10 bg-[#080808]/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl rounded-full border border-white/10 bg-white/5 p-1.5">
          {[
            {
              key: "overview" as const,
              label: copy.overview,
            },
            {
              key:
                "specifications" as const,
              label: copy.specs,
            },
            {
              key: "reviews" as const,
              label: copy.reviews,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                scrollToSection(tab.key)
              }
              className={`flex-1 rounded-full px-4 py-3 text-xs font-black ${
                activeSection === tab.key
                  ? "bg-white text-black"
                  : "text-white/45"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section
        id="overview"
        className="scroll-mt-40 border-b border-white/10 px-4 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
            {copy.productDetails}
          </p>

          <h2 className="mt-5 max-w-4xl text-4xl font-black sm:text-6xl">
            {copy.overviewTitle}
          </h2>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/50">
            {language === "ar"
              ? copy.overviewDescription
              : product.description ||
                copy.overviewDescription}
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[30px] border border-white/10 bg-white/[0.035] p-7"
              >
                <p className="text-xs font-black text-white/25">
                  {feature.number}
                </p>

                <h3 className="mt-8 text-2xl font-black">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-white/45">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="specifications"
        className="scroll-mt-40 px-4 py-20 sm:px-6"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
              {copy.technicalSpecifications}
            </p>

            <h2 className="mt-5 text-4xl font-black sm:text-6xl">
              {copy.specsTitle}
            </h2>
          </div>

          <div className="mt-12 grid items-start gap-5 md:grid-cols-2">
            {techCategories.map(
              (category) => (
                <article
                  key={category.title}
                  className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl">
                      {category.icon}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">
                        {category.title}
                      </h3>

                      {category.description && (
                        <p className="mt-2 text-sm leading-6 text-white/40">
                          {
                            category.description
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {category.items.map(
                      (item) => (
                        <div
                          key={item}
                          className="flex gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4"
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />

                          <p className="text-sm leading-6 text-white/55">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <section
        id="reviews"
        className="scroll-mt-40 border-t border-white/10 px-4 py-20 sm:px-6"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.36em] text-white/30">
              {copy.customerReviews}
            </p>

            <h2 className="mt-5 text-4xl font-black">
              {copy.shareExperience}
            </h2>

            <form
              onSubmit={submitReview}
              className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.025] p-6"
            >
              <input
                value={reviewName}
                onChange={(event) =>
                  setReviewName(
                    event.target.value
                  )
                }
                placeholder={copy.yourName}
                className="w-full rounded-2xl border border-white/10 bg-black px-4 py-4"
              />

              <div className="mt-5 flex gap-2">
                {[1, 2, 3, 4, 5].map(
                  (rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setReviewRating(
                          rating
                        )
                      }
                      aria-label={copy.ratingLabel(
                        rating
                      )}
                      className={`text-3xl ${
                        rating <=
                        reviewRating
                          ? "text-yellow-300"
                          : "text-white/15"
                      }`}
                    >
                      ★
                    </button>
                  )
                )}
              </div>

              <textarea
                value={reviewComment}
                onChange={(event) =>
                  setReviewComment(
                    event.target.value
                  )
                }
                placeholder={copy.yourReview}
                rows={5}
                className="mt-5 w-full resize-none rounded-2xl border border-white/10 bg-black px-4 py-4"
              />

              <button
                type="submit"
                disabled={submittingReview}
                className="mt-5 w-full rounded-full bg-white px-6 py-4 font-black text-black"
              >
                {submittingReview
                  ? copy.submitting
                  : copy.submitReview}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-white/10 bg-white/[0.035] p-8">
              <p className="text-6xl font-black">
                {reviews.length > 0
                  ? averageRating.toFixed(1)
                  : "—"}
              </p>

              <p className="mt-2 text-yellow-300">
                ★★★★★
              </p>
            </div>

            {reviewsLoading ? (
              <div className="rounded-[30px] border border-white/10 p-8">
                {copy.loadingReviews}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-[30px] border border-white/10 p-8">
                {copy.noReviews}
              </div>
            ) : (
              reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[30px] border border-white/10 p-7"
                >
                  <h3 className="font-black">
                    {getReviewName(
                      review,
                      language
                    )}
                  </h3>

                  <p className="mt-2 text-yellow-300">
                    {"★".repeat(
                      Math.max(
                        1,
                        Math.min(
                          5,
                          Number(
                            review.rating || 5
                          )
                        )
                      )
                    )}
                  </p>

                  <p className="mt-5 text-white/55">
                    {getReviewComment(review)}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 p-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {product.name}
            </p>

            <p className="mt-1 text-xs text-white/45">
              {formatPrice(
                product.price,
                language
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!canPurchase}
            className="rounded-full bg-white px-6 py-4 text-sm font-black text-black disabled:opacity-40"
          >
            {copy.addToCart}
          </button>
        </div>
      </div>
    </main>
  );
}
