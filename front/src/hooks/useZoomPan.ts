import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react"
import { zoomTowardPoint, type Vector2 } from "@/lib/board"

export interface BoardView {
  zoom: number
  pan: Vector2
  boardRef: RefObject<HTMLDivElement | null>
  viewRef: MutableRefObject<{ zoom: number; pan: Vector2 }>
  setZoom: Dispatch<SetStateAction<number>>
  setPan: Dispatch<SetStateAction<Vector2>>
  handleZoom: (factor: number) => void
}

interface UseZoomPanOptions {
  wheel?: boolean
  initialZoom?: number
}

export function useZoomPan({ wheel = true, initialZoom = 0.8 }: UseZoomPanOptions = {}): BoardView {
  const [zoom, setZoom] = useState(initialZoom)
  const [pan, setPan] = useState<Vector2>({ x: 0, y: 0 })
  const boardRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef({ zoom, pan })
  viewRef.current = { zoom, pan }

  const handleZoom = useCallback(
    (factor: number) => {
      const rect = boardRef.current?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 0
      const cy = rect ? rect.height / 2 : 0
      const next = zoomTowardPoint(pan, zoom, factor, cx, cy)
      setZoom(next.zoom)
      setPan(next.pan)
    },
    [pan, zoom],
  )

  useEffect(() => {
    if (!wheel) return
    const board = boardRef.current
    if (!board) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = board.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const next = zoomTowardPoint(pan, zoom, factor, cx, cy)
      setZoom(next.zoom)
      setPan(next.pan)
    }
    board.addEventListener("wheel", onWheel, { passive: false })
    return () => board.removeEventListener("wheel", onWheel)
  }, [wheel, zoom, pan])

  useEffect(() => {
    if (!wheel) return
    const pointers = new Map<number, { x: number; y: number }>()
    let lastDist = 0

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size >= 2) {
        const pts = Array.from(pointers.values())
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        if (lastDist > 0) {
          const board = boardRef.current
          if (!board) return
          const rect = board.getBoundingClientRect()
          const mx = (pts[0].x + pts[1].x) / 2 - rect.left
          const my = (pts[0].y + pts[1].y) / 2 - rect.top
          const factor = dist / lastDist
          const cur = viewRef.current
          const next = zoomTowardPoint(cur.pan, cur.zoom, factor, mx, my)
          setZoom(next.zoom)
          setPan(next.pan)
        }
        lastDist = dist
      }
    }
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) lastDist = 0
    }
    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [wheel])

  return {
    zoom,
    pan,
    boardRef,
    viewRef,
    setZoom,
    setPan,
    handleZoom,
  }
}