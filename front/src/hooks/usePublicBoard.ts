import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { api } from "@/lib/api"
import { normalizeBoardItems, serializeBoardLayout, diffBoardItems, type Drawing } from "@/lib/board"
import { useLanguage } from "@/context/LanguageContext"
import type { AuthenticatedUser } from "@/types/auth"
import type { PublicBoardDraft } from "@/types/publicboard"

interface UsePublicBoardInput {
  user: AuthenticatedUser | null
  mode: "inbox" | "public"
  fitToContent: (items: Drawing[]) => void
  copy: (text: string) => Promise<void>
  getDisplayItems: () => Drawing[]
}

interface UsePublicBoardOutput {
  board: PublicBoardDraft | null
  setBoard: Dispatch<SetStateAction<PublicBoardDraft | null>>
  boardLoading: boolean
  boardTitle: string
  setBoardTitle: Dispatch<SetStateAction<string>>
  savingBoard: boolean
  savedFeed: boolean
  saveToast: string | null
  pubBoardRef: MutableRefObject<PublicBoardDraft | null>
  lastSavedAtRef: MutableRefObject<number>
  loadPublicBoard: (username: string, options?: { silent?: boolean }) => Promise<void>
  saveDraftItems: (items: Drawing[]) => void
  savePublicBoard: () => void
  togglePublish: () => void
  copyPublicLink: () => Promise<void>
}

const titleFrom = (b?: unknown) => ((b as Record<string, unknown>)?.draftTitle as string) || ((b as Record<string, unknown>)?.title as string) || "Mi Tablero Público"

const DRAFT_FLAG_PREFIX = "anoty::draft::"

const isDraftTouched = (boardId: string) =>
  typeof localStorage !== "undefined" && localStorage.getItem(DRAFT_FLAG_PREFIX + boardId) === "1"

const markDraftTouched = (boardId: string) => {
  try {
    localStorage.setItem(DRAFT_FLAG_PREFIX + boardId, "1")
  } catch {
  }
}

const clearDraftTouched = (boardId: string) => {
  try {
    localStorage.removeItem(DRAFT_FLAG_PREFIX + boardId)
  } catch {
  }
}

