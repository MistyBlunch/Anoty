import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import Image from "next/image"
import {
  MessageSquareHeart,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Trash2,
  Sparkles,
  Download,
  FileImage,
  Hand,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Palette,
  Inbox,
  Globe,
  Share2,
  GitBranch,
  Settings,
  Save,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { sanitizeSvg, normalizeSvgTransform } from "../lib/svg"

interface Drawing {
  _id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  authorName?: string
  createdAt: string
  isSeen?: boolean
  positionSet?: boolean
  z?: number
  transparent?: boolean | null
}

interface UserState {
  id: string
  username: string
  name?: string
  email?: string
  avatar?: string
}

interface PublicBoardData {
  _id: string
  slug: string
  title: string
  isPublished: boolean
  items: Drawing[]
}

const BOARD_LIMIT = 100000
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserState | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [newArrivals, setNewArrivals] = useState<Drawing[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarHover, setSidebarHover] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [mode, setMode] = useState<"inbox" | "public">("inbox")
  const [board, setBoard] = useState<PublicBoardData | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardTitle, setBoardTitle] = useState("")
  const [savingBoard, setSavingBoard] = useState(false)
  const [savedFeed, setSavedFeed] = useState(false)
  const [dragNoteId, setDragNoteId] = useState<string | null>(null)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const pulseTimerRef = useRef<number | null>(null)

  const isTransparent = (d: Drawing) => d.transparent === true

  const fitNoteSize = (w: number | undefined, h: number | undefined) => {
    const maxW = 520
    const maxH = 420
    const ww = Math.max(40, Number(w) || 320)
    const hh = Math.max(40, Number(h) || 220)
    const k = Math.min(1, maxW / ww, maxH / hh)
    return { width: Math.round(ww * k), height: Math.round(hh * k) }
  }

  const boardRef = useRef<HTMLDivElement>(null)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const [menuDims, setMenuDims] = useState({ w: 0, h: 0 })
  const viewRef = useRef({ pan, zoom })
  viewRef.current = { pan, zoom }
  const knownIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const displayDrawings = mode === "inbox" ? drawings : (board?.items ?? [])
  const displayRef = useRef(displayDrawings)
  displayRef.current = displayDrawings
  const pubBoardRef = useRef<PublicBoardData | null>(null)
  pubBoardRef.current = board
  const paletteRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
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
  } | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

  useEffect(() => {
    const saved = localStorage.getItem("user")
    if (!saved) {
      router.push("/")
      return
    }
    const parsed = JSON.parse(saved)
    setUser(parsed)
  }, [])

