import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import { RefreshCw, Copy, Check } from "lucide-react"
import { findVisibleFreeSlot, hintForTool, type Drawing } from "@/lib/board"
import { downloadSelectionAsPng } from "@/lib/export"
import { isNewerUpdatedAt } from "@/lib/realtime"

import { useAuth } from "@/hooks/useAuth"
import { useZoomPan } from "@/hooks/useZoomPan"
import { useFitToContent } from "@/hooks/useFitToContent"
import { useClipboard } from "@/hooks/useClipboard"
import { useDrawings } from "@/hooks/useDrawings"
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications"
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard"
import { usePublicBoard } from "@/hooks/usePublicBoard"
import { useBoardGesture } from "@/hooks/useBoardGesture"
import { useUndoRedo } from "@/hooks/useUndoRedo"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useSelectionActions } from "@/hooks/useSelectionActions"
import { useActionsMenuPosition } from "@/hooks/useActionsMenuPosition"

import HeaderShell from "@/components/layout/HeaderShell"
import HintBar from "@/components/board/HintBar"
import NotesCanvas from "@/components/board/NotesCanvas"
import BoardControls from "@/components/board/BoardControls"
import EmptyBoard from "@/components/board/EmptyBoard"
import MarqueeOverlay from "@/components/board/MarqueeOverlay"
import ActionsMenu from "@/components/dashboard/ActionsMenu"
import HeaderActions from "@/components/dashboard/HeaderActions"
import PublicSidebar from "@/components/dashboard/PublicSidebar"
import PublicControls from "@/components/dashboard/PublicControls"

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isReady } = useAuth()

  const [mode, setMode] = useState<"inbox" | "public">("inbox")
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdsRef = useRef<string[]>(selectedIds)
  selectedIdsRef.current = selectedIds
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dragNoteId, setDragNoteId] = useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement>(null)
  const [tool, setTool] = useState<"select" | "hand" | "marquee">("select")

  const undoRedo = useUndoRedo()
  const { commit } = undoRedo

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
    markNoteSeen,
    deleteNote,
    persistNote,
    pulseId,
    setPulseId,
    pulseTimerRef,
  } = useDrawings({ user, fitToContent, findVisibleSlot })

  useRealtimeNotifications(user, () => refresh(true))

  const {
    board,
    setBoard,
    boardLoading,
    boardTitle,
    setBoardTitle,
    savingBoard,
    savedFeed,
    pubBoardRef,
    loadPublicBoard,
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

  useRealtimeBoard({
    slug: mode === "public" ? (board?.slug ?? null) : null,
    onBoardUpdated: (updatedAt) => {
      const current = pubBoardRef.current?.updatedAt
      if (isNewerUpdatedAt(current, updatedAt)) loadPublicBoard(user?.username ?? "")
    },
    onBoardHidden: () => undefined,
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
    getTool: () => tool,
    setDisplayDrawings,
    persistNote,
    saveDraftItems,
    getSelectedIds: () => selectedIdsRef.current,
    setSelectedIds,
    toggleSelect: (id: string) => {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    setConfirmDeleteId,
    setNewArrivals,
    setDragNoteId,
    commit,
  })

  const { undo, redo, reset, canUndo, canRedo } = undoRedo

  const handleToolChange = useCallback(
    (next: "select" | "hand" | "marquee") => {
      setTool(next)
      setSelectedIds([])
      setConfirmDeleteId(null)
    },
    [setConfirmDeleteId],
  )

  const applySnapshot = useCallback(
    (items: Drawing[] | null) => {
      if (!items) return
      if (modeRef.current === "public") {
        setBoard((prev) => (prev ? { ...prev, items } : prev))
        saveDraftItems(items)
      } else {
        const existing = new Set(inboxDrawingsRef.current.map((d) => d._id))
        const restored = items.filter((d) => existing.has(d._id))
        setDrawings(restored)
        restored.forEach((d) =>
          persistNote(d._id, {
            x: Math.round(d.x),
            y: Math.round(d.y),
            width: Math.round(d.width),
            height: Math.round(d.height),
            rotation: d.rotation || 0,
            z: d.z || 0,
            transparent: d.transparent === true,
            positionSet: d.positionSet === true,
          }),
        )
      }
    },
    [setBoard, setDrawings, saveDraftItems, persistNote],
  )

  useKeyboardShortcuts({
    onEscape: () => {
      setTool("select")
      setSelectedIds([])
      setConfirmDeleteId(null)
    },
    onToolChange: handleToolChange,
    onUndo: (shifted) => applySnapshot(shifted ? redo() : undo()),
    onRedo: () => applySnapshot(redo()),
  })

  useEffect(() => {
    setSelectedIds([])
    setConfirmDeleteId(null)
    reset(mode === "public" ? (board?.items ?? []) : drawings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, board?._id])

  useEffect(() => {
    if (mode === "inbox" && !isLoading && drawings.length > 0) {
      reset(drawings)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, mode])

  const paletteDrawings =
    mode === "public"
      ? drawings.filter((d) => !pubBoardRef.current?.items.some((it) => it._id === d._id))
      : []

  const selectedDrawings = displayDrawings.filter((d) => selectedIds.includes(d._id))

  const selectedMenuPos = useActionsMenuPosition(selectedDrawings, actionsMenuRef, view)

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/send/${user?.username}`
    : `/send/${user?.username}`

  const copyShareLink = () => {
    copyShare(shareUrl)
  }

  const focusDrawing = useCallback(
    (d: Drawing) => {
      setMode("inbox")
      markNoteSeen(d._id)
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
      setPulseId(d._id)
      pulseTimerRef.current = window.setTimeout(() => setPulseId(null), 3000)
      focusOn(d)
      setSelectedIds([d._id])
      setConfirmDeleteId(null)
      setNotificationsOpen(false)
    },
    [markNoteSeen, focusOn, pulseTimerRef, setPulseId, setConfirmDeleteId],
  )

  const handleClearNotifications = () => {
    markAllSeen()
    setNewArrivals([])
    setNotificationsOpen(false)
  }

  const handleDeleteNote = async () => {
    for (const d of selectedDrawings) {
      const ok = await deleteNote(d._id)
      if (!ok) {
        alert("Error al eliminar un dibujo")
        break
      }
    }
    setSelectedIds([])
    setConfirmDeleteId(null)
  }

  const { moveLayer, toggleDrawingBackground, removeFromPublicBoard } = useSelectionActions({
    selectedIds,
    selectedDrawings,
    displayDrawings,
    mode,
    setDisplayDrawings,
    setPublicItems: (items) => setBoard((prev) => (prev ? { ...prev, items } : prev)),
    publicItems: pubBoardRef.current?.items ?? null,
    saveDraftItems,
    persistNote,
    commit,
    setSelectedIds,
    setConfirmDeleteId,
  })

  if (!user) return null

  const hintText = hintForTool(tool, mode)

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
            <HeaderActions
              user={user}
              mode={mode}
              onInbox={() => {
                setMode("inbox")
                fitToContent(drawings)
              }}
              onPublic={() => setMode("public")}
              newArrivals={newArrivals}
              notificationsOpen={notificationsOpen}
              onToggleNotifications={() => {
                setMode("inbox")
                setNotificationsOpen((o) => !o)
              }}
              onFocusDrawing={focusDrawing}
              onClearNotifications={handleClearNotifications}
              onLogout={logout}
            />
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

          {selectedDrawings.length > 0 && selectedMenuPos && (
            <ActionsMenu
              innerRef={actionsMenuRef}
              drawings={selectedDrawings}
              mode={mode}
              confirmDeleteVisible={confirmDeleteId !== null}
              pos={selectedMenuPos}
              onExportPng={() => downloadSelectionAsPng(selectedDrawings)}
              onToggleBackground={toggleDrawingBackground}
              onMoveLayer={moveLayer}
              onRequestDelete={() => setConfirmDeleteId(selectedIds[0] ?? null)}
              onConfirmDelete={handleDeleteNote}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onRemovePublic={removeFromPublicBoard}
            />
          )}

          <BoardControls
            tool={tool}
            canUndo={canUndo}
            canRedo={canRedo}
            zoom={view.zoom}
            onToolChange={handleToolChange}
            onUndo={() => applySnapshot(undo())}
            onRedo={() => applySnapshot(redo())}
            onZoom={view.handleZoom}
          />

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
            onPointerDown={tool === "marquee" ? gesture.handleMarqueeStart : gesture.handlePanStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={mode === "public" ? gesture.handleDrop : undefined}
            className={`absolute inset-0 overflow-hidden bg-slate-50 ${
              tool === "marquee" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
            }`}
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {gesture.marqueeRect && !dragNoteId && <MarqueeOverlay rect={gesture.marqueeRect} />}
            <NotesCanvas
              items={displayDrawings}
              pan={view.pan}
              zoom={view.zoom}
              zIndex={gesture.sidebarHover ? 30 : 0}
              interactive
              handTool={tool === "hand"}
              animated={mode === "inbox"}
              selectedIds={selectedIds}
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