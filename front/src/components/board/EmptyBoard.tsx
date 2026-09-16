import { Sparkles, MessageSquareHeart, ExternalLink } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface EmptyBoardProps {
  variant: "inbox" | "public" | "viewer"
  shifted?: boolean
  copied?: boolean
  onCopyShare?: () => void
}

export default function EmptyBoard({ variant, shifted, copied, onCopyShare }: EmptyBoardProps) {
  const { t } = useLanguage()

  const CONTENT = {
    inbox: {
      icon: Sparkles,
      title: t("empty_inbox_title"),
      description: t("empty_inbox_description"),
    },
    public: {
      icon: Sparkles,
      title: t("empty_public_title"),
      description: t("empty_public_description"),
    },
    viewer: {
      icon: MessageSquareHeart,
      title: t("empty_viewer_title"),
      description: t("empty_viewer_description"),
    },
  } as const

  const { icon: Icon, title, description } = CONTENT[variant]
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
        shifted ? "sm:left-64" : ""
      }`}
    >
      <div className="glass-card rounded-3xl p-6 sm:p-10 text-center border border-slate-200 w-[min(28rem,calc(100vw-3.5rem))] pointer-events-auto">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">{description}</p>
        {variant === "inbox" && (
          <button
            onClick={onCopyShare}
            className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{copied ? t("copied") : t("copy_my_link")}</span>
          </button>
        )}
      </div>
    </div>
  )
}