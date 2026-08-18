import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { LanguageProvider } from "@/components/LanguageProvider";
import PromoBanner from "@/components/PromoBanner";
import SiteAnalytics from "@/components/SiteAnalytics";
import ConversionMount from "@/components/ConversionMount";
import HomepageQuickOrder from "@/components/HomepageQuickOrder";
import CheckoutCompactPolish from "@/components/CheckoutCompactPolish";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import CustomerServiceLink from "@/components/CustomerServiceLink";
import CustomerAiTrigger from "@/components/CustomerAiTrigger";
import CustomerSupportModeGate from "@/components/CustomerSupportModeGate";
import CustomerOrderCancellation from "@/components/CustomerOrderCancellation";
import PreorderPurchaseBar from "@/components/PreorderPurchaseBar";
import CommerceCartAnalytics from "@/components/CommerceCartAnalytics";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const BRAND_VERSION = "orvix-20260818-orders-v2";

export const metadata: Metadata = {
  title: { default: "ORVIX", template: "%s | ORVIX" },
  applicationName: "ORVIX",
  description: "Shop ORVIX smart fitness technology, manage your order and contact ORVIX Customer Service.",
  manifest: `/manifest.webmanifest?v=${BRAND_VERSION}`,
  icons: {
    icon: [{ url: `/icon.svg?v=${BRAND_VERSION}`, type: "image/svg+xml" }],
    shortcut: [`/icon.svg?v=${BRAND_VERSION}`],
    apple: [{ url: `/icon.svg?v=${BRAND_VERSION}`, type: "image/svg+xml" }],
  },
  appleWebApp: { capable: true, title: "ORVIX", statusBarStyle: "black-translucent" },
  other: {
    "mobile-web-app-capable": "yes",
    "application-name": "ORVIX",
    "apple-mobile-web-app-title": "ORVIX",
  },
};

const languageBootstrapScript = `
(function () {
  try {
    var language = localStorage.getItem("orvixLanguage") || localStorage.getItem("orvixTrackingLanguage");
    var root = document.documentElement;
    var resolvedLanguage = language === "ar" ? "ar" : "en";
    root.lang = resolvedLanguage;
    root.dir = resolvedLanguage === "ar" ? "rtl" : "ltr";
    root.dataset.orvixLanguage = resolvedLanguage;
    if (resolvedLanguage === "ar") root.dataset.languagePending = "true";
  } catch (error) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <meta name="application-name" content="ORVIX" />
        <meta name="apple-mobile-web-app-title" content="ORVIX" />
        <link rel="icon" href={`/icon.svg?v=${BRAND_VERSION}`} type="image/svg+xml" />
        <link rel="shortcut icon" href={`/icon.svg?v=${BRAND_VERSION}`} type="image/svg+xml" />
        <script dangerouslySetInnerHTML={{ __html: languageBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <Suspense fallback={null}><SiteAnalytics /></Suspense>
          <CommerceCartAnalytics />
          <PromoBanner />
          <HomepageQuickOrder />
          <CheckoutCompactPolish />
          <PaymentMethodSelector />
          <ConversionMount />
          <CustomerAiTrigger />
          <CustomerSupportModeGate />
          <CustomerOrderCancellation />
          <PreorderPurchaseBar />
          {children}
          <CustomerServiceLink />
        </LanguageProvider>
      </body>
    </html>
  );
}
