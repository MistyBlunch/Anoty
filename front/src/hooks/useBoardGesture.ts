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
  getTool: () => "select" | "hand" | "marquee"
  setDisplayDrawings: (updater: (prev: Drawing[]) => Drawing[]) => void
  persistNote: (id: string, patch: Record<string, unknown>) => void
  saveDraftItems: (items: Drawing[]) => void
  getSelectedIds: () => string[]
  setSelectedIds: Dispatch<SetStateAction<string[]>>
  toggleSelect: (id: string) => void
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>
  setNewArrivals: Dispatch<SetStateAction<Drawing[]>>
  commit: (items: Drawing[]) => void
}

interface BoardDrag {
  kind: "pan" | "draw" | "resize" | "marquee" | "palette"
  startX: number
  startY: number
  origPanX: number
  origPanY: number
  drawId?: string
  drawIds?: string[]
  origX?: number
  origY?: number
  origMap?: Record<string, { x: number; y: number }>
  origW?: number
  origH?: number
  moved: boolean
  additive?: boolean
  paletteId?: string
  overBoard?: boolean
  endX?: number
  endY?: number
}

export interface MarqueeRect {
  left: number
  top: number
  width: number
  height: number
}

export interface PaletteDrag {
  drawingId: string
  x: number
  y: number
  overBoard: boolean
}

export interface BoardGesture {
  sidebarHover: boolean
  paletteRef: RefObject<HTMLElement | null>
  dragScale: (d: Drawing) => number
  marqueeRect: MarqueeRect | null
  paletteDrag: PaletteDrag | null
  handlePanStart: (e: React.PointerEvent) => void
  handleMarqueeStart: (e: React.PointerEvent) => void
  handleDrawStart: (e: React.PointerEvent, d: Drawing) => void
  handleResizeStart: (e: React.PointerEvent, d: Drawing) => void
  handlePalettePointerDown: (e: React.PointerEvent, d: Drawing) => void
}

