import { motion } from "framer-motion"
import type { Drawing } from "@/types/drawing"
import BoardNote from "./BoardNote"

interface NoteCardProps {
  drawing: Drawing
  selected: boolean
  pulsing: boolean
  scale: number
  onDrawStart: (e: React.PointerEvent, d: Drawing) => void
  onResizeStart: (e: React.PointerEvent, d: Drawing) => void
}

export default function NoteCard({
  drawing,
  selected,
  pulsing,
  scale,
  onDrawStart,
  onResizeStart,
}: NoteCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="absolute cursor-move"
      style={{
        left: drawing.x,
        top: drawing.y,
        width: drawing.width,
        height: drawing.height,
        touchAction: "none",
        zIndex: drawing.z || 0,
      }}
      onPointerDown={(e) => onDrawStart(e, drawing)}
    >
      <BoardNote drawing={drawing} selected={selected} pulsing={pulsing} />
      {selected && (
        <div
          onPointerDown={(e) => onResizeStart(e, drawing)}
          className="absolute -bottom-2 -right-2 z-10 w-5 h-5 bg-white border-2 border-teal-500 rounded-md shadow flex items-center justify-center cursor-nwse-resize"
          style={{ touchAction: "none" }}
          title="Redimensionar"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-teal-500" />
        </div>
      )}
    </motion.div>
  )
}