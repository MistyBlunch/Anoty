import { Check, Share2, Globe } from "lucide-react"

interface PublicControlsProps {
  copied: boolean
  isPublished: boolean
  onCopy: () => void
  onToggle: () => void
}

export default function PublicControls({ copied, isPublished, onCopy, onToggle }: PublicControlsProps) {
  return (
    <div className="absolute flex-col lg:flex-row bottom-22 sm:bottom-2 left-0 sm:left-1/2 sm:-translate-x-1/2 z-30 flex items-start sm:items-center gap-1 px-4 sm:px-0">
      <button
        onClick={onCopy}
        className={`flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 sm:px-4 py-2.5 text-xs font-semibold shadow-lg transition-all cursor-pointer ${
          copied ? "text-emerald-600 border-emerald-300" : "text-slate-700 hover:border-teal-500/50 hover:text-teal-700"
        }`}
      >
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
        <span className="truncate">{copied ? "¡Copiado!" : "Copiar enlace público"}</span>
      </button>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-lg border transition-all cursor-pointer ${
          !isPublished
            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20"
            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
        }`}
        title={!isPublished ? "Muro visible públicamente" : "Muro oculto (solo tú lo ves)"}
      >
        <Globe className="w-4 h-4" />
        {!isPublished ? "Publicar" : "Ocultar"}
      </button>
    </div>
  )
}