export function useBoardGesture(host: BoardGestureHost): BoardGesture {
  const { view } = host
  const dragRef = useRef<BoardDrag | null>(null)
  const paletteRef = useRef<HTMLElement | null>(null)
  const [sidebarHover, setSidebarHover] = useState(false)
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const [paletteDrag, setPaletteDrag] = useState<PaletteDrag | null>(null)
  const lastMarqueeIdsRef = useRef<string[]>([])
  const hostRef = useRef(host)
  hostRef.current = host
  const pointerCountRef = useRef(0)

  useEffect(() => {
    const board = view.boardRef.current
    if (!board) return
    const onPointerDown = (e: PointerEvent) => {
      if (!board.contains(e.target as Node)) return
      pointerCountRef.current++
      if (pointerCountRef.current >= 2 && dragRef.current) {
        const drag = dragRef.current
        if (drag.kind === "palette" && drag.paletteId) {
          setPaletteDrag(null)
          hostRef.current.setDisplayDrawings((prev) => prev.filter((d) => d._id !== drag.paletteId))
        }
        dragRef.current = null
      }
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!board.contains(e.target as Node)) return
      pointerCountRef.current = Math.max(0, pointerCountRef.current - 1)
    }
    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [view.boardRef])

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

      if (drag.kind === "marquee") {
        const boardEl = v.boardRef.current
        if (!boardEl) return
        const rect = boardEl.getBoundingClientRect()
        const sx = drag.startX - rect.left
        const sy = drag.startY - rect.top
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        const left = Math.min(sx, cx)
        const top = Math.min(sy, cy)
        const width = Math.abs(cx - sx)
        const height = Math.abs(cy - sy)
        if (width + height > 4) drag.moved = true
        setMarqueeRect({ left, top, width, height })
        const v2 = v.viewRef.current
        const worldLeft = (left - v2.pan.x) / v2.zoom
        const worldTop = (top - v2.pan.y) / v2.zoom
        const worldWidth = width / v2.zoom
        const worldHeight = height / v2.zoom
        const items = hostRef.current.displayRef.current
        const matched = items.filter(
          (d) =>
            d.x < worldLeft + worldWidth &&
            d.x + d.width > worldLeft &&
            d.y < worldTop + worldHeight &&
            d.y + d.height > worldTop,
        )
        const nextIds = matched.map((d) => d._id)
        const prevIds = lastMarqueeIdsRef.current
        if (
          nextIds.length !== prevIds.length ||
          nextIds.some((id, i) => id !== prevIds[i])
        ) {
          lastMarqueeIdsRef.current = nextIds
          if (drag.additive) {
            hostRef.current.setSelectedIds((cur) => Array.from(new Set([...cur, ...nextIds])))
          } else {
            hostRef.current.setSelectedIds(nextIds)
          }
        }
      } else if (drag.kind === "pan") {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
        v.setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy })
      } else if (drag.kind === "draw" && drag.drawId) {
        const dx = (e.clientX - drag.startX) / zoomNow
        const dy = (e.clientY - drag.startY) / zoomNow
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
        const ids = drag.drawIds || [drag.drawId]
        const map = drag.origMap
        if (map && ids.length > 1) {
          setDisplayDrawings((prev) =>
            prev.map((d) => {
              const orig = map[d._id]
              if (!orig) return d
              return { ...d, x: orig.x + dx, y: orig.y + dy }
            }),
          )
        } else {
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
      } else if (drag.kind === "palette" && drag.paletteId) {
        drag.endX = e.clientX
        drag.endY = e.clientY
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.sqrt(dx * dx + dy * dy) > 6) drag.moved = true
        const boardEl = v.boardRef.current
        let overBoard = false
        if (boardEl) {
          const rect = boardEl.getBoundingClientRect()
          overBoard = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom && !isOverPalette(e.clientX, e.clientY)
        }
        drag.overBoard = overBoard
        setPaletteDrag({ drawingId: drag.paletteId, x: e.clientX, y: e.clientY, overBoard })

        if (drag.moved) {
          if (overBoard) {
            const source = h().inboxDrawingsRef.current.find((d) => d._id === drag.paletteId)
            if (source) {
              const rect = boardEl!.getBoundingClientRect()
              const { pan, zoom } = v.viewRef.current
              const worldX = (e.clientX - rect.left - pan.x) / zoom
              const worldY = (e.clientY - rect.top - pan.y) / zoom
              const item: Drawing = {
                _id: drag.paletteId,
                content: source.content,
                x: Math.round(worldX - (source.width || 320) / 2),
                y: Math.round(worldY - (source.height || 220) / 2),
                width: source.width,
                height: source.height,
                rotation: source.rotation || 0,
                authorName: source.authorName,
                createdAt: source.createdAt,
                z: h().pubBoardRef.current?.items.filter((it) => it._id !== drag.paletteId).reduce((m, it) => Math.max(m, it.z || 0), 0) ?? 0,
                transparent: source.transparent === true,
              }
              item.z = Math.max(item.z ?? 0, 0) + 1
              setDisplayDrawings((prev) => [...prev.filter((d) => d._id !== drag.paletteId), item])
            }
          } else {
            setDisplayDrawings((prev) => prev.filter((d) => d._id !== drag.paletteId))
          }
        }
      } else {
        setSidebarHover(false)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const hostCtx = h()
      const drag = dragRef.current
      if (!drag) return
      if (drag.kind === "marquee") {
        setMarqueeRect(null)
        lastMarqueeIdsRef.current = []
        setSidebarHover(false)
        dragRef.current = null
        return
      }

      if (drag.kind === "palette") {
        setPaletteDrag(null)
        const placed =
          !!drag.paletteId &&
          drag.moved &&
          drag.overBoard &&
          !!hostCtx.pubBoardRef.current
        if (placed) {
          const current = hostCtx.displayRef.current.filter((d) => d._id !== drag.paletteId)
          const item = hostCtx.displayRef.current.find((d) => d._id === drag.paletteId)
          if (item) {
            const final = [...current, item]
            hostCtx.setDisplayDrawings(() => final)
            hostCtx.saveDraftItems(final)
            hostCtx.commit(final)
          }
        } else {
          hostCtx.setDisplayDrawings((prev) => prev.filter((d) => d._id !== drag.paletteId))
        }
        dragRef.current = null
        return
      }

      const {
        displayRef,
        pubBoardRef,
        modeRef,
        setDisplayDrawings,
        saveDraftItems,
        persistNote,
        setSelectedIds,
      } = hostCtx
      const overPalette = isOverPalette(e.clientX, e.clientY)
      const ids = drag.drawIds || []

      if (drag.kind === "draw" && drag.drawId && drag.moved) {
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          if (modeRef.current === "public" && overPalette && ids.length <= 1) {
            const pub = pubBoardRef.current
            const drawId = drag.drawId
            if (pub) {
              const next = pub.items.filter((it) => it._id !== drawId)
              setDisplayDrawings(() => next)
              saveDraftItems(next)
              setSelectedIds((prev) => (prev.includes(drawId) ? prev.filter((id) => id !== drawId) : prev))
              hostCtx.commit(next)
            }
          } else if (modeRef.current === "public") {
            saveDraftItems(displayRef.current)
            hostCtx.commit(displayRef.current)
          } else {
            const movedIds = ids.length > 1 ? ids : [drag.drawId]
            for (const id of movedIds) {
              const item = displayRef.current.find((dd) => dd._id === id)
              if (item) {
                persistNote(id, {
                  x: Math.round(item.x),
                  y: Math.round(item.y),
                  positionSet: true,
                })
              }
            }
            hostCtx.commit(displayRef.current)
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
          hostCtx.commit(displayRef.current)
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
    host.setSelectedIds([])
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

  const handleMarqueeStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setSidebarHover(false)
    host.setSelectedIds([])
    host.setConfirmDeleteId(null)
    lastMarqueeIdsRef.current = []
    dragRef.current = {
      kind: "marquee",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: 0,
      origPanY: 0,
      moved: false,
      additive: e.shiftKey || e.metaKey || e.ctrlKey,
    }
    setMarqueeRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 })
  }

  const handleDrawStart = (e: React.PointerEvent, d: Drawing) => {
    if (host.getTool() === "marquee" && !host.getSelectedIds().includes(d._id)) return
    e.stopPropagation()
    if (e.button !== 0) return
    host.setConfirmDeleteId(null)
    host.setNewArrivals((prev) => prev.filter((n) => n._id !== d._id))

    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    if (additive) {
      host.toggleSelect(d._id)
      return
    }

    const ids = host.getSelectedIds()
    const inGroup = ids.length > 1 && ids.includes(d._id)

    if (inGroup) {
      const map: Record<string, { x: number; y: number }> = {}
      const current = host.displayRef.current
      for (const id of ids) {
        const item = current.find((dd) => dd._id === id)
        if (item) map[id] = { x: item.x, y: item.y }
      }
      dragRef.current = {
        kind: "draw",
        startX: e.clientX,
        startY: e.clientY,
        origPanX: view.pan.x,
        origPanY: view.pan.y,
        drawId: d._id,
        drawIds: ids,
        origMap: map,
        moved: false,
      }
      return
    }

    host.setSelectedIds([d._id])
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
    if (host.getTool() === "marquee" && !host.getSelectedIds().includes(d._id)) return
    e.stopPropagation()
    if (e.button !== 0) return
    host.setSelectedIds([d._id])
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

  const handlePalettePointerDown = (e: React.PointerEvent, d: Drawing) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.button !== 0) return
    dragRef.current = {
      kind: "palette",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: 0,
      origPanY: 0,
      paletteId: d._id,
      overBoard: false,
      endX: e.clientX,
      endY: e.clientY,
      moved: false,
    }
    setPaletteDrag({ drawingId: d._id, x: e.clientX, y: e.clientY, overBoard: false })
  }

  return {
    sidebarHover,
    paletteRef,
    dragScale,
    marqueeRect,
    paletteDrag,
    handlePanStart,
    handleMarqueeStart,
    handleDrawStart,
    handleResizeStart,
    handlePalettePointerDown,
  }
}
