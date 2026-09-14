import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react"
import type { Drawing } from "@/lib/board"
import type { PublicBoardDraft } from "@/types/publicboard"
import type { BoardView } from "./useZoomPan"

export interface BoardGestureHost {
  view: BoardView
  inboxDrawingsRef: RefObject<Drawing[]>
  displayRef: RefObject<Drawing[]>
  pubBoardRef: RefObject<PublicBoardDraft | null>
  modeRef: RefObject<"inbox" | "public">
  setDisplayDrawings: (updater: (prev: Drawing[]) => Drawing[]) => void
  persistNote: (id: string, patch: Record<string, unknown>) => void
  saveDraftItems: (items: Drawing[]) => void
  setSelectedId: Dispatch<SetStateAction<string | null>>
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>
  setNewArrivals: Dispatch<SetStateAction<Drawing[]>>
  setDragNoteId: Dispatch<SetStateAction<string | null>>
}

interface BoardDrag {
  kind: "pan" | "draw" | "resize"
  startX: number
  startY: number
  origPanX: number
  origPanY: number
  drawId?: string
  origX?: number
  origY?: number
  origW?: number
  origH?: number
  moved: boolean
}

export interface BoardGesture {
  sidebarHover: boolean
  paletteRef: RefObject<HTMLElement | null>
  dragScale: (d: Drawing) => number
  handlePanStart: (e: React.PointerEvent) => void
  handleDrawStart: (e: React.PointerEvent, d: Drawing) => void
  handleResizeStart: (e: React.PointerEvent, d: Drawing) => void
  handleDrop: (e: React.DragEvent) => void
}

