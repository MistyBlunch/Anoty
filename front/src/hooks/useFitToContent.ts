import { useCallback } from "react"
import { computeContentView, computeFocusView, type Drawing } from "@/lib/board"
import type { BoardView } from "./useZoomPan"

export function useFitToContent(view: BoardView) {
  const { boardRef, setZoom, setPan } = view

  const fitToContent = useCallback(
    (items: Drawing[]) => {
      const board = boardRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()
      const next = computeContentView(rect.width, rect.height, items)
      setZoom(next.zoom)
      setPan(next.pan)
    },
    [boardRef, setZoom, setPan],
  )

  const focusOn = useCallback(
    (d: Drawing) => {
      const board = boardRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()
      const next = computeFocusView(rect.width, rect.height, d)
      setZoom(next.zoom)
      setPan(next.pan)
    },
    [boardRef, setZoom, setPan],
  )

  return { fitToContent, focusOn }
}