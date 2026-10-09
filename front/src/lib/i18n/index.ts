import en from "./en"
import es from "./es"

export type Locale = "en" | "es"

export const LOCALES: Locale[] = ["en", "es"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const translations: Record<Locale, Record<string, string | ((...args: any[]) => string)>> = {
  en,
  es,
}

export type { TranslationKey } from "./en"
