import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { LanguageProvider } from "@/components/LanguageProvider";
import PromoBanner from "@/components/PromoBanner";
import SiteAnalytics from "@/components/SiteAnalytics";
import ConversionMount from "@/components/ConversionMount";
import HomepageProductsUpgrade from "@/components/HomepageProductsUpgrade";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORVIX | Smart Fitness Technology",
  description:
    "Shop ORVIX smart fitness technology, manage your order and track delivery in Arabic or English.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: languageBootstrapScript,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <Suspense fallback={null}>
            <SiteAnalytics />
          </Suspense>

          <PromoBanner />
          <HomepageProductsUpgrade />
          <ConversionMount />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
