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