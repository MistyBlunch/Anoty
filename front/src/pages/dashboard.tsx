import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import { Inbox, Globe, LogOut, RefreshCw, Copy, Check } from "lucide-react"
import { sanitizeSvg } from "@/lib/svg"
import { findVisibleFreeSlot, isTransparent, type Drawing } from "@/lib/board"

import { useAuth } from "@/hooks/useAuth"
import { useZoomPan } from "@/hooks/useZoomPan"
import { useFitToContent } from "@/hooks/useFitToContent"
import { useClipboard } from "@/hooks/useClipboard"
import { useResizeObserver } from "@/hooks/useResizeObserver"
import { useDrawings } from "@/hooks/useDrawings"
import { useNotifications } from "@/hooks/useNotifications"
import { usePublicBoard } from "@/hooks/usePublicBoard"
import { useBoardGesture } from "@/hooks/useBoardGesture"

import HeaderShell from "@/components/layout/HeaderShell"
import HintBar from "@/components/board/HintBar"
import NotesCanvas from "@/components/board/NotesCanvas"
import ZoomControls from "@/components/board/ZoomControls"
import EmptyBoard from "@/components/board/EmptyBoard"
import NotificationsDropdown from "@/components/dashboard/NotificationsDropdown"
import ActionsMenu from "@/components/dashboard/ActionsMenu"
import PublicSidebar from "@/components/dashboard/PublicSidebar"
import PublicControls from "@/components/dashboard/PublicControls"

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isReady } = useAuth()

  const [mode, setMode] = useState<"inbox" | "public">("inbox")
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dragNoteId, setDragNoteId] = useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [menuDims, setMenuDims] = useState({ w: 0, h: 0 })
  const actionsMenuRef = useRef<HTMLDivElement>(null)

  const view = useZoomPan({ wheel: true })
  const { fitToContent, focusOn } = useFitToContent(view)
  const { copied: shareCopied, copy: copyShare } = useClipboard(2500)
  const publicClipboard = useClipboard(1500)

  const findVisibleSlot = useCallback(
    (w: number, h: number, rects: Array<{ x: number; y: number; w: number; h: number }>) => {
      const board = view.boardRef.current
      if (!board) return null
      const rect = board.getBoundingClientRect()
      const { pan, zoom } = view.viewRef.current
      return findVisibleFreeSlot(rect.width, rect.height, pan, zoom, w, h, rects)
    },
    [view],
  )

  const {
    drawings,
    setDrawings,
    newArrivals,
    setNewArrivals,
    isLoading,
    refresh,
    markAllSeen,
    deleteNote,
    persistNote,
    pulseId,
    setPulseId,
    pulseTimerRef,
  } = useDrawings({ user, fitToContent, findVisibleSlot })

  useNotifications(user, () => refresh(true))

  const {
    board,
    setBoard,
    boardLoading,
    boardTitle,
    setBoardTitle,
    savingBoard,
    savedFeed,
    pubBoardRef,
    saveDraftItems,
    savePublicBoard,
    togglePublish,
    copyPublicLink,
  } = usePublicBoard({
    user,
    mode,
    fitToContent,
    copy: publicClipboard.copy,
    getDisplayItems: () => displayRef.current,
  })

  const displayDrawings = mode === "inbox" ? drawings : (board?.items ?? [])
  const displayRef = useRef(displayDrawings)
  displayRef.current = displayDrawings
  const inboxDrawingsRef = useRef(drawings)
  inboxDrawingsRef.current = drawings

  const setDisplayDrawings = useCallback(
    (updater: (prev: Drawing[]) => Drawing[]) => {
      if (modeRef.current === "public") {
        setBoard((prev) => (prev ? { ...prev, items: updater(prev.items) } : prev))
      } else {
        setDrawings(updater)
      }
    },
    [setBoard, setDrawings],
  )

  const gesture = useBoardGesture({
    view,
    inboxDrawingsRef,
    displayRef,
    pubBoardRef,
    modeRef,
    setDisplayDrawings,
    persistNote,
    saveDraftItems,
    setSelectedId,
    setConfirmDeleteId,
    setNewArrivals,
    setDragNoteId,
  })

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
    [selectedId],
  )

  const paletteDrawings =
    mode === "public"
      ? drawings.filter((d) => !pubBoardRef.current?.items.some((it) => it._id === d._id))
      : []

  const selectedDrawing = displayDrawings.find((d) => d._id === selectedId) || null

  const selectedMenuPos = useMemo(() => {
    if (!selectedDrawing) return null
    const board = view.boardRef.current
    if (!board) return null
    const rect = board.getBoundingClientRect()
    const W = rect.width
    const mw = menuDims.w || 300
    const mh = menuDims.h || 120
    const { zoom, pan } = view.viewRef.current
    const sx = selectedDrawing.x * zoom + pan.x
    const sy = selectedDrawing.y * zoom + pan.y
    const cw = selectedDrawing.width * zoom
    const ch = selectedDrawing.height * zoom
    const centerX = sx + cw / 2
    const left = Math.max(mw / 2 + 8, Math.min(W - mw / 2 - 8, centerX))
    const above = sy - 12 - mh >= 8
    const top = above ? sy - 12 : sy + ch + 12
    return { left, top, above }
  }, [selectedDrawing, menuDims, view])

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/send/${user?.username}`
    : `/send/${user?.username}`

  const copyShareLink = () => {
    copyShare(shareUrl)
  }

  const focusDrawing = useCallback(
    (d: Drawing) => {
      setMode("inbox")
      markAllSeen()
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
      setPulseId(d._id)
      pulseTimerRef.current = window.setTimeout(() => setPulseId(null), 3000)
      focusOn(d)
      setSelectedId(d._id)
      setConfirmDeleteId(null)
      setNotificationsOpen(false)
    },
    [markAllSeen, focusOn, pulseTimerRef, setPulseId, setSelectedId, setConfirmDeleteId],
  )

  const handleClearNotifications = () => {
    markAllSeen()
    setNewArrivals([])
    setNotificationsOpen(false)
  }

  const handleDeleteNote = async (d: Drawing) => {
    const ok = await deleteNote(d._id)
    if (ok) {
      setSelectedId(null)
      setConfirmDeleteId(null)
    } else {
      alert("Error al eliminar el dibujo")
    }
  }

  const removeFromPublicBoard = useCallback(
    (d: Drawing) => {
      const pub = pubBoardRef.current
      if (!pub) return
      const next = pub.items.filter((it) => it._id !== d._id)
      setBoard((prev) => (prev ? { ...prev, items: next } : prev))
      saveDraftItems(next)
      setSelectedId(null)
      setConfirmDeleteId(null)
    },
    [pubBoardRef, setBoard, saveDraftItems, setSelectedId, setConfirmDeleteId],
  )

  const handleExportSvg = (d: Drawing) => {
    const blob = new Blob([sanitizeSvg(d.content)], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `dibujo-anoty.svg`
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
      link.download = `dibujo-anoty.png`
      link.click()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      alert("No se pudo convertir el dibujo a PNG")
    }
    img.src = url
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
        saveDraftItems(
          b.items.map((x) => {
            if (x._id === d._id) return { ...x, z: dZ }
            if (x._id === neighbor._id) return { ...x, z: nZ }
            return x
          }),
        )
      }
      return
    }

    persistNote(d._id, { z: dZ })
    persistNote(neighbor._id, { z: nZ })
  }

  const toggleDrawingBackground = (d: Drawing) => {
    const next = !isTransparent(d)
    setDisplayDrawings((prev) =>
      prev.map((x) => (x._id === d._id ? { ...x, transparent: next } : x)),
    )
    if (mode === "public") {
      const b = pubBoardRef.current
      if (b) saveDraftItems(b.items.map((x) => (x._id === d._id ? { ...x, transparent: next } : x)))
      return
    }
    persistNote(d._id, { transparent: next })
  }

  if (!user) return null

  const hintText =
    mode === "public"
      ? "Arrastra tus dibujos desde el panel izquierdo • Mueve y reordena como quieras"
      : "Mantén y arrastra el fondo para moverte • Rueda para zoom • Arrastra un dibujo para moverlo"

  if (!isReady) {
    return (
      <>
        <Head>
          <title>Mi Muro Privado – Anoty</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
          <HeaderShell center={<span className="text-slate-400 text-sm">Validando sesión...</span>} />
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Mi Muro Privado – Anoty</title>
        <meta name="description" content="Tu tablero privado de dibujos anónimos." />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
        <HeaderShell
          onLogoClick={() => router.push("/")}
          right={
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
                  Mis anotys
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

              <NotificationsDropdown
                user={user}
                newArrivals={newArrivals}
                open={notificationsOpen}
                onToggle={() => {
                  setMode("inbox")
                  setNotificationsOpen((o) => !o)
                }}
                onFocus={focusDrawing}
                onClear={handleClearNotifications}
              />

              <button
                onClick={logout}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          }
        />

        <main className="flex-1 relative overflow-hidden select-none">
          <HintBar text={hintText} />

          {mode === "public" && (
            <PublicSidebar
              innerRef={gesture.paletteRef}
              hovered={gesture.sidebarHover}
              title={boardTitle}
              onTitleChange={setBoardTitle}
              paletteDrawings={paletteDrawings}
              dragNoteId={dragNoteId}
              onPaletteDragStart={(e, d) => {
                e.dataTransfer.setData("text/plain", d._id)
                e.dataTransfer.effectAllowed = "move"
                setDragNoteId(d._id)
              }}
              onPaletteDragEnd={() => setDragNoteId(null)}
              saving={savingBoard}
              savedFeed={savedFeed}
              onSave={savePublicBoard}
            />
          )}

          {selectedDrawing && selectedMenuPos && (
            <ActionsMenu
              innerRef={actionsMenuRef}
              drawing={selectedDrawing}
              mode={mode}
              confirmDeleteVisible={confirmDeleteId === selectedDrawing._id}
              pos={selectedMenuPos}
              onExportSvg={handleExportSvg}
              onExportPng={handleExportPng}
              onToggleBackground={toggleDrawingBackground}
              onMoveLayer={moveLayer}
              onRequestDelete={(d) => setConfirmDeleteId(d._id)}
              onConfirmDelete={handleDeleteNote}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onRemovePublic={removeFromPublicBoard}
            />
          )}

          <ZoomControls zoom={view.zoom} onZoom={view.handleZoom} />

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

          <div
            ref={view.boardRef}
            onPointerDown={gesture.handlePanStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={mode === "public" ? gesture.handleDrop : undefined}
            className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-50"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <NotesCanvas
              items={displayDrawings}
              pan={view.pan}
              zoom={view.zoom}
              zIndex={gesture.sidebarHover ? 30 : 0}
              interactive
              selectedId={selectedId}
              pulseId={pulseId}
              scaleOf={gesture.dragScale}
              onDrawStart={gesture.handleDrawStart}
              onResizeStart={gesture.handleResizeStart}
            />
          </div>

          {!isLoading && displayDrawings.length === 0 && !dragNoteId && (
            <EmptyBoard
              variant={mode === "public" ? "public" : "inbox"}
              shifted={mode === "public"}
              copied={shareCopied}
              onCopyShare={copyShareLink}
            />
          )}

          {mode === "inbox" && drawings.length > 0 && (
            <button
              onClick={copyShareLink}
              className="absolute bottom-5 left-5 z-30 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-lg hover:border-teal-500/50 hover:text-teal-700 transition-all cursor-pointer"
            >
              {shareCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{shareCopied ? "¡Copiado!" : "Copiar enlace para compartir"}</span>
            </button>
          )}

          {mode === "public" && board && !boardLoading && (
            <PublicControls
              copied={publicClipboard.copied}
              isPublished={board.isPublished}
              onCopy={copyPublicLink}
              onToggle={togglePublish}
            />
          )}
        </main>
      </div>
    </>
  )
}