const placeDrawings = useCallback(
        (items: Drawing[]): Drawing[] => {
          const placed: Array<{ x: number; y: number; w: number; h: number }> = []
          const GAP = 14
          const MAX_ROW_WIDTH = 2000
          const sorted = [...items].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )

          const collides = (x: number, y: number, w: number, h: number) =>
            placed.some(
              (r) => x < r.x + r.w + GAP && x + w + GAP > r.x && y < r.y + r.h + GAP && y + h + GAP > r.y,
            )

          const findFreeSlot = (w: number, h: number) => {
            for (let cy = 0; cy < BOARD_LIMIT; cy += 14) {
              for (let cx = 0; cx < MAX_ROW_WIDTH; cx += 14) {
                if (!collides(cx, cy, w, h)) return { x: cx, y: cy }
              }
            }
            return { x: 0, y: 0 }
          }

          return sorted.map((d) => {
            const w = d.width || 320
            const h = d.height || 220
            const hasPosition = Boolean(d.positionSet) || d.x !== 0 || d.y !== 0

            if (hasPosition) {
              placed.push({ x: d.x, y: d.y, w, h })
              return d
            }

            const slot = findFreeSlot(w, h)
            placed.push({ x: slot.x, y: slot.y, w, h })
            return { ...d, x: slot.x, y: slot.y, positionSet: true }
          })
        },
        [],
      )

  const findVisibleFreeSlot = useCallback(
    (w: number, h: number, rects: Array<{ x: number; y: number; w: number; h: number }>) => {
      const board = boardRef.current
      if (!board) return null
      const rect = board.getBoundingClientRect()
      const { pan: p, zoom: z } = viewRef.current
      const GAP = 14

      const x0 = -p.x / z
      const y0 = -p.y / z
      const x1 = (rect.width - p.x) / z
      const y1 = (rect.height - p.y) / z

      const collides = (x: number, y: number) =>
        rects.some(
          (r) => x < r.x + r.w + GAP && x + w + GAP > r.x && y < r.y + r.h + GAP && y + h + GAP > r.y,
        )

      const isVisible = (x: number, y: number) => x >= x0 && y >= y0 && x + w <= x1 && y + h <= y1

      const vCenterX = (x0 + x1) / 2
      const vCenterY = (y0 + y1) / 2

      const centerSlot = () => ({
        x: Math.round(vCenterX - w / 2),
        y: Math.round(vCenterY - h / 2),
      })

      if (rects.length === 0) return centerSlot()

      const distToCenter = (r: { x: number; y: number; w: number; h: number }) =>
        Math.abs(r.x + r.w / 2 - vCenterX) + Math.abs(r.y + r.h / 2 - vCenterY)

      const sorted = [...rects].sort((a, b) => distToCenter(a) - distToCenter(b))

      for (const r of sorted) {
        const spots = [
          { x: r.x + r.w + GAP, y: r.y },
          { x: r.x - w - GAP, y: r.y },
          { x: r.x, y: r.y + r.h + GAP },
          { x: r.x, y: r.y - h - GAP },
        ]
        for (const spot of spots) {
          if (isVisible(spot.x, spot.y) && !collides(spot.x, spot.y)) {
            return { x: spot.x, y: spot.y }
          }
        }
      }

      const step = 28
      const H = 1500
      const sx0 = Math.max(x0, vCenterX - H)
      const sy0 = Math.max(y0, vCenterY - H)
      const sx1 = Math.min(x1, vCenterX + H)
      const sy1 = Math.min(y1, vCenterY + H)
      for (let cy = sy0; cy + h <= sy1; cy += step) {
        for (let cx = sx0; cx + w <= sx1; cx += step) {
          if (!collides(cx, cy)) return { x: cx, y: cy }
        }
      }

      const minX = Math.min(vCenterX - H, ...rects.map((r) => r.x - w - GAP))
      const minY = Math.min(vCenterY - H, ...rects.map((r) => r.y - h - GAP))
      const maxX = Math.max(vCenterX + H, ...rects.map((r) => r.x + r.w + GAP))
      const maxY = Math.max(vCenterY + H, ...rects.map((r) => r.y + r.h + GAP))
      for (let cy = minY; cy + h <= maxY; cy += step) {
        for (let cx = minX; cx + w <= maxX; cx += step) {
          if (!collides(cx, cy)) return { x: cx, y: cy }
        }
      }
      return null
    },
    [],
  )

  const fitToContent = useCallback((items: Drawing[]) => {
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height

    if (items.length === 0) {
      setZoom(0.8)
      setPan({ x: 0, y: 0 })
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const d of items) {
      const w = d.width || 320
      const h = d.height || 220
      minX = Math.min(minX, d.x)
      minY = Math.min(minY, d.y)
      maxX = Math.max(maxX, d.x + w)
      maxY = Math.max(maxY, d.y + h)
    }

    const boxW = maxX - minX
    const boxH = maxY - minY
    const padding = 60

    const fitX = (vw - padding) / (boxW + padding)
    const fitY = (vh - padding) / (boxH + padding)
    let newZoom = Math.min(fitX, fitY)
    newZoom = Math.min(newZoom, 1.25)
    newZoom = Math.max(newZoom, MIN_ZOOM)

    const centerX = minX + boxW / 2
    const centerY = minY + boxH / 2

    setZoom(newZoom)
    setPan({
      x: vw / 2 - centerX * newZoom,
      y: vh / 2 - centerY * newZoom,
    })
  }, [])

  const fetchBoard = useCallback(
    async (silent = false) => {
      if (!user) return
      if (!silent) setIsLoading(true)
      try {
        const response = await fetch(`${apiUrl}/board/my-notes/${user.username}`)
        const data = await response.json()
        if (data.success) {
          const items = (data.notes || [])
            .filter((n: any) => n.type === "drawing")
            .map((n: any) => {
              const size = fitNoteSize(n.width, n.height)
              return {
                _id: n._id,
                content: n.content || "",
                x: Number(n.x) || 0,
                y: Number(n.y) || 0,
                width: size.width,
                height: size.height,
                rotation: Number(n.rotation) || 0,
                authorName: n.authorName,
                createdAt: n.createdAt,
                isSeen: n.isSeen,
                positionSet: Boolean(n.positionSet),
                z: Number(n.z) || 0,
                transparent:
                  typeof n.transparent === "boolean" ? n.transparent : null,
              }
            })

          const isBaseline = knownIdsRef.current.size === 0
          const newNotys = isBaseline
            ? items.filter((it: Drawing) => it.isSeen === false)
            : items.filter((it: Drawing) => !knownIdsRef.current.has(it._id))
          items.forEach((it: Drawing) => knownIdsRef.current.add(it._id))

          const placed = placeDrawings(items)

          let nextZ = items.reduce((m: number, it: Drawing) => Math.max(m, it.z || 0), 0)
          placed.forEach((p: Drawing) => {
            const original = items.find((it: Drawing) => it._id === p._id)
            if (original && !original.positionSet) p.z = ++nextZ
          })

          if (isBaseline) {
            initializedRef.current = true
            fetch(`${apiUrl}/board/my-notes/${user.username}/seen`, { method: "POST" }).catch(() => {})
          }
          if (newNotys.length > 0) {
            const newIds = new Set(newNotys.map((n: Drawing) => n._id))
            const rects = placed
              .filter((p: Drawing) => !newIds.has(p._id))
              .map((p: Drawing) => ({ x: p.x, y: p.y, w: p.width || 320, h: p.height || 220 }))
            for (const noty of newNotys) {
              const slot = findVisibleFreeSlot(noty.width || 320, noty.height || 220, rects)
              if (slot) {
                const target = placed.find((p: Drawing) => p._id === noty._id)
                if (target) {
                  target.x = slot.x
                  target.y = slot.y
                  target.positionSet = true
                }
                rects.push({ x: slot.x, y: slot.y, w: noty.width || 320, h: noty.height || 220 })
              }
            }
            const arrivalDrawings = placed.filter((p: Drawing) => newIds.has(p._id))
            setNewArrivals((prev) => {
              const existing = new Set(prev.map((d) => d._id))
              const novel = arrivalDrawings.filter((d: Drawing) => !existing.has(d._id))
              return novel.length ? [...prev, ...novel] : prev
            })
          }

          setDrawings(placed)
          if (!silent) {
            fitToContent(placed)
          }
          placed
            .filter((p) => {
              const original = items.find((it: Drawing) => it._id === p._id)
              return original && !original.positionSet
            })
            .forEach((d) => {
              fetch(`${apiUrl}/board/notes/${d._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ x: Math.round(d.x), y: Math.round(d.y), positionSet: true, z: d.z || 0 }),
              }).catch(() => {})
            })
        }
      } catch (error) {
        console.error("Error al cargar el muro:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [user, apiUrl, placeDrawings, fitToContent, findVisibleFreeSlot],
  )

  useEffect(() => {
    if (user) fetchBoard()
  }, [user, fetchBoard])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/board/my-notes/${user.username}/unseen-count`)
        const data = await response.json()
        if (data.success && data.unseenDrawingCount > 0) {
          fetchBoard(true)
        }
      } catch (error) {
        console.error("Error al verificar dibujos nuevos:", error)
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [user, apiUrl, fetchBoard])

  useEffect(() => {
    const el = actionsMenuRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setMenuDims((prev) =>
        prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height },
      )
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selectedId])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor))
      const k = newZoom / zoom
      setPan((prev) => ({
        x: cx - (cx - prev.x) * k,
        y: cy - (cy - prev.y) * k,
      }))
      setZoom(newZoom)
    },
    [zoom],
  )

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    board.addEventListener("wheel", handleWheel, { passive: false })
    return () => board.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  const modeRef = useRef(mode)
  modeRef.current = mode

  const draggedId = dragRef.current?.kind === "draw" ? (dragRef.current.drawId || null) : null

  const dragScale = (d: Drawing) => {
    if (!sidebarHover || draggedId !== d._id) return 1
    const targetW = Math.max(40, (paletteRef.current?.offsetWidth || 256) - 24)
    return Math.min(1, targetW / Math.max(40, d.width))
  }

  const setDisplayDrawings = useCallback(
    (updater: (prev: Drawing[]) => Drawing[]) => {
      if (modeRef.current === "public") {
        setBoard((prev) => (prev ? { ...prev, items: updater(prev.items) } : prev))
      } else {
        setDrawings(updater)
      }
    },
    [],
  )

  useEffect(() => {
    const isOverPalette = (x: number, y: number) => {
      const r = paletteRef.current?.getBoundingClientRect()
      if (!r) return false
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      if (drag.kind === "pan") {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
        setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy })
      } else if (drag.kind === "draw" && drag.drawId) {
        const dx = (e.clientX - drag.startX) / zoom
        const dy = (e.clientY - drag.startY) / zoom
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          setDisplayDrawings((prev) =>
            prev.map((d) =>
              d._id === drag.drawId ? { ...d, x: (drag.origX || 0) + dx, y: (drag.origY || 0) + dy } : d,
            ),
          )
        }
        if (modeRef.current === "public") {
          setSidebarHover(isOverPalette(e.clientX, e.clientY))
        }
      } else if (drag.kind === "resize" && drag.drawId) {
        const dx = (e.clientX - drag.startX) / zoom
        const dy = (e.clientY - drag.startY) / zoom
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
      const drag = dragRef.current
      if (!drag) return
      const overPalette = isOverPalette(e.clientX, e.clientY)
      if (drag.kind === "draw" && drag.drawId && drag.moved) {
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          if (modeRef.current === "public" && overPalette) {
            const pub = pubBoardRef.current
            const drawId = drag.drawId
            if (pub) {
              const next = pub.items.filter((it) => it._id !== drawId)
              setBoard((prev) => (prev ? { ...prev, items: next } : prev))
              saveBoardItems(next)
              setSelectedId((prev) => (prev === drawId ? null : prev))
            }
          } else if (modeRef.current === "public") {
            saveBoardItems(displayRef.current)
          } else {
            fetch(`${apiUrl}/board/notes/${drag.drawId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ x: Math.round(current.x), y: Math.round(current.y), positionSet: true }),
            }).catch(() => {})
          }
        }
      } else if (drag.kind === "resize" && drag.drawId && drag.moved) {
        const current = displayRef.current.find((d) => d._id === drag.drawId)
        if (current) {
          if (modeRef.current === "public") {
            saveBoardItems(displayRef.current)
          } else {
            fetch(`${apiUrl}/board/notes/${drag.drawId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                width: Math.round(current.width),
                height: Math.round(current.height),
              }),
            }).catch(() => {})
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
  }, [zoom, apiUrl, setDisplayDrawings, setSelectedId, setBoard])

  const serializeBoardItems = (items: Drawing[]) =>
    items.map((it) => ({
      noteId: it._id,
      content: it.content,
      authorName: it.authorName,
      createdAt: it.createdAt,
      x: Math.round(it.x),
      y: Math.round(it.y),
      width: it.width,
      height: it.height,
      rotation: it.rotation || 0,
      z: it.z || 0,
      transparent: it.transparent === true,
    }))

  const saveBoardItems = useCallback((items: Drawing[]) => {
    const b = pubBoardRef.current
    if (!b) return
    fetch(`${apiUrl}/public-boards/${b._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftItems: serializeBoardItems(items),
      }),
    }).catch(() => {})
  }, [apiUrl])

  const savePublicBoard = async () => {
    const b = pubBoardRef.current
    if (!b) return
    const title = boardTitle.trim() || "Mi Muro Público"
    setSavingBoard(true)
    try {
      const res = await fetch(`${apiUrl}/public-boards/${b._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          draftTitle: title,
          items: serializeBoardItems(displayRef.current),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBoard((prev) => (prev ? { ...prev, title } : prev))
        setSavedFeed(true)
        setTimeout(() => setSavedFeed(false), 1800)
      }
    } finally {
      setSavingBoard(false)
    }
  }

  const normalizeBoardItems = (arr: any[]): Drawing[] =>
    arr.map((it) => {
      const size = fitNoteSize(it.width, it.height)
      return {
        _id: it.noteId,
        content: it.content || "",
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        width: size.width,
        height: size.height,
        rotation: Number(it.rotation) || 0,
        authorName: it.authorName,
        createdAt: it.createdAt || new Date().toISOString(),
        z: Number(it.z) || 0,
        transparent: typeof it.transparent === "boolean" ? it.transparent : null,
      }
    })

  const loadPublicBoard = useCallback(
    async (username: string) => {
      setBoardLoading(true)
      try {
        const res = await fetch(`${apiUrl}/public-boards/${username}`)
        const data = await res.json()
        let b = data.success && data.board ? data.board : null
        if (!b) {
          const created = await fetch(`${apiUrl}/public-boards/${username}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          })
          const createdData = await created.json()
          if (createdData.success) b = createdData.board
        }
        if (b) {
          const draftSrc =
            Array.isArray(b.draftItems) && b.draftItems.length ? b.draftItems : b.items || []
          setBoard({
            _id: b._id,
            slug: b.slug,
            title: b.title || "Mi Muro Público",
            isPublished: b.isPublished ?? true,
            items: normalizeBoardItems(draftSrc),
          })
          setBoardTitle(b.draftTitle || b.title || "Mi Muro Público")
        }
      } catch (error) {
        console.error("Error al cargar el muro público:", error)
      } finally {
        setBoardLoading(false)
      }
    },
    [apiUrl],
  )

  useEffect(() => {
    if (!user || mode !== "public") return
    loadPublicBoard(user.username)
  }, [user, mode, loadPublicBoard])

  useEffect(() => {
    if (mode === "public" && board && !boardLoading) {
      fitToContent(board.items)
    }
  }, [mode, board?._id, boardLoading, fitToContent])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData("text/plain")
    setDragNoteId(null)
    if (!noteId) return
    const source = drawings.find((d) => d._id === noteId)
    const boardEl = boardRef.current
    const pub = pubBoardRef.current
    if (!source || !boardEl || !pub) return
    const rect = boardEl.getBoundingClientRect()
    const { pan: p, zoom: z } = viewRef.current
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
      z: (pub.items.reduce((m, it) => Math.max(m, it.z || 0), 0)) + 1,
      transparent: source.transparent === true,
    }
    const next = [...pub.items, item]
    setBoard((prev) => (prev ? { ...prev, items: next } : prev))
    saveBoardItems(next)
  }

  const removeFromPublicBoard = (d: Drawing) => {
    const pub = pubBoardRef.current
    if (!pub) return
    const next = pub.items.filter((it) => it._id !== d._id)
    setBoard((prev) => (prev ? { ...prev, items: next } : prev))
    saveBoardItems(next)
    setSelectedId(null)
    setConfirmDeleteId(null)
  }

  const paletteDrawings =
    mode === "public"
      ? drawings.filter((d) => !pubBoardRef.current?.items.some((it) => it._id === d._id))
      : []

  const togglePublish = () => {
    const b = pubBoardRef.current
    if (!b) return
    const nextPublished = !b.isPublished
    setBoard((prev) => (prev ? { ...prev, isPublished: nextPublished } : prev))
    fetch(`${apiUrl}/public-boards/${b._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: nextPublished }),
    }).catch(() => {})
  }

  const copyPublicLink = async () => {
    const b = pubBoardRef.current
    if (!b) return
    const url = `${window.location.origin}/p/${b.slug}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handlePanStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setSelectedId(null)
    setConfirmDeleteId(null)
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
    setSelectedId(d._id)
    setConfirmDeleteId(null)
    setNewArrivals((prev) => prev.filter((n) => n._id !== d._id))
    dragRef.current = {
      kind: "draw",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      drawId: d._id,
      origX: d.x,
      origY: d.y,
      moved: false,
    }
  }

  const handleResizeStart = (e: React.PointerEvent, d: Drawing) => {
    e.stopPropagation()
    if (e.button !== 0) return
    setSelectedId(d._id)
    setConfirmDeleteId(null)
    dragRef.current = {
      kind: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      drawId: d._id,
      origX: d.x,
      origY: d.y,
      origW: d.width,
      origH: d.height,
      moved: false,
    }
  }

  const handleZoom = (factor: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor))
    const k = newZoom / zoom
    setPan((prev) => ({
      x: cx - (cx - prev.x) * k,
      y: cy - (cy - prev.y) * k,
    }))
    setZoom(newZoom)
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`${apiUrl}/board/notes/${noteId}`, { method: "DELETE" })
      const data = await response.json()
      if (data.success) {
        setDrawings((prev) => prev.filter((d) => d._id !== noteId))
        setSelectedId(null)
        setConfirmDeleteId(null)
      } else {
        alert("Error al eliminar el dibujo")
      }
    } catch (error) {
      console.error("Error al eliminar el dibujo:", error)
      alert("Error al eliminar el dibujo")
    }
  }

  const handleExportSvg = (d: Drawing) => {
    const blob = new Blob([sanitizeSvg(d.content)], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dibujo-noty.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPng = (d: Drawing) => {
    const svg = sanitizeSvg(d.content)
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const img = new window.Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement("canvas")
      canvas.width = d.width * scale
      canvas.height = d.height * scale
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      if (!isTransparent(d)) {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `dibujo-noty.png`
      link.click()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      alert("No se pudo convertir el dibujo a PNG")
    }
    img.src = url
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/send/${user?.username}`
      : `/send/${user?.username}`

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const focusDrawing = (d: Drawing) => {
    setMode("inbox")
    if (user) {
      fetch(`${apiUrl}/board/my-notes/${user.username}/seen`, { method: "POST" }).catch(() => {})
    }
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    setPulseId(d._id)
    pulseTimerRef.current = window.setTimeout(() => setPulseId(null), 3000)
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height
    const w = d.width || 320
    const h = d.height || 220
    const padding = 60
    const fitX = (vw - padding) / (w + padding)
    const fitY = (vh - padding) / (h + padding)
    let newZoom = Math.min(fitX, fitY)
    newZoom = Math.min(newZoom, 1.25)
    newZoom = Math.max(newZoom, MIN_ZOOM)

    setZoom(newZoom)
    setPan({
      x: vw / 2 - (d.x + w / 2) * newZoom,
      y: vh / 2 - (d.y + h / 2) * newZoom,
    })
    setSelectedId(d._id)
    setConfirmDeleteId(null)
    setNotificationsOpen(false)
  }

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    }
  }, [])

  const handleClearNotifications = () => {
    if (user) {
      fetch(`${apiUrl}/board/my-notes/${user.username}/seen`, { method: "POST" }).catch(() => {})
    }
    setNewArrivals([])
    setNotificationsOpen(false)
  }

  const moveLayer = (d: Drawing, dir: "front" | "back") => {
    const sorted = [...displayDrawings].sort((a, b) => (a.z || 0) - (b.z || 0))
    const idx = sorted.findIndex((x) => x._id === d._id)
    if (idx === -1) return
    const neighbor = sorted[dir === "front" ? idx + 1 : idx - 1]
    if (!neighbor) return

    let dZ = d.z || 0
    let nZ = neighbor.z || 0
    if (nZ === dZ) {
      dZ = dir === "front" ? nZ + 1 : nZ - 1
    } else {
      const tmp = dZ
      dZ = nZ
      nZ = tmp
    }

    setDisplayDrawings((prev) =>
      prev.map((x) => {
        if (x._id === d._id) return { ...x, z: dZ }
        if (x._id === neighbor._id) return { ...x, z: nZ }
        return x
      }),
    )

    if (mode === "public") {
      const b = pubBoardRef.current
      if (b) {
        saveBoardItems(
          b.items.map((x) => {
            if (x._id === d._id) return { ...x, z: dZ }
            if (x._id === neighbor._id) return { ...x, z: nZ }
            return x
          }),
        )
      }
      return
    }

    const patches: Array<{ id: string; z: number }> = [
      { id: d._id, z: dZ },
      { id: neighbor._id, z: nZ },
    ]
    patches.forEach((p) => {
      fetch(`${apiUrl}/board/notes/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ z: p.z }),
      }).catch(() => {})
    })
  }

  const toggleDrawingBackground = (d: Drawing) => {
    const next = !isTransparent(d)
    setDisplayDrawings((prev) => prev.map((x) => (x._id === d._id ? { ...x, transparent: next } : x)))
    if (mode === "public") {
      const b = pubBoardRef.current
      if (b) saveBoardItems(b.items.map((x) => (x._id === d._id ? { ...x, transparent: next } : x)))
      return
    }
    fetch(`${apiUrl}/board/notes/${d._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transparent: next }),
    }).catch(() => {})
  }

  const selectedDrawing = displayDrawings.find((d) => d._id === selectedId) || null

  const selectedMenuPos = (() => {
    if (!selectedDrawing) return null
    const board = boardRef.current
    if (!board) return null
    const rect = board.getBoundingClientRect()
    const W = rect.width
    const mw = menuDims.w || 300
    const mh = menuDims.h || 120
    const sx = selectedDrawing.x * zoom + pan.x
    const sy = selectedDrawing.y * zoom + pan.y
    const cw = selectedDrawing.width * zoom
    const ch = selectedDrawing.height * zoom
    const centerX = sx + cw / 2
    const left = Math.max(mw / 2 + 8, Math.min(W - mw / 2 - 8, centerX))
    const above = sy - 12 - mh >= 8
    const top = above ? sy - 12 : sy + ch + 12
    return { left, top, above }
  })()

  if (!user) return null

  return (
    <>
      <Head>
        <title>Mi Muro Privado – Noty</title>
        <meta name="description" content="Tu tablero privado de dibujos anónimos." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <MessageSquareHeart className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                Noty<span className="text-cyan-500">.</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setMode("inbox")
                    fitToContent(drawings)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === "inbox"
                      ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Mis notys
                </button>
                <button
                  onClick={() => setMode("public")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === "public"
                      ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Muro público
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setMode("inbox")
                    setNotificationsOpen((o) => !o)
                  }}
                  className="relative flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm hover:border-teal-500/50 transition-colors cursor-pointer"
                  title="Notificaciones"
                >
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Avatar"
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-slate-700">@{user.username}</span>
                  {newArrivals.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {newArrivals.length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Dibujos nuevos</span>
                        {newArrivals.length > 0 && (
                          <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                            {newArrivals.length}
                          </span>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {newArrivals.length === 0 ? (
                          <p className="p-6 text-center text-xs text-slate-400">
                            Sin notificaciones nuevas.
                          </p>
                        ) : (
                          newArrivals.map((n) => (
                            <button
                              key={n._id}
                              onClick={() => focusDrawing(n)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 cursor-pointer"
                            >
                              <div
                                className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0"
                                dangerouslySetInnerHTML={{
                                  __html: normalizeSvgTransform(sanitizeSvg(n.content)),
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">
                                  {n.authorName || "Amigo Anónimo"}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(n.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      {newArrivals.length > 0 && (
                        <button
                          onClick={handleClearNotifications}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Limpiar notificaciones
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Board */}
        <main className="flex-1 relative overflow-hidden select-none">
          {/* Hint bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-600 shadow-md pointer-events-none">
            <Hand className="w-3.5 h-3.5 text-teal-600" />
            <span>
              {mode === "public"
                ? "Arrastra tus dibujos desde el panel izquierdo • Mueve y reordena como quieras"
                : "Mantén y arrastra el fondo para moverte • Rueda para zoom • Arrastra un dibujo para moverlo"}
            </span>
          </div>

          {/* Public palette */}
          {mode === "public" && (
            <aside
              ref={paletteRef}
              className={`absolute left-0 top-0 bottom-0 z-20 w-64 bg-white/95 backdrop-blur border-r flex flex-col overflow-hidden shadow-lg transition-shadow ${
                sidebarHover ? "border-teal-500/70 ring-2 ring-teal-500/40" : "border-slate-200"
              }`}
            >
              {sidebarHover && (
                <div className="absolute inset-x-0 top-2 z-30 flex justify-center pointer-events-none">
                  <span className="bg-teal-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg ring-2 ring-teal-400/50">
                    Suelta para quitar
                  </span>
                </div>
              )}
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-teal-600" />
                  Configuración
                </p>
                <label className="block">
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Nombre de tu muro
                  </span>
                  <input
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    maxLength={80}
                    placeholder="Mi Muro Público"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all"
                  />
                </label>
              </div>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-teal-600" />
                  Tus dibujos
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Arrastra uno al muro</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                {paletteDrawings.length === 0 ? (
                  <p className="col-span-2 text-center text-[11px] text-slate-400 py-6">
                    No tienes dibujos sin colocar.
                  </p>
                ) : (
                  paletteDrawings.map((d) => (
                    <div
                      key={d._id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", d._id)
                        e.dataTransfer.effectAllowed = "move"
                        setDragNoteId(d._id)
                      }}
                      onDragEnd={() => setDragNoteId(null)}
                      className={`aspect-[4/3] rounded-lg border bg-white overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                        dragNoteId === d._id ? "opacity-40 border-teal-500/50" : "border-slate-200 hover:border-teal-500/50"
                      }`}
                      title="Arrastrar al muro"
                    >
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{
                          __html: normalizeSvgTransform(sanitizeSvg(d.content)),
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-slate-100">
                <button
                  onClick={savePublicBoard}
                  disabled={savingBoard}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    savedFeed ? "bg-emerald-500" : "bg-teal-600"
                  }`}
                >
                  {savingBoard ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : savedFeed ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {savingBoard ? "Guardando..." : savedFeed ? "¡Guardado!" : "Guardar muro"}
                  </span>
                </button>
              </div>
            </aside>
          )}

{/* Selected drawing actions */}
          {selectedDrawing && selectedMenuPos && (
            <div
              ref={actionsMenuRef}
              className="absolute z-40 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5"
              style={{
                left: selectedMenuPos.left,
                top: selectedMenuPos.top,
                transform: selectedMenuPos.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
              }}
            >
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleExportSvg(selectedDrawing)}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  SVG
                </button>
                <button
                  onClick={() => handleExportPng(selectedDrawing)}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <FileImage className="w-4 h-4" />
                  PNG
                </button>
                <button
                  onClick={() => toggleDrawingBackground(selectedDrawing)}
                  className={`flex items-center justify-center gap-1 text-xs font-semibold border px-2 py-2 rounded-lg transition-colors cursor-pointer ${
                    isTransparent(selectedDrawing)
                      ? "text-teal-700 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20"
                      : "text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200"
                  }`}
                  title="Alternar fondo del dibujo"
                >
                  <Palette className="w-4 h-4" />
                  {isTransparent(selectedDrawing) ? "Fondo" : "Quitar fondo"}
                </button>
                <button
                  onClick={() => moveLayer(selectedDrawing, "back")}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Mover una capa hacia atrás"
                >
                  <ArrowDown className="w-4 h-4" />
                  Atrás
                </button>
                <button
                  onClick={() => moveLayer(selectedDrawing, "front")}
                  className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                  title="Mover una capa hacia adelante"
                >
                  <ArrowUp className="w-4 h-4" />
                  Adelante
                </button>
                {mode === "inbox" ? (
                  confirmDeleteId === selectedDrawing._id ? (
                    <div className="col-span-3 flex items-center justify-center gap-1 bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-2">
                      <span className="text-xs font-semibold text-red-600">¿Eliminar dibujo?</span>
                      <button
                        onClick={() => handleDeleteNote(selectedDrawing._id)}
                        className="text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selectedDrawing._id)}
                      className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => removeFromPublicBoard(selectedDrawing)}
                    className="flex items-center justify-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <GitBranch className="w-4 h-4" />
                    Quitar del muro
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-lg">
            <button
              onClick={() => handleZoom(1.2)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-center text-[10px] font-bold text-slate-500 py-0.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => handleZoom(1 / 1.2)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Loading overlay centered in viewport */}
          {(isLoading || (mode === "public" && boardLoading)) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                <p className="text-slate-600 text-sm">
                  {mode === "public" ? "Cargando tu muro público..." : "Cargando tu muro..."}
                </p>
              </div>
            </div>
          )}

          {/* The infinite board */}
          <div
            ref={boardRef}
            onPointerDown={handlePanStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={mode === "public" ? handleDrop : undefined}
            className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-50"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                zIndex: sidebarHover ? 30 : 0,
              }}
            >
              <AnimatePresence>
                {displayDrawings.map((d) => {
                  const isSelected = d._id === selectedId
                  const isPulsing = pulseId === d._id
                  const scaled = dragScale(d)
                  return (
                    <motion.div
                      key={d._id}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: scaled }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                      className="absolute cursor-move"
                      style={{
                        left: d.x,
                        top: d.y,
                        width: d.width,
                        height: d.height,
                        touchAction: "none",
                        zIndex: d.z || 0,
                      }}
                      onPointerDown={(e) => handleDrawStart(e, d)}
                    >
                      <div
className={`w-full h-full rounded-xl overflow-hidden ${
          isTransparent(d) ? "bg-transparent" : "bg-white shadow-lg"
        } ${
                          isPulsing
                            ? "ring-2 ring-cyan-400 arrival-pulse"
                            : isSelected
                              ? "ring-2 ring-teal-500 shadow-2xl"
                              : ""
                        }`}
                        style={{ transform: `rotate(${d.rotation || 0}deg)` }}
                      >
                        <div
                          className="w-full h-full"
                          dangerouslySetInnerHTML={{
                            __html: normalizeSvgTransform(sanitizeSvg(d.content)),
                          }}
                        />
                      </div>
                      {isSelected && (
                        <div
                          onPointerDown={(e) => handleResizeStart(e, d)}
                          className="absolute -bottom-2 -right-2 z-10 w-5 h-5 bg-white border-2 border-teal-500 rounded-md shadow flex items-center justify-center cursor-nwse-resize"
                          style={{ touchAction: "none" }}
                          title="Redimensionar"
                        >
                          <div className="w-2 h-2 border-r-2 border-b-2 border-teal-500" />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Empty board card centered in viewport */}
          {!isLoading && displayDrawings.length === 0 && !dragNoteId && (
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none ${
                mode === "public" ? "left-64" : ""
              }`}
            >
              <div
                className="glass-card rounded-3xl p-10 text-center border border-slate-200 max-w-md pointer-events-auto"
                style={{ width: 480 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                {mode === "public" ? (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Tu muro público está vacío</h3>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                      Arrastra aquí tus dibujos desde el panel izquierdo para crear tu muro visible por
                      cualquiera en Internet.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Tu muro aún está vacío</h3>
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                      Comparte tu enlace para que tus amigos te envíen dibujos anónimos. Llegan directo a
                      este tablero y podrás moverlos como quieras.
                    </p>
                    <button
                      onClick={copyShareLink}
                      className="gradient-button text-white font-semibold px-6 py-3 rounded-xl text-sm inline-flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{copied ? "¡Copiado!" : "Copiar mi enlace personal"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Share link floating (inbox) */}
          {mode === "inbox" && drawings.length > 0 && (
            <button
              onClick={copyShareLink}
              className="absolute bottom-5 left-5 z-30 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-lg hover:border-teal-500/50 hover:text-teal-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "¡Copiado!" : "Copiar enlace para compartir"}</span>
            </button>
          )}

          {/* Public controls */}
          {mode === "public" && board && !boardLoading && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
              <button
                onClick={copyPublicLink}
                className={`flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                  copied
                    ? "text-emerald-600 border-emerald-300"
                    : "text-slate-700 hover:border-teal-500/50 hover:text-teal-700"
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? "¡Copiado!" : "Copiar enlace público"}</span>
              </button>
              <button
                onClick={togglePublish}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-lg border transition-all cursor-pointer ${
                  !board.isPublished
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
                title={!board.isPublished ? "Muro visible públicamente" : "Muro oculto (solo tú lo ves)"}
              >
                <Globe className="w-4 h-4" />
                {!board.isPublished ? "Publicar" : "Ocultar"}
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  )
}