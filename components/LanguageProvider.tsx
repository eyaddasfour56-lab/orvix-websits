"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";

export type Language = "en" | "ar";

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

export const LANGUAGE_STORAGE_KEY =
  "orvixLanguage";

const LEGACY_LANGUAGE_STORAGE_KEY =
  "orvixTrackingLanguage";

const LanguageContext =
  createContext<LanguageContextValue | null>(
    null
  );

function applyDocumentLanguage(
  language: Language
) {
  const root = document.documentElement;

  root.lang = language;
  root.dir = language === "ar" ? "rtl" : "ltr";
  root.dataset.orvixLanguage = language;
}

function subscribeToLanguage(
  onStoreChange: () => void
) {
  window.addEventListener(
    "orvix-language-changed",
    onStoreChange
  );

  return () => {
    window.removeEventListener(
      "orvix-language-changed",
      onStoreChange
    );
  };
}

function getLanguageSnapshot(): Language {
  return document.documentElement.dataset
    .orvixLanguage === "ar"
    ? "ar"
    : "en";
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      delete document.documentElement.dataset
        .languagePending;
    });
  }, []);

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      applyDocumentLanguage(nextLanguage);

      try {
        window.localStorage.setItem(
          LANGUAGE_STORAGE_KEY,
          nextLanguage
        );
        window.localStorage.removeItem(
          LEGACY_LANGUAGE_STORAGE_KEY
        );
      } catch {
        // Keep the in-session preference when storage is unavailable.
      }

      window.dispatchEvent(
        new Event("orvix-language-changed")
      );
    },
    []
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "ar" ? "en" : "ar");
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      setLanguage,
      toggleLanguage,
    }),
    [language, setLanguage, toggleLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider."
    );
  }

  return context;
}
