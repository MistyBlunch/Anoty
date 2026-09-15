import { AnimatePresence } from "framer-motion"
import type { Drawing } from "@/types/drawing"
import type { Vector2 } from "@/lib/board"
import NoteCard from "./NoteCard"
import BoardNote from "./BoardNote"

interface NotesCanvasProps {
  items: Drawing[]
  pan: Vector2
  zoom: number
  zIndex?: number
  interactive?: boolean
  handTool?: boolean
  animated?: boolean
  selectedIds?: string[]
  pulseId?: string | null
  scaleOf?: (d: Drawing) => number
  onDrawStart?: (e: React.PointerEvent, d: Drawing) => void
  onResizeStart?: (e: React.PointerEvent, d: Drawing) => void
}

export default function NotesCanvas({
  items,
  pan,
  zoom,
  zIndex,
  interactive = false,
  handTool = false,
  animated = true,
  selectedIds = [],
  pulseId = null,
  scaleOf,
  onDrawStart,
  onResizeStart,
}: NotesCanvasProps) {
  return (
    <div
      className="absolute top-0 left-0"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "0 0",
        ...(zIndex !== undefined ? { zIndex } : {}),
      }}
    >
      {interactive ? (
        animated ? (
          <AnimatePresence>
            {items.map((d) => (
              <NoteCard
                key={d._id}
                drawing={d}
                selected={selectedIds.includes(d._id)}
                pulsing={pulseId === d._id}
                scale={scaleOf ? scaleOf(d) : 1}
                handTool={handTool}
                onDrawStart={onDrawStart ?? (() => {})}
                onResizeStart={onResizeStart ?? (() => {})}
              />
            ))}
          </AnimatePresence>
        ) : (
          items.map((d) => (
            <NoteCard
              key={d._id}
              drawing={d}
              selected={selectedIds.includes(d._id)}
              pulsing={pulseId === d._id}
              scale={scaleOf ? scaleOf(d) : 1}
              handTool={handTool}
              onDrawStart={onDrawStart ?? (() => {})}
              onResizeStart={onResizeStart ?? (() => {})}
            />
          ))
        )
      ) : (
        items.map((d) => (
          <div
            key={d._id}
            className="absolute"
            style={{
              left: d.x,
              top: d.y,
              width: d.width,
              height: d.height,
              zIndex: d.z || 0,
            }}
          >
            <BoardNote drawing={d} />
          </div>
        ))
      )}
    </div>
  )
}