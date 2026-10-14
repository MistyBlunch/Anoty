import { useCallback } from "react"
import { computeContentView, computeFocusView, type Drawing } from "@/lib/board"
import type { BoardView } from "./useZoomPan"

export function useFitToContent(view: BoardView) {
  const { boardRef, setZoom, setPan, scheduleView } = view

  const fitToContent = useCallback(
    (items: Drawing[]) => {
      const board = boardRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()
      const next = computeContentView(rect.width, rect.height, items)
      if (scheduleView) {
        scheduleView(next.zoom, next.pan)
      } else {
        setZoom(next.zoom)
        setPan(next.pan)
      }
    },
    [boardRef, setZoom, setPan, scheduleView],
  )

  const focusOn = useCallback(
    (d: Drawing) => {
      const board = boardRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()
      const next = computeFocusView(rect.width, rect.height, d)
      if (scheduleView) {
        scheduleView(next.zoom, next.pan)
      } else {
        setZoom(next.zoom)
        setPan(next.pan)
      }
    },
    [boardRef, setZoom, setPan, scheduleView],
  )

  return { fitToContent, focusOn }
}