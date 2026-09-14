import { Settings, Palette, Save, Check, RefreshCw } from "lucide-react"
import SvgSafe from "@/components/svg/SvgSafe"
import type { Drawing } from "@/types/drawing"

interface PublicSidebarProps {
  innerRef: React.Ref<HTMLElement>
  hovered: boolean
  title: string
  onTitleChange: (value: string) => void
  paletteDrawings: Drawing[]
  dragNoteId: string | null
  onPaletteDragStart: (e: React.DragEvent, d: Drawing) => void
  onPaletteDragEnd: () => void
  saving: boolean
  savedFeed: boolean
  onSave: () => void
}

export default function PublicSidebar({
  innerRef,
  hovered,
  title,
  onTitleChange,
  paletteDrawings,
  dragNoteId,
  onPaletteDragStart,
  onPaletteDragEnd,
  saving,
  savedFeed,
  onSave,
}: PublicSidebarProps) {
  return (
    <aside
      ref={innerRef}
      className={`absolute left-0 top-0 bottom-0 z-20 w-64 bg-white/95 backdrop-blur border-r flex flex-col overflow-hidden shadow-lg transition-shadow ${
        hovered ? "border-teal-500/70 ring-2 ring-teal-500/40" : "border-slate-200"
      }`}
    >
      {hovered && (
        <div className="absolute inset-x-0 top-2 z-30 flex justify-center pointer-events-none">
          <span className="bg-teal-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg ring-2 ring-teal-400/50">
            Suelta para quitar
          </span>
        </div>
      )}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-teal-600" />
          Configuración
        </p>
        <label className="block">
          <span className="block text-[10px] font-semibold text-slate-500 mb-1">
            Nombre de tu muro
          </span>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            maxLength={80}
            placeholder="Mi Muro Público"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
          />
        </label>
      </div>
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-teal-600" />
          Tus dibujos
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">Arrastra uno al muro</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
        {paletteDrawings.length === 0 ? (
          <p className="col-span-2 text-center text-[11px] text-slate-400 py-6">
            No tienes dibujos sin colocar.
          </p>
        ) : (
          paletteDrawings.map((d) => (
            <div
              key={d._id}
              draggable
              onDragStart={(e) => onPaletteDragStart(e, d)}
              onDragEnd={onPaletteDragEnd}
              className={`aspect-[4/3] rounded-lg border bg-white overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                dragNoteId === d._id
                  ? "opacity-40 border-teal-500/50"
                  : "border-slate-200 hover:border-teal-500/50"
              }`}
              title="Arrastrar al muro"
            >
              <SvgSafe svg={d.content} className="w-full h-full" />
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            savedFeed ? "bg-emerald-500" : "bg-teal-600"
          }`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : savedFeed ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? "Guardando..." : savedFeed ? "¡Guardado!" : "Guardar muro"}</span>
        </button>
      </div>
    </aside>
  )
}