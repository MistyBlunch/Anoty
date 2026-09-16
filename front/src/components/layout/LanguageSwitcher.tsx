import { useLanguage } from "@/context/LanguageContext"
import type { Locale } from "@/lib/i18n"

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  const toggle = () => {
    const next: Locale = locale === "en" ? "es" : "en"
    setLocale(next)
  }

  return (
    <button
      onClick={toggle}
      title={t("lang_switch_label")}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-teal-500/50 text-slate-600 hover:text-teal-700 text-xs font-semibold transition-colors cursor-pointer select-none"
    >
      <span className="text-base leading-none">{locale !== "en" ? "🇺🇸" : "🇪🇸"}</span>
      <span className="hidden sm:inline">{locale !== "en" ? t("lang_en") : t("lang_es")}</span>
    </button>
  )
}
