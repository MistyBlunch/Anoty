import { Settings, Palette, Save, Check, RefreshCw, Plus, X } from "lucide-react"
import SvgSafe from "@/components/svg/SvgSafe"
import type { Drawing } from "@/types/drawing"
import type { PaletteDrag } from "@/hooks/useBoardGesture"
import { useLanguage } from "@/context/LanguageContext"

interface PublicSidebarProps {
  innerRef: React.Ref<HTMLElement>
  hovered: boolean
  title: string
  onTitleChange: (value: string) => void
  paletteDrawings: Drawing[]
  onPalettePointerDown: (e: React.PointerEvent, d: Drawing) => void
  paletteDrag: PaletteDrag | null
  open: boolean
  onToggle: () => void
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
  onPalettePointerDown,
  paletteDrag,
  open,
  onToggle,
  saving,
  savedFeed,
  onSave,
}: PublicSidebarProps) {
  const { t } = useLanguage()
  const ghost = paletteDrag ? paletteDrawings.find((d) => d._id === paletteDrag.drawingId) ?? null : null

  const saveLabel = saving ? t("sidebar_saving") : savedFeed ? t("sidebar_saved") : t("sidebar_save_wall")

  return (
    <>
      {open && <div className="sm:hidden fixed inset-0 z-40 bg-slate-900/30" onClick={onToggle} />}
      <aside
        ref={innerRef}
        className={`${open ? "flex" : "hidden"} sm:flex fixed sm:absolute inset-x-0 bottom-0 sm:inset-x-auto sm:top-0 sm:bottom-0 sm:left-0 z-50 sm:z-20 w-full sm:w-64 max-h-[70dvh] sm:max-h-none rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-r bg-white sm:bg-white/95 sm:backdrop-blur flex-col overflow-hidden shadow-2xl sm:shadow-lg transition-shadow pb-[env(safe-area-inset-bottom)] sm:pb-0 ${
          hovered ? "border-teal-500/70 ring-2 ring-teal-500/40" : "border-slate-200"
        }`}
      >
        {hovered && (
          <div className="absolute inset-x-0 top-2 z-30 flex justify-center pointer-events-none">
            <span className="bg-teal-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg ring-2 ring-teal-400/50">
              {t("sidebar_drop_to_remove")}
            </span>
          </div>
        )}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-teal-600" />
              {t("sidebar_settings")}
            </p>
            <button
              onClick={onToggle}
              className="sm:hidden -m-1 p-1 rounded-md text-slate-400 hover:text-slate-600"
              aria-label={t("sidebar_close_panel")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="block">
            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
              {t("sidebar_wall_name")}
            </span>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={80}
              placeholder={t("sidebar_wall_placeholder")}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
            />
          </label>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-teal-600" />
            {t("sidebar_your_drawings")}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{t("sidebar_drag_hint")}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
          {paletteDrawings.length === 0 ? (
            <p className="col-span-2 text-center text-[11px] text-slate-400 py-6">
              {t("sidebar_no_drawings")}
            </p>
          ) : (
            paletteDrawings.map((d) => (
              <div
                key={d._id}
                onPointerDown={(e) => onPalettePointerDown(e, d)}
                className={`w-full h-28 rounded-lg border bg-white overflow-hidden transition-all cursor-grab active:cursor-grabbing touch-none select-none [&_svg]:w-full [&_svg]:h-full ${
                  paletteDrag?.drawingId === d._id
                    ? "opacity-40 border-teal-500/50"
                    : "border-slate-200 hover:border-teal-500/50"
                }`}
                title={t("sidebar_drag_to_wall")}
              >
                <SvgSafe svg={d.content} className="w-full h-full" />
              </div>
            ))
          )}
        </div>
        <div className="hidden sm:block px-4 py-3 border-t border-slate-100">
          <button
            onClick={onSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
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
            <span>{saveLabel}</span>
          </button>
        </div>
      </aside>

      {!open && (
        <div className="sm:hidden fixed bottom-2 left-5 z-30 flex flex-col items-stretch gap-1">
          <button
            onClick={onToggle}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-teal-600 text-white text-xs font-bold shadow-xl shadow-teal-900/20 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            {t("sidebar_add_drawings")}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xl shadow-teal-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed ${
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
            <span>{saveLabel}</span>
          </button>
        </div>
      )}

      {ghost && paletteDrag && !paletteDrag.overBoard && (
        <div
          className="fixed z-[60] pointer-events-none left-0 top-0 -translate-x-1/2 -translate-y-1/2 w-24 h-24"
          style={{ left: paletteDrag!.x, top: paletteDrag!.y }}
        >
          <div
            className={`w-full h-full rounded-xl border-2 bg-white shadow-2xl overflow-hidden [&_svg]:w-full [&_svg]:h-full ${
              paletteDrag!.overBoard ? "border-teal-500" : "border-slate-300"
            }`}
          >
            <SvgSafe svg={ghost.content} className="w-full h-full" />
          </div>
        </div>
      )}
    </>
  )
}