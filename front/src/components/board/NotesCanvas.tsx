import { useCallback, useEffect, useRef } from "react"
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
  // The gesture handlers are recreated on every parent render; route them through a ref
  // so the memoized NoteCards receive stable props and skip re-rendering during pan/zoom.
  const handlersRef = useRef({ onDrawStart, onResizeStart })
  handlersRef.current = { onDrawStart, onResizeStart }
  const handleDrawStart = useCallback(
    (e: React.PointerEvent, d: Drawing) => handlersRef.current.onDrawStart?.(e, d),
    [],
  )
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, d: Drawing) => handlersRef.current.onResizeStart?.(e, d),
    [],
  )

  // Promote the layer to the GPU only while the view is moving. Keeping will-change on
  // permanently would leave the SVGs rasterized at the old scale (blurry after zooming).
  const layerRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<number | null>(null)
  useEffect(() => {
    const el = layerRef.current
    if (!el) return
    el.style.willChange = "transform"
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      el.style.willChange = "auto"
      idleTimerRef.current = null
    }, 200)
  }, [pan.x, pan.y, zoom])
  useEffect(
    () => () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
    },
    [],
  )

  return (
    <div
      ref={layerRef}
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
                onDrawStart={handleDrawStart}
                onResizeStart={handleResizeStart}
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
              onDrawStart={handleDrawStart}
              onResizeStart={handleResizeStart}
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