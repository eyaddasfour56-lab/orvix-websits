import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
import CommerceExperienceV3 from "@/components/CommerceExperienceV3";
import CustomerAccountBridge from "@/components/CustomerAccountBridge";
import StorePolicyLinks from "@/components/StorePolicyLinks";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { loadSiteSettings } from "@/lib/site-settings-server";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const BRAND_VERSION = "orvix-20260820-business-v3";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSiteSettings();
  const iconUrl = `${settings.faviconUrl}${settings.faviconUrl.includes("?") ? "&" : "?"}v=${BRAND_VERSION}`;

  return {
    metadataBase: new URL(settings.siteUrl),
    title: { default: settings.seoTitle, template: `%s | ${settings.shortName}` },
    applicationName: settings.brandName,
    description: settings.seoDescription,
    keywords: settings.seoKeywords,
    alternates: { canonical: "/" },
    authors: [{ name: settings.brandName, url: settings.siteUrl }],
    creator: settings.brandName,
    publisher: settings.brandName,
    category: "shopping",
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { address: false, email: false, telephone: false },
    openGraph: {
      type: "website",
      locale: "en_EG",
      alternateLocale: "ar_EG",
      url: settings.siteUrl,
      siteName: settings.brandName,
      title: settings.seoTitle,
      description: settings.seoDescription,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: settings.seoTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seoTitle,
      description: settings.seoDescription,
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    manifest: `/manifest.webmanifest?v=${BRAND_VERSION}`,
    icons: {
      icon: [{ url: iconUrl }],
      shortcut: [iconUrl],
      apple: [{ url: iconUrl }],
    },
    appleWebApp: { capable: true, title: settings.shortName, statusBarStyle: "black-translucent" },
    other: {
      "mobile-web-app-capable": "yes",
      "application-name": settings.brandName,
      "apple-mobile-web-app-title": settings.shortName,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#08090b",
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await loadSiteSettings();
  const brandStyles = {
    "--orvix-brand-primary": settings.primaryColor,
    "--orvix-brand-accent": settings.accentColor,
  } as CSSProperties;
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.brandName,
    url: settings.siteUrl,
    logo: new URL(settings.logoUrl, settings.siteUrl).toString(),
    sameAs: [settings.instagramUrl],
    contactPoint:
      settings.supportEmail || settings.supportPhone
        ? [{
            "@type": "ContactPoint",
            contactType: "customer service",
            email: settings.supportEmail || undefined,
            telephone: settings.supportPhone || undefined,
            areaServed: "EG",
            availableLanguage: ["English", "Arabic"],
          }]
        : undefined,
  };

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={brandStyles}>
        <Script id="orvix-language-bootstrap" strategy="beforeInteractive">
          {languageBootstrapScript}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replaceAll("<", "\\u003c") }}
        />
        <SiteSettingsProvider settings={settings}>
          <LanguageProvider>
          <Suspense fallback={null}><SiteAnalytics /></Suspense>
          <CustomerAccountBridge />
          <CommerceCartAnalytics />
          <CommerceExperienceV3 />
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
          <StorePolicyLinks />
          <CustomerServiceLink />
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
