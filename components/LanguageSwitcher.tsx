"use client";

import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { language, setLanguage } =
    useLanguage();

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full border border-white/15 bg-white/5 p-1 ${className}`}
      role="group"
      aria-label={
        language === "ar"
          ? "اختيار لغة الموقع"
          : "Choose website language"
      }
    >
      <button
        type="button"
        lang="en"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-full px-3 py-2 text-xs font-black tracking-wide transition ${
          language === "en"
            ? "bg-white text-black shadow-sm"
            : "text-gray-400 hover:text-white"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        lang="ar"
        onClick={() => setLanguage("ar")}
        aria-pressed={language === "ar"}
        className={`rounded-full px-3 py-2 text-xs font-black transition ${
          language === "ar"
            ? "bg-white text-black shadow-sm"
            : "text-gray-400 hover:text-white"
        }`}
      >
        عربي
      </button>
    </div>
  );
}
