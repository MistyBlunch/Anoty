import { Sparkles, MessageSquareHeart, ExternalLink } from "lucide-react"

interface EmptyBoardProps {
  variant: "inbox" | "public" | "viewer"
  shifted?: boolean
  copied?: boolean
  onCopyShare?: () => void
}

const CONTENT = {
  inbox: {
    icon: Sparkles,
    title: "Tu muro aún está vacío",
    description:
      "Comparte tu enlace para que tus amigos te envíen dibujos anónimos. Llegan directo a este tablero y podrás moverlos como quieras.",
  },
  public: {
    icon: Sparkles,
    title: "Tu muro público está vacío",
    description:
      "Arrastra aquí tus dibujos desde el panel izquierdo para crear tu muro visible por cualquiera en Internet.",
  },
  viewer: {
    icon: MessageSquareHeart,
    title: "Este muro está vacío",
    description: "El dueño aún no ha colocado ningún dibujo aquí.",
  },
} as const

export default function EmptyBoard({ variant, shifted, copied, onCopyShare }: EmptyBoardProps) {
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
            <span>{copied ? "¡Copiado!" : "Copiar mi enlace personal"}</span>
          </button>
        )}
      </div>
    </div>
  )
}