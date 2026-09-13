import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/router"
import Head from "next/head"
import {
  MessageSquareHeart,
  Hand,
  ZoomIn,
  ZoomOut,
  Home,
  RefreshCw,
} from "lucide-react"
import { sanitizeSvg, normalizeSvgTransform } from "../../lib/svg"

interface Item {
  _id: string
  content: string
  authorName?: string
  createdAt?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  z: number
  transparent?: boolean
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

export default function PublicBoardView() {
  const router = useRouter()
  const slug = (router.query.slug as string) || ""

  const [title, setTitle] = useState("")
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">("loading")
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const boardRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef({ pan, zoom })
  viewRef.current = { pan, zoom }
  const dragRef = useRef<{
    startX: number
    startY: number
    origPanX: number
    origPanY: number
    moved: boolean
  } | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

  useEffect(() => {
    if (!slug) return
    setStatus("loading")
    fetch(`${apiUrl}/public/${slug.toLowerCase()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success) {
          setStatus("notfound")
          return
        }
        setTitle(data.title || "Muro Público")
        setItems(
          (data.items || []).map((it: any) => ({
            _id: it.noteId,
            content: it.content || "",
            authorName: it.authorName,
            createdAt: it.createdAt,
            x: Number(it.x) || 0,
            y: Number(it.y) || 0,
            width: Number(it.width) || 320,
            height: Number(it.height) || 220,
            rotation: Number(it.rotation) || 0,
            z: Number(it.z) || 0,
            transparent: it.transparent === true,
          })),
        )
        setStatus("ready")
      })
      .catch(() => setStatus("notfound"))
  }, [slug, apiUrl])

  useEffect(() => {
    const board = boardRef.current
    if (!board || status !== "ready" || items.length === 0) return
    const rect = board.getBoundingClientRect()
    const vw = rect.width
    const vh = rect.height
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = board.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const { pan: p, zoom: z } = viewRef.current
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor))
      const k = next / z
      setPan({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k })
      setZoom(next)
    }
    board.addEventListener("wheel", onWheel, { passive: false })
    return () => board.removeEventListener("wheel", onWheel)
  }, [status])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy })
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
  }, [])

  const handlePanStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const { pan: p } = viewRef.current
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: p.x,
      origPanY: p.y,
      moved: false,
    }
  }

  const handleZoom = (factor: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    const { zoom: z, pan: p } = viewRef.current
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor))
    const k = next / z
    setPan({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k })
    setZoom(next)
  }

  if (status === "loading") {
    return (
      <>
        <Head>
          <title>Cargando muro... – Noty</title>
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
          <title>Muro no encontrado – Noty</title>
        </Head>
        <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
          <header className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => router.push("/")}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <MessageSquareHeart className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  Noty<span className="text-cyan-500">.</span>
                </span>
              </div>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
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
                Volver a Noty
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const isEmpty = items.length === 0

  return (
    <>
      <Head>
        <title>{`${title} – Noty`}</title>
        <meta name="description" content={`Muro público de dibujos anónimos: ${title}`} />
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
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[60vw]">{title}</h1>
          </div>
        </header>

        {/* Board */}
        <main className="flex-1 relative overflow-hidden select-none">
          <div
            ref={boardRef}
            onPointerDown={handlePanStart}
            className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing bg-slate-50"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div
              className="absolute top-0 left-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            >
              {items.map((d) => (
                <div
                  key={d._id}
                  className="absolute"
                  style={{
                    left: d.x,
                    top: d.y,
                    width: d.width,
                    height: d.height,
                    zIndex: d.z || 0,
                  }}
                >
                  <div
                    className={`w-full h-full rounded-xl overflow-hidden ${
                      d.transparent ? "bg-transparent" : "bg-white shadow-lg"
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
                </div>
              ))}
            </div>
          </div>

          {/* Empty board centered */}
          {isEmpty && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div
                className="rounded-3xl p-10 text-center border border-slate-200 bg-white shadow-xl max-w-md"
                style={{ width: 480 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquareHeart className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Este muro está vacío</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  El dueño aún no ha colocado ningún dibujo aquí.
                </p>
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-600 shadow-md pointer-events-none">
            <Hand className="w-3.5 h-3.5 text-teal-600" />
            <span>Mantén y arrastra para moverte • Rueda para zoom</span>
          </div>

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
        </main>
      </div>
    </>
  )
}