import {
  Download,
  FileImage,
  Palette,
  ArrowDown,
  ArrowUp,
  Trash2,
  GitBranch,
} from "lucide-react"
import { isTransparent, type Drawing } from "@/lib/board"

export interface MenuPosition {
  left: number
  top: number
  above: boolean
}

interface ActionsMenuProps {
  innerRef: React.Ref<HTMLDivElement>
  drawing: Drawing
  mode: "inbox" | "public"
  confirmDeleteVisible: boolean
  pos: MenuPosition
  onExportSvg: (d: Drawing) => void
  onExportPng: (d: Drawing) => void
  onToggleBackground: (d: Drawing) => void
  onMoveLayer: (d: Drawing, dir: "front" | "back") => void
  onRequestDelete: (d: Drawing) => void
  onConfirmDelete: (d: Drawing) => void
  onCancelDelete: () => void
  onRemovePublic: (d: Drawing) => void
}

export default function ActionsMenu({
  innerRef,
  drawing,
  mode,
  confirmDeleteVisible,
  pos,
  onExportSvg,
  onExportPng,
  onToggleBackground,
  onMoveLayer,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onRemovePublic,
}: ActionsMenuProps) {
  return (
    <div
      ref={innerRef}
      className="absolute z-40 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5"
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onExportSvg(drawing)}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          SVG
        </button>
        <button
          onClick={() => onExportPng(drawing)}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <FileImage className="w-4 h-4" />
          PNG
        </button>
        <button
          onClick={() => onToggleBackground(drawing)}
          className={`flex items-center justify-center gap-1 text-xs font-semibold border px-2 py-2 rounded-lg transition-colors cursor-pointer ${
            isTransparent(drawing)
              ? "text-teal-700 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20"
              : "text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200"
          }`}
          title="Alternar fondo del dibujo"
        >
          <Palette className="w-4 h-4" />
          {isTransparent(drawing) ? "Fondo" : "Quitar fondo"}
        </button>
        <button
          onClick={() => onMoveLayer(drawing, "back")}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          title="Mover una capa hacia atrás"
        >
          <ArrowDown className="w-4 h-4" />
          Atrás
        </button>
        <button
          onClick={() => onMoveLayer(drawing, "front")}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          title="Mover una capa hacia adelante"
        >
          <ArrowUp className="w-4 h-4" />
          Adelante
        </button>
        {mode === "inbox" ? (
          confirmDeleteVisible ? (
            <div className="col-span-3 flex items-center justify-center gap-1 bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-2">
              <span className="text-xs font-semibold text-red-600">¿Eliminar dibujo?</span>
              <button
                onClick={() => onConfirmDelete(drawing)}
                className="text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Confirmar
              </button>
              <button
                onClick={onCancelDelete}
                className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onRequestDelete(drawing)}
              className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )
        ) : (
          <button
            onClick={() => onRemovePublic(drawing)}
            className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <GitBranch className="w-4 h-4" />
            Quitar del muro
          </button>
        )}
      </div>
    </div>
  )
}