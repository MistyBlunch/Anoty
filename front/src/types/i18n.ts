import type React from "react"
import type { Locale } from "@/lib/i18n"

export interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, ...args: any[]) => string
}

export interface LanguageProviderProps {
  children: React.ReactNode
  initialLocale?: Locale
}
