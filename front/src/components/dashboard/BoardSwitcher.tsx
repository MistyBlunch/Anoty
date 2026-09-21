import { Inbox, Globe } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface BoardSwitcherProps {
  mode: "inbox" | "public"
  onInbox: () => void
  onPublic: () => void
}

export default function BoardSwitcher({ mode, onInbox, onPublic }: BoardSwitcherProps) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 border border-slate-200 p-0.5 sm:p-1 rounded-xl">
      <button
        onClick={onInbox}
        className={`flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "inbox"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title={t("mode_inbox")}
      >
        <Inbox className="w-4 h-4" />
        <span className="hidden md:inline">{t("mode_inbox")}</span>
      </button>
      <button
        onClick={onPublic}
        className={`flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          mode === "public"
            ? "bg-white text-teal-700 shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title={t("mode_public")}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden md:inline">{t("mode_public")}</span>
      </button>
    </div>
  )
}