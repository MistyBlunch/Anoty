import { ZoomIn, ZoomOut } from "lucide-react"

interface ZoomControlsProps {
  zoom: number
  onZoom: (factor: number) => void
}

export default function ZoomControls({ zoom, onZoom }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-2 right-5 z-30 flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-lg">
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