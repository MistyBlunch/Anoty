import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import { MessageSquareHeart, Home, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { isNewerUpdatedAt } from "@/lib/realtime"
import type { Drawing } from "@/types/drawing"

import { useZoomPan } from "@/hooks/useZoomPan"
import { useFitToContent } from "@/hooks/useFitToContent"
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard"

import HeaderShell from "@/components/layout/HeaderShell"
import NotesCanvas from "@/components/board/NotesCanvas"
import ZoomControls from "@/components/board/ZoomControls"
import HintBar from "@/components/board/HintBar"
import EmptyBoard from "@/components/board/EmptyBoard"

interface BoardDrag {
  startX: number
  startY: number
  origPanX: number
  origPanY: number
  moved: boolean
}

export default function PublicBoardView() {
  const router = useRouter()
  const slug = (router.query.slug as string) || ""

  const [title, setTitle] = useState("")
  const [items, setItems] = useState<Drawing[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading")

  const view = useZoomPan({ wheel: status === "ready", initialZoom: 0.8 })
  const { fitToContent } = useFitToContent(view)

  const dragRef = useRef<BoardDrag | null>(null)
  const updatedAtRef = useRef<string | null>(null)

  const loadBoard = useCallback((currentSlug: string) => {
    setStatus("loading")
    api
      .get(`/public/${currentSlug.toLowerCase()}`)
      .then((data) => {
        if (!data.success) {
          setStatus("notfound")
          return
        }
        const payload = data as unknown as Record<string, unknown>
        const rawItems = payload.items as unknown[] | undefined
        updatedAtRef.current = (payload.updatedAt as string) || null
        setTitle((payload.title as string) || "Muro Público")
        setItems(
          (rawItems || []).map((raw) => {
            const it = raw as Record<string, unknown>
            return {
              _id: it.noteId as string,
              content: (it.content as string) || "",
              authorName: it.authorName as string | undefined,
              createdAt: (it.createdAt as string) || new Date().toISOString(),
              x: Number(it.x) || 0,
              y: Number(it.y) || 0,
              width: Number(it.width) || 320,
              height: Number(it.height) || 220,
              rotation: Number(it.rotation) || 0,
              z: Number(it.z) || 0,
              transparent: it.transparent === true,
            }
          }),
        )
        setStatus("ready")
      })
      .catch(() => setStatus("notfound"))
  }, [])

  useEffect(() => {
    if (!slug) return
    setStatus("loading")
    loadBoard(slug)
  }, [slug, loadBoard])

  useRealtimeBoard({
    slug: slug || null,
    onBoardUpdated: (updatedAt) => {
      if (isNewerUpdatedAt(updatedAtRef.current, updatedAt) && slug) {
        loadBoard(slug)
      }
    },
    onBoardHidden: () => setStatus("notfound"),
  })

  useEffect(() => {
    if (status !== "ready" || items.length === 0) return
    fitToContent(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      view.setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy })
    }
    const onPointerUp = () => {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [view.setPan])

  const handlePanStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const { pan } = view.viewRef.current
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    }
  }

  if (status === "loading") {
    return (
      <>
        <Head>
          <title>Cargando muro... – Anoty</title>
        </Head>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 text-sm">Cargando muro público...</p>
          </div>
        </div>
      </>
    )
  }

  if (status === "notfound") {
    return (
      <>
        <Head>
          <title>Muro no encontrado – Anoty</title>
        </Head>
        <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
          <HeaderShell onLogoClick={() => router.push("/")} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquareHeart className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                Este muro no existe o está oculto
              </h1>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                El enlace puede estar mal escrito o el dueño lo despublicó.
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-lg hover:bg-teal-500 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Volver a Anoty
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{`${title} – Anoty`}</title>
        <meta name="description" content={`Muro público de dibujos anónimos: ${title}`} />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
        <HeaderShell
          onLogoClick={() => router.push("/")}
          center={
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[60vw]">{title}</h1>
          }
        />

        <main className="flex-1 relative overflow-hidden select-none">
          <div
            ref={view.boardRef}
            onPointerDown={handlePanStart}
            className="absolute inset-0 overflow-hidden touch-none overscroll-none cursor-grab active:cursor-grabbing bg-slate-50"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <NotesCanvas items={items} pan={view.pan} zoom={view.zoom} />
          </div>

          {items.length === 0 && <EmptyBoard variant="viewer" />}

          <HintBar text="Mantén y arrastra para moverte • Zoom con rueda o pellizco" />

          <ZoomControls zoom={view.zoom} onZoom={view.handleZoom} />
        </main>
      </div>
    </>
  )
}