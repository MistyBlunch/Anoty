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
  /** Queue a view update; state is committed at most once per animation frame. */
  scheduleView: (zoom: number, pan: Vector2) => void
  /** Number of pointers (fingers/mouse) currently pressed anywhere on the page. */
  getPointerCount: () => number
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
  const pendingRef = useRef<{ zoom: number; pan: Vector2 } | null>(null)
  const rafRef = useRef<number | null>(null)
  // While a frame is pending, viewRef already holds the newest values; don't overwrite them with stale state.
  if (!pendingRef.current) viewRef.current = { zoom, pan }

  const wheelRef = useRef(wheel)
  wheelRef.current = wheel
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())

  const scheduleView = useCallback((nextZoom: number, nextPan: Vector2) => {
    viewRef.current = { zoom: nextZoom, pan: nextPan }
    pendingRef.current = viewRef.current
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const next = pendingRef.current
      pendingRef.current = null
      if (!next) return
      setZoom(next.zoom)
      setPan(next.pan)
    })
  }, [])

  const getPointerCount = useCallback(() => pointersRef.current.size, [])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const handleZoom = useCallback(
    (factor: number) => {
      const rect = boardRef.current?.getBoundingClientRect()
      const cx = rect ? rect.width / 2 : 0
      const cy = rect ? rect.height / 2 : 0
      const cur = viewRef.current
      const next = zoomTowardPoint(cur.pan, cur.zoom, factor, cx, cy)
      scheduleView(next.zoom, next.pan)
    },
    [scheduleView],
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
      const cur = viewRef.current
      const next = zoomTowardPoint(cur.pan, cur.zoom, factor, cx, cy)
      scheduleView(next.zoom, next.pan)
    }
    board.addEventListener("wheel", onWheel, { passive: false })
    return () => board.removeEventListener("wheel", onWheel)
    // zoom/pan stay in the deps so the listener attaches once the board element mounts.
  }, [wheel, zoom, pan, scheduleView])

  useEffect(() => {
    const pointers = pointersRef.current
    let lastDist = 0

    // Capture phase: note cards call stopPropagation on pointerdown, which would hide
    // the second finger from bubbling listeners and break pinch-to-zoom over drawings.
    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      lastDist = 0
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size < 2 || !wheelRef.current) return
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
        scheduleView(next.zoom, next.pan)
      }
      lastDist = dist
    }
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      lastDist = 0
    }
    window.addEventListener("pointerdown", onPointerDown, true)
    window.addEventListener("pointermove", onPointerMove, true)
    window.addEventListener("pointerup", onPointerUp, true)
    window.addEventListener("pointercancel", onPointerUp, true)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true)
      window.removeEventListener("pointermove", onPointerMove, true)
      window.removeEventListener("pointerup", onPointerUp, true)
      window.removeEventListener("pointercancel", onPointerUp, true)
    }
  }, [scheduleView])

  return {
    zoom,
    pan,
    boardRef,
    viewRef,
    setZoom,
    setPan,
    handleZoom,
    scheduleView,
    getPointerCount,
  }
}