export function useBoardGesture(host: BoardGestureHost): BoardGesture {
  const { view } = host
  const dragRef = useRef<BoardDrag | null>(null)
  const paletteRef = useRef<HTMLElement | null>(null)
  const [sidebarHover, setSidebarHover] = useState(false)
  const hostRef = useRef(host)
  hostRef.current = host

  const isOverPalette = (x: number, y: number) => {
    const r = paletteRef.current?.getBoundingClientRect()
    if (!r) return false
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  useEffect(() => {
    const h = () => hostRef.current

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const { view: v, setDisplayDrawings, modeRef } = h()
      const zoomNow = v.viewRef.current.zoom

      if (drag.kind === "pan") {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
        v.setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy })
      } else if (drag.kind === "draw" && drag.drawId) {
        const dx = (e.clientX - drag.startX) / zoomNow
        const dy = (e.clientY - drag.startY) / zoomNow
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
        const current = h().displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          setDisplayDrawings((prev) =>
            prev.map((d) =>
              d._id === drag.drawId
                ? { ...d, x: (drag.origX || 0) + dx, y: (drag.origY || 0) + dy }
                : d,
            ),
          )
        }
        if (modeRef.current === "public") {
          setSidebarHover(isOverPalette(e.clientX, e.clientY))
        }
      } else if (drag.kind === "resize" && drag.drawId) {
        const dx = (e.clientX - drag.startX) / zoomNow
        const dy = (e.clientY - drag.startY) / zoomNow
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.moved = true
        setDisplayDrawings((prev) =>
          prev.map((d) =>
            d._id === drag.drawId
              ? {
                  ...d,
                  width: Math.max(40, Math.round((drag.origW || 0) + dx)),
                  height: Math.max(40, Math.round((drag.origH || 0) + dy)),
                }
              : d,
          ),
        )
      } else {
        setSidebarHover(false)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const hostCtx = h()
      const drag = dragRef.current
      if (!drag) return
      const {
        displayRef,
        pubBoardRef,
        modeRef,
        setDisplayDrawings,
        saveDraftItems,
        persistNote,
        setSelectedId,
      } = hostCtx
      const overPalette = isOverPalette(e.clientX, e.clientY)

      if (drag.kind === "draw" && drag.drawId && drag.moved) {
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          if (modeRef.current === "public" && overPalette) {
            const pub = pubBoardRef.current
            const drawId = drag.drawId
            if (pub) {
              const next = pub.items.filter((it) => it._id !== drawId)
              setDisplayDrawings(() => next)
              saveDraftItems(next)
              setSelectedId((prev) => (prev === drawId ? null : prev))
            }
          } else if (modeRef.current === "public") {
            saveDraftItems(displayRef.current)
          } else {
            persistNote(drag.drawId, {
              x: Math.round(current.x),
              y: Math.round(current.y),
              positionSet: true,
            })
          }
        }
      } else if (drag.kind === "resize" && drag.drawId && drag.moved) {
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          if (modeRef.current === "public") {
            saveDraftItems(displayRef.current)
          } else {
            persistNote(drag.drawId, {
              width: Math.round(current.width),
              height: Math.round(current.height),
            })
          }
        }
      }

      setSidebarHover(false)
      dragRef.current = null
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [])

  const draggedId = dragRef.current?.kind === "draw" ? (dragRef.current.drawId || null) : null

  const dragScale = (d: Drawing) => {
    if (!sidebarHover || draggedId !== d._id) return 1
    const targetW = Math.max(40, (paletteRef.current?.offsetWidth || 256) - 24)
    return Math.min(1, targetW / Math.max(40, d.width))
  }

  const handlePanStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setSidebarHover(false)
    host.setSelectedId(null)
    host.setConfirmDeleteId(null)
    const { pan } = view.viewRef.current
    dragRef.current = {
      kind: "pan",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    }
  }

  const handleDrawStart = (e: React.PointerEvent, d: Drawing) => {
    e.stopPropagation()
    if (e.button !== 0) return
    host.setSelectedId(d._id)
    host.setConfirmDeleteId(null)
    host.setNewArrivals((prev) => prev.filter((n) => n._id !== d._id))
    dragRef.current = {
      kind: "draw",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: view.pan.x,
      origPanY: view.pan.y,
      drawId: d._id,
      origX: d.x,
      origY: d.y,
      moved: false,
    }
  }

  const handleResizeStart = (e: React.PointerEvent, d: Drawing) => {
    e.stopPropagation()
    if (e.button !== 0) return
    host.setSelectedId(d._id)
    host.setConfirmDeleteId(null)
    dragRef.current = {
      kind: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: view.pan.x,
      origPanY: view.pan.y,
      drawId: d._id,
      origX: d.x,
      origY: d.y,
      origW: d.width,
      origH: d.height,
      moved: false,
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData("text/plain")
    host.setDragNoteId(null)
    if (!noteId) return
    const source = host.inboxDrawingsRef.current.find((d) => d._id === noteId)
    const boardEl = view.boardRef.current
    const pub = host.pubBoardRef.current
    if (!source || !boardEl || !pub) return
    const rect = boardEl.getBoundingClientRect()
    const { pan: p, zoom: z } = view.viewRef.current
    const worldX = (e.clientX - rect.left - p.x) / z
    const worldY = (e.clientY - rect.top - p.y) / z
    const placed = pub.items.some((it) => it._id === noteId)
    if (placed) return
    const item: Drawing = {
      _id: source._id,
      content: source.content,
      x: Math.round(worldX - (source.width || 320) / 2),
      y: Math.round(worldY - (source.height || 220) / 2),
      width: source.width,
      height: source.height,
      rotation: source.rotation || 0,
      authorName: source.authorName,
      createdAt: source.createdAt,
      z: pub.items.reduce((m, it) => Math.max(m, it.z || 0), 0) + 1,
      transparent: source.transparent === true,
    }
    const next = [...pub.items, item]
    host.setDisplayDrawings(() => next)
    host.saveDraftItems(next)
  }

  return {
    sidebarHover,
    paletteRef,
    dragScale,
    handlePanStart,
    handleDrawStart,
    handleResizeStart,
    handleDrop,
  }
}