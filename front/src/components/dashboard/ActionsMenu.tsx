import {
  Download,
  Palette,
  ArrowDown,
  ArrowUp,
  Trash2,
  GitBranch,
} from "lucide-react"
import { isTransparent, type Drawing, type MenuPosition } from "@/lib/board"

interface ActionsMenuProps {
  innerRef: React.Ref<HTMLDivElement>
  drawings: Drawing[]
  mode: "inbox" | "public"
  confirmDeleteVisible: boolean
  pos: MenuPosition
  onExportPng: () => void
  onToggleBackground: () => void
  onMoveLayer: (dir: "front" | "back") => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onRemovePublic: () => void
}

export default function ActionsMenu({
  innerRef,
  drawings,
  mode,
  confirmDeleteVisible,
  pos,
  onExportPng,
  onToggleBackground,
  onMoveLayer,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  onRemovePublic,
}: ActionsMenuProps) {
  const count = drawings.length
  const anySolid = count > 1 && drawings.some((d) => !isTransparent(d))
  const bgLabel =
    count === 1
      ? isTransparent(drawings[0])
        ? "Fondo"
        : "Quitar fondo"
      : anySolid
        ? "Quitar fondo"
        : "Fondo"
  const bgTitle =
    count > 1
      ? "Alternar fondo de los dibujos seleccionados"
      : "Alternar fondo del dibujo"
  const deleteLabel = count > 1 ? "Eliminar" : "Eliminar"

  return (
    <div
      ref={innerRef}
      className={`absolute z-40 w-[min(20rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5`}
      style={{
        left: pos.left,
        top: pos.top,
        transform: pos.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
      }}
    >
      {count > 1 && (
        <div className="text-center text-xs font-semibold text-slate-500 mb-1.5">
          {count} seleccionadas
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={onExportPng}
          className="col-span-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          title="Descargar como imagen"
        >
          <Download className="w-4 h-4" />
          Descargar como imagen
        </button>
        <button
          onClick={() => onMoveLayer("front")}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          title="Enviar la selección al frente"
        >
          <ArrowUp className="w-4 h-4" />
          Adelante
        </button>
        <button
          onClick={() => onMoveLayer("back")}
          className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
          title="Enviar la selección al fondo"
        >
          <ArrowDown className="w-4 h-4" />
          Atrás
        </button>
        <button
          onClick={onToggleBackground}
          className={`flex items-center justify-center gap-1 text-xs font-semibold border px-2 py-2 rounded-lg transition-colors cursor-pointer ${
            anySolid
              ? "text-teal-700 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20"
              : count === 1 && isTransparent(drawings[0])
                ? "text-teal-700 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20"
                : "text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200"
          }`}
          title={bgTitle}
        >
          <Palette className="w-4 h-4" />
          {bgLabel}
        </button>
        {mode === "inbox" ? (
          confirmDeleteVisible ? (
            <div className="col-span-2 flex items-center justify-center gap-1 bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-2">
              <span className="text-xs font-semibold text-red-600">
                {count > 1
                  ? `¿Eliminar ${count} dibujos?`
                  : "¿Eliminar dibujo?"}
              </span>
              <button
                onClick={onConfirmDelete}
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
              onClick={onRequestDelete}
              className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLabel}
            </button>
          )
        ) : (
          <button
            onClick={onRemovePublic}
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