export function usePublicBoard({
  user,
  mode,
  fitToContent,
  copy,
  getDisplayItems,
}: UsePublicBoardInput): UsePublicBoardOutput {
  const { t } = useLanguage()
  const [board, setBoard] = useState<PublicBoardDraft | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardTitle, setBoardTitle] = useState("")
  const [savingBoard, setSavingBoard] = useState(false)
  const [savedFeed, setSavedFeed] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)
  const pubBoardRef = useRef<PublicBoardDraft | null>(null)
  pubBoardRef.current = board
  const lastSavedAtRef = useRef<number>(0)
  const initialFitDoneRef = useRef(false)

  const draftTimerRef = useRef<NodeJS.Timeout | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingDraftItemsRef = useRef<Drawing[] | null>(null)
  const lastSyncedDraftRef = useRef<Drawing[] | null>(null)

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const saveDraftItems = useCallback((items: Drawing[]) => {
    const b = pubBoardRef.current
    if (!b) return
    markDraftTouched(b._id)
    pendingDraftItemsRef.current = items

    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
    }

    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null
      const pending = pendingDraftItemsRef.current
      if (!pending) return
      pendingDraftItemsRef.current = null

      const prev = lastSyncedDraftRef.current
      const idsChanged =
        !prev ||
        prev.length !== pending.length ||
        prev.some((p, i) => p._id !== pending[i]._id)

      if (idsChanged) {
        lastSyncedDraftRef.current = pending
        api.patch(`/public-boards/${b._id}`, { draftItems: serializeBoardLayout(pending) }).catch(() => {})
      } else {
        const deltas = diffBoardItems(prev, pending)
        if (deltas.length === 0) return
        lastSyncedDraftRef.current = pending
        api.patch(`/public-boards/${b._id}`, { updatedDraftItems: deltas }).catch(() => {})
      }
    }, 600)
  }, [])

  const loadPublicBoard = useCallback(
    async (username: string, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setBoardLoading(true)
      }
      try {
        const data = await api.get(`/public-boards/${username}`)
        let b = data.success && data.board ? (data.board as unknown as Record<string, unknown>) : null
        if (!b) {
          const created = await api.post<{ success: boolean; board?: Record<string, unknown> }>(
            `/public-boards/${username}`,
            {},
          )
          if (created.success) b = created.board ?? null
        }
        if (b) {
          const draftItems = b.draftItems as unknown[] | undefined
          const hasDraft = Array.isArray(draftItems) && draftItems.length > 0
          const draftTouched = isDraftTouched(b._id as string)
          const draftSrc =
            draftTouched && hasDraft ? draftItems : (b.items as unknown[] | undefined) || draftItems
          const normalized = normalizeBoardItems(draftSrc || [])
          lastSyncedDraftRef.current = normalized
          setBoard({
            _id: b._id as string,
            slug: b.slug as string,
            title: (b.title as string) || "Mi Tablero Público",
            isPublished: (b.isPublished as boolean) ?? true,
            items: normalized,
            updatedAt: (b.updatedAt as string) || undefined,
          })
          setBoardTitle(titleFrom(b))
        }
      } catch (error) {
        console.error("Error al cargar el tablero público:", error)
      } finally {
        if (!options?.silent) {
          setBoardLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (mode !== "public") {
      initialFitDoneRef.current = false
    }
  }, [mode])

  useEffect(() => {
    if (!user || mode !== "public") return
    loadPublicBoard(user.username)
  }, [user, mode, loadPublicBoard])

  useEffect(() => {
    if (mode === "public" && board && !boardLoading && !initialFitDoneRef.current) {
      initialFitDoneRef.current = true
      fitToContent(board.items)
    }
  }, [mode, board, boardLoading, fitToContent])

  const savePublicBoard = useCallback(() => {
    const b = pubBoardRef.current
    if (!b) return

    // Cancelar cualquier guardado en borrador pendiente para evitar condiciones de carrera
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current)
      draftTimerRef.current = null
    }
    pendingDraftItemsRef.current = null

    const title = boardTitle.trim() || "Mi Tablero Público"
    const currentItems = getDisplayItems()
    const serialized = serializeBoardLayout(currentItems)

    // 1. Actualización inmediata y optimista en el tablero que estás editando
    clearDraftTouched(b._id)
    lastSavedAtRef.current = Date.now()
    lastSyncedDraftRef.current = currentItems
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            title,
            items: currentItems,
          }
        : prev,
    )

    // 2. Guardado en segundo plano (sin bloquear la interacción del usuario)
    setSavingBoard(true)
    api
      .patch(`/public-boards/${b._id}`, {
        title,
        draftTitle: title,
        items: serialized,
        draftItems: serialized,
      })
      .then((data) => {
        if (data.success) {
          const newUpdatedAt = ((data.board as Record<string, unknown> | undefined)?.updatedAt as string)
          if (newUpdatedAt && pubBoardRef.current) {
            pubBoardRef.current.updatedAt = newUpdatedAt
          }
          setBoard((prev) =>
            prev
              ? {
                  ...prev,
                  updatedAt: newUpdatedAt || prev.updatedAt,
                }
              : prev,
          )
          setSaveToast(t("sidebar_save_success_toast"))
          setSavedFeed(true)
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          toastTimerRef.current = setTimeout(() => {
            setSavedFeed(false)
            setSaveToast(null)
          }, 3000)
        }
      })
      .catch((err) => {
        console.error("Error al guardar tablero en segundo plano:", err)
      })
      .finally(() => {
        setSavingBoard(false)
      })
  }, [boardTitle, getDisplayItems, t])

  const togglePublish = useCallback(() => {
    const b = pubBoardRef.current
    if (!b) return
    const nextPublished = !b.isPublished
    setBoard((prev) => (prev ? { ...prev, isPublished: nextPublished } : prev))
    api.patch(`/public-boards/${b._id}`, { isPublished: nextPublished }).catch(() => {})
  }, [])

  const copyPublicLink = useCallback(async () => {
    const b = pubBoardRef.current
    if (!b) return
    const url = `${window.location.origin}/p/${b.slug}`
    await copy(url)
  }, [copy])

  return {
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
  }
}