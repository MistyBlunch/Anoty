import type { Drawing } from "@/types/drawing"
import { isTransparent } from "@/lib/board"
import SvgSafe from "@/components/svg/SvgSafe"

interface BoardNoteProps {
  drawing: Drawing
  selected?: boolean
  pulsing?: boolean
}

export default function BoardNote({ drawing, selected, pulsing }: BoardNoteProps) {
  return (
    <div
      className={`w-full h-full rounded-xl overflow-hidden ${
        isTransparent(drawing) ? "bg-transparent" : "bg-white shadow-lg"
      } ${
        pulsing
          ? "ring-2 ring-cyan-400 arrival-pulse"
          : selected
            ? "ring-2 ring-teal-500 shadow-2xl"
            : ""
      }`}
      style={{ transform: `rotate(${drawing.rotation || 0}deg)` }}
    >
      <SvgSafe svg={drawing.content} className="w-full h-full" />
    </div>
  )
}