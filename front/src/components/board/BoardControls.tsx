import { MousePointer2, Hand, BoxSelect, Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react"

interface BoardControlsProps {
  tool: "select" | "hand" | "marquee"
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onToolChange: (tool: "select" | "hand" | "marquee") => void
  onUndo: () => void
  onRedo: () => void
  onZoom: (factor: number) => void
}

export default function BoardControls({
  tool,
  canUndo,
  canRedo,
  zoom,
  onToolChange,
  onUndo,
  onRedo,
  onZoom,
}: BoardControlsProps) {
  return (
    <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-lg">
      <button
        onClick={() => onToolChange("select")}
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          tool === "select"
            ? "bg-teal-500/10 text-teal-700 border border-teal-500/30"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        title="Seleccionar (V)"
      >
        <MousePointer2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToolChange("hand")}
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          tool === "hand"
            ? "bg-teal-500/10 text-teal-700 border border-teal-500/30"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        title="Mano (H)"
      >
        <Hand className="w-4 h-4" />
      </button>
      <button
        onClick={() => onToolChange("marquee")}
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          tool === "marquee"
            ? "bg-teal-500/10 text-teal-700 border border-teal-500/30"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        title="Selección múltiple (M) — arrastra en el lienzo"
      >
        <BoxSelect className="w-4 h-4" />
      </button>
      <div className="border-t border-slate-200 mx-1" />
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          canUndo ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-default"
        }`}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-2 rounded-xl transition-colors cursor-pointer ${
          canRedo ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-default"
        }`}
        title="Rehacer (Ctrl+Y / Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>
      <div className="border-t border-slate-200 mx-1" />
      <button
        onClick={() => onZoom(1.2)}
        className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
        title="Acercar"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <span className="text-center text-[10px] font-bold text-slate-500 py-0.5">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => onZoom(1 / 1.2)}
        className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
        title="Alejar"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
    </div>
  )
}