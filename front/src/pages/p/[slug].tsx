import { useCallback, useEffect, useRef, useState } from "react"
import type { GetServerSideProps } from "next"
import { useRouter } from "next/router"
import Head from "next/head"
import { MessageSquareHeart, Home, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { isNewerUpdatedAt } from "@/lib/realtime"
import { translations, type Locale } from "@/lib/i18n"
import type { Drawing } from "@/types/drawing"

import { useZoomPan } from "@/hooks/useZoomPan"
import { useFitToContent } from "@/hooks/useFitToContent"
import { useRealtimeBoard } from "@/hooks/useRealtimeBoard"
import { useLanguage } from "@/context/LanguageContext"

import HeaderShell from "@/components/layout/HeaderShell"
import NotesCanvas from "@/components/board/NotesCanvas"
import ZoomControls from "@/components/board/ZoomControls"
import HintBar from "@/components/board/HintBar"
import EmptyBoard from "@/components/board/EmptyBoard"
import LanguageSwitcher from "@/components/layout/LanguageSwitcher"
import type { BoardDrag, PublicBoardProps } from "@/types"

export type { PublicBoardProps }

export const getServerSideProps: GetServerSideProps<PublicBoardProps> = async (context) => {
  const rawSlug = context.params?.slug
  const slug = typeof rawSlug === "string" ? rawSlug.toLowerCase() : ""
  const queryLang = context.query.lang
  const initialLocale: Locale = queryLang === "es" ? "es" : "en"
  const dict = translations[initialLocale]

  const host = context.req.headers.host || "anoty.app"
  const protocol = host.includes("localhost") ? "http" : "https"
  const canonicalUrl = `${protocol}://${host}/p/${slug}${queryLang === "es" ? "?lang=es" : ""}`
  const ogImage = `${protocol}://${host}/apple-touch-icon.png`

  if (!slug) {
    return {
      props: {
        slug: "",
        initialStatus: "notfound",
        initialTitle: "",
        initialItems: [],
        initialUpdatedAt: null,
        metaTitle: dict.public_notfound_title as string,
        metaDescription: dict.public_notfound_heading as string,
        canonicalUrl,
        ogImage,
      },
    }
  }

  try {
    const res = await api.get(`/public/${slug}`)
    if (!res || !res.success) {
      return {
        props: {
          slug,
          initialStatus: "notfound",
          initialTitle: "",
          initialItems: [],
          initialUpdatedAt: null,
          metaTitle: dict.public_notfound_title as string,
          metaDescription: dict.public_notfound_heading as string,
          canonicalUrl,
          ogImage,
        },
      }
    }

    const payload = res as unknown as Record<string, unknown>
    const title = (payload.title as string) || (dict.public_default_title as string)
    const rawItems = (payload.items as unknown[] | undefined) || []
    const initialUpdatedAt = (payload.updatedAt as string) || null

    const initialItems: Drawing[] = rawItems.map((raw) => {
      const it = raw as Record<string, unknown>
      return {
        _id: (it.noteId as string) || (it._id as string) || "",
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
    })

    const count = initialItems.length
    const countText =
      initialLocale === "es"
        ? count === 1
          ? "1 dibujo anónimo"
          : `${count} dibujos anónimos`
        : count === 1
          ? "1 anonymous drawing"
          : `${count} anonymous drawings`

    const descFn = dict.public_board_description as (t: string) => string
    const baseDesc = typeof descFn === "function" ? descFn(title) : `${title} – Anoty`
    const metaDescription = count > 0 ? `${baseDesc} • ${countText}` : baseDesc

    context.res.setHeader(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=59",
    )

    return {
      props: {
        slug,
        initialStatus: "ready",
        initialTitle: title,
        initialItems,
        initialUpdatedAt,
        metaTitle: `${title} – Anoty`,
        metaDescription,
        canonicalUrl,
        ogImage,
      },
    }
  } catch (error) {
    // Si la llamada al backend falla en SSR, caemos de forma segura a carga en cliente
    return {
      props: {
        slug,
        initialStatus: "loading",
        initialTitle: "",
        initialItems: [],
        initialUpdatedAt: null,
        metaTitle: dict.public_loading_title as string,
        metaDescription: "Cargando tablero interactivo...",
        canonicalUrl,
        ogImage,
      },
    }
  }
}

export default function PublicBoardView({
  slug: initialSlug,
  initialStatus = "loading",
  initialTitle = "",
  initialItems = [],
  initialUpdatedAt = null,
  metaTitle,
  metaDescription,
  canonicalUrl,
  ogImage,
}: PublicBoardProps) {
  const router = useRouter()
  const slug = initialSlug || (router.query.slug as string) || ""
  const { t } = useLanguage()

  const [title, setTitle] = useState(initialTitle)
  const [items, setItems] = useState<Drawing[]>(initialItems)
  const [status, setStatus] = useState<"loading" | "ready" | "notfound">(initialStatus)

  const view = useZoomPan({ wheel: status === "ready", initialZoom: 0.8 })
  const { fitToContent } = useFitToContent(view)

  const dragRef = useRef<BoardDrag | null>(null)
  const updatedAtRef = useRef<string | null>(initialUpdatedAt)

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
        setTitle((payload.title as string) || t("public_default_title"))
        setItems(
          (rawItems || []).map((raw) => {
            const it = raw as Record<string, unknown>
            return {
              _id: (it.noteId as string) || (it._id as string) || "",
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!slug) return
    // Si no vino pre-cargado desde SSR o cambió el slug en navegación cliente, cargamos
    if (slug !== initialSlug || status === "loading") {
      loadBoard(slug)
    }
  }, [slug, initialSlug, status, loadBoard])

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
  }, [status, items.length])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      if (view.getPointerCount() > 1) {
        dragRef.current = null
        return
      }
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      view.scheduleView(view.viewRef.current.zoom, { x: drag.origPanX + dx, y: drag.origPanY + dy })
    }
    const onPointerUp = () => {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [view.scheduleView, view.getPointerCount])

  const handlePanStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    if (view.getPointerCount() > 1) return
    const { pan } = view.viewRef.current
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origPanX: pan.x,
      origPanY: pan.y,
      moved: false,
    }
  }

  const dynamicTitle = title ? `${title} – Anoty` : metaTitle || t("public_default_title")
  const dynamicDescription = title ? t("public_board_description", title) : metaDescription

  if (status === "loading") {
    return (
      <>
        <Head>
          <title>{metaTitle || t("public_loading_title")}</title>
          <meta name="description" content={metaDescription || "Cargando tablero..."} />
        </Head>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-600 text-sm">{t("public_loading_text")}</p>
          </div>
        </div>
      </>
    )
  }

  if (status === "notfound") {
    return (
      <>
        <Head>
          <title>{metaTitle || t("public_notfound_title")}</title>
          <meta name="description" content={metaDescription || t("public_notfound_heading")} />
        </Head>
        <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
          <HeaderShell
            onLogoClick={() => router.push("/")}
            right={<LanguageSwitcher />}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquareHeart className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-3">
                {t("public_notfound_heading")}
              </h1>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                {t("public_notfound_description")}
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl text-sm shadow-lg hover:bg-teal-500 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                {t("public_notfound_back")}
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
        <title>{dynamicTitle}</title>
        <meta name="description" content={dynamicDescription} />

        {/* Open Graph / Social Sharing (WhatsApp, Twitter/X, Discord, Telegram, Facebook) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={dynamicTitle} />
        <meta property="og:description" content={dynamicDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Anoty" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={dynamicTitle} />
        <meta name="twitter:description" content={dynamicDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <div className="min-h-screen bg-white text-slate-800 selection:bg-teal-500 selection:text-white flex flex-col">
        <HeaderShell
          onLogoClick={() => router.push("/")}
          center={
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[60vw]">{title}</h1>
          }
          right={<LanguageSwitcher />}
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

          <HintBar text={t("hint_viewer")} />

          <ZoomControls zoom={view.zoom} onZoom={view.handleZoom} />
        </main>
      </div>
    </>
  )
}