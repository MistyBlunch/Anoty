import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import dynamic from "next/dynamic"
import { RefreshCw, Copy, Check, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/features/auth"
import {
  NotesCanvas,
  BoardControls,
  EmptyBoard,
  HintBar,
  MarqueeOverlay,
  useZoomPan,
  useFitToContent,
  useDrawings,
  useRealtimeBoard,
  useRealtimeNotifications,
  useBoardGesture,
  useUndoRedo,
  useKeyboardShortcuts,
  useSelectionActions,
  useActionsMenuPosition,
  findVisibleFreeSlot,
  hintForTool,
  type Drawing,
} from "@/features/board"
import { HeaderActions, ActionsMenu, ProfileModal } from "@/features/dashboard"
import { PublicControls, usePublicBoard, useClipboard } from "@/features/public-board"

import { downloadSelectionAsPng } from "@/lib/export"
import { isNewerUpdatedAt } from "@/lib/realtime"
import { useLanguage } from "@/context/LanguageContext"
import HeaderShell from "@/components/layout/HeaderShell"

const PublicSidebar = dynamic(() => import("@/features/public-board").then((m) => m.PublicSidebar), {
  ssr: false,
})

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, isReady, updateUsername } = useAuth()
  const { t, locale } = useLanguage()

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [mode, setMode] = useState<"inbox" | "public">("inbox")
  const modeRef = useRef(mode)
  modeRef.current = mode

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdsRef = useRef<string[]>(selectedIds)
  selectedIdsRef.current = selectedIds
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
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
    saveToast,
    pubBoardRef,
    lastSavedAtRef,
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
      if (savingBoard || Date.now() - lastSavedAtRef.current < 10000) return
      const current = pubBoardRef.current?.updatedAt
      if (isNewerUpdatedAt(current, updatedAt)) {
        loadPublicBoard(user?.username ?? "", { silent: true })
      }
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
      if (!id) return
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    },
    setConfirmDeleteId,
    setNewArrivals,
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

  const togglePalette = () => {
    if (!paletteOpen) {
      setSelectedIds([])
      setConfirmDeleteId(null)
    }
    setPaletteOpen((o) => !o)
  }

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

  const selectedDrawings = displayDrawings.filter((d) => Boolean(d._id && selectedIds.includes(d._id)))

  const selectedMenuPos = useActionsMenuPosition(selectedDrawings, actionsMenuRef, view)

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/send/${user?.username}${locale === "es" ? "?lang=es" : ""}`
    : `/send/${user?.username}${locale === "es" ? "?lang=es" : ""}`

  const copyShareLink = () => {
    copyShare(shareUrl)
  }

  const focusDrawing = useCallback(
    (d: Drawing) => {
      setMode("inbox")
      const current =
        inboxDrawingsRef.current.find((item) => item._id === d._id) ||
        displayRef.current.find((item) => item._id === d._id) ||
        d

      markNoteSeen(d._id)
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
      setPulseId(d._id)
      pulseTimerRef.current = window.setTimeout(() => setPulseId(null), 3000)
      focusOn(current)
      setSelectedIds([current._id || d._id])
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
        alert(t("delete_drawing_error"))
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

  const hintText = hintForTool(tool, mode, t)

  if (!isReady) {
    return (
      <>
        <Head>
          <title>{t("dashboard_title")}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="h-dvh bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col overflow-hidden">
          <HeaderShell center={<span className="text-slate-400 text-sm">{t("validating_session")}</span>} />
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{t("dashboard_title")}</title>
        <meta name="description" content={t("dashboard_description")} />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
        <HeaderShell
          onLogoClick={() => router.push("/")}
          right={
            <div className="flex items-center gap-1.5 sm:gap-2">
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
                onOpenProfile={() => setProfileModalOpen(true)}
                onLogout={logout}
              />
            </div>
          }
        />

        {user && (
          <ProfileModal
            user={user}
            open={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            onUpdateUsername={updateUsername}
          />
        )}

        <main className="flex-1 relative overflow-hidden select-none">
          <HintBar text={hintText} />

          {saveToast && (
            <div
              id="public-board-save-toast"
              className="fixed top-16 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-xl shadow-emerald-950/20 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
              <span>{saveToast}</span>
            </div>
          )}

          {mode === "public" && (
            <PublicSidebar
              innerRef={gesture.paletteRef}
              hovered={gesture.sidebarHover}
              title={boardTitle}
              onTitleChange={setBoardTitle}
              paletteDrawings={paletteDrawings}
              onPalettePointerDown={gesture.handlePalettePointerDown}
              paletteDrag={gesture.paletteDrag}
              open={paletteOpen}
              onToggle={togglePalette}
              saving={savingBoard}
              savedFeed={savedFeed}
              onSave={savePublicBoard}
            />
          )}

          {selectedDrawings.length > 0 && selectedMenuPos && !paletteOpen && (
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
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/5 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl shadow-slate-900/10 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-sm">
                  <RefreshCw className="w-5 h-5 text-teal-600 animate-spin" />
                </div>
                <p className="text-sm font-semibold text-slate-700 tracking-tight">
                  {mode === "public" ? t("loading_public_board") : t("loading_inbox")}
                </p>
              </div>
            </div>
          )}

          <div
            ref={view.boardRef}
            onPointerDown={tool === "marquee" ? gesture.handleMarqueeStart : gesture.handlePanStart}
            className={`absolute inset-0 overflow-hidden touch-none overscroll-none bg-slate-50 ${
              tool === "marquee" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
            }`}
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            {gesture.marqueeRect && <MarqueeOverlay rect={gesture.marqueeRect} />}
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

          {!isLoading && !(mode === "public" && boardLoading) && displayDrawings.length === 0 && (
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
              className="absolute bottom-2 left-5 z-30 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-lg hover:border-teal-500/50 hover:text-teal-700 transition-all cursor-pointer"
            >
              {shareCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span className="truncate">{shareCopied ? t("copied") : t("copy_share_link")}</span>
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