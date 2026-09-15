import { useMemo, useState, type RefObject } from "react"
import { type MenuPosition, type Drawing } from "@/lib/board"
import type { BoardView } from "./useZoomPan"
import { useResizeObserver } from "./useResizeObserver"

export function useActionsMenuPosition(
  selectedDrawings: Drawing[],
  actionsMenuRef: RefObject<HTMLDivElement | null>,
  view: BoardView,
): MenuPosition | null {
  const [menuDims, setMenuDims] = useState({ w: 0, h: 0 })

  useResizeObserver(
    actionsMenuRef,
    () => {
      const el = actionsMenuRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setMenuDims((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      )
    },
    [selectedDrawings],
  )

  return useMemo(() => {
    if (selectedDrawings.length === 0) return null
    const board = view.boardRef.current
    if (!board) return null
    const rect = board.getBoundingClientRect()
    const W = rect.width
    const mw = menuDims.w || 300
    const mh = menuDims.h || 120
    const { zoom, pan } = view.viewRef.current
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const d of selectedDrawings) {
      minX = Math.min(minX, d.x)
      minY = Math.min(minY, d.y)
      maxX = Math.max(maxX, d.x + d.width)
      maxY = Math.max(maxY, d.y + d.height)
    }
    const sx = minX * zoom + pan.x
    const sy = minY * zoom + pan.y
    const sw = (maxX - minX) * zoom
    const sh = (maxY - minY) * zoom
    const centerX = sx + sw / 2
    const left = Math.max(mw / 2 + 8, Math.min(W - mw / 2 - 8, centerX))
    const above = sy - 12 - mh >= 8
    const top = above ? sy - 12 : sy + sh + 12
    return { left, top, above }
  }, [selectedDrawings, menuDims, view])
}