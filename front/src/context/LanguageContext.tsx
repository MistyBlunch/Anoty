"use client"
import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { type Locale, translations } from "@/lib/i18n"

const STORAGE_KEY = "anoty_locale"
const DEFAULT_LOCALE: Locale = "en"

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, ...args: any[]) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const urlLang = params.get("lang") as Locale | null
      if (urlLang === "en" || urlLang === "es") {
        setLocaleState(urlLang)
        localStorage.setItem(STORAGE_KEY, urlLang)
        return
      }

      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && (stored === "en" || stored === "es")) {
        setLocaleState(stored)
      } else if (initialLocale) {
        setLocaleState(initialLocale)
      }
    }
  }, [initialLocale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useCallback((key: string, ...args: any[]): string => {
    const dict = translations[locale]
    const val = dict[key]
    if (typeof val === "function") {
      return val(...args)
    }
    return (val as string) ?? key
  }, [locale])

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>")
  return ctx
}
