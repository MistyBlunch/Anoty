import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { api } from "@/lib/api"
import { normalizeBoardItems, serializeBoardItems, type Drawing } from "@/lib/board"
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
  pubBoardRef: MutableRefObject<PublicBoardDraft | null>
  loadPublicBoard: (username: string) => Promise<void>
  saveDraftItems: (items: Drawing[]) => void
  savePublicBoard: () => Promise<void>
  togglePublish: () => void
  copyPublicLink: () => Promise<void>
}

const titleFrom = (b?: unknown) => ((b as Record<string, unknown>)?.draftTitle as string) || ((b as Record<string, unknown>)?.title as string) || "Mi Muro Público"

const DRAFT_FLAG_PREFIX = "anoty::draft::"

const isDraftTouched = (boardId: string) =>
  typeof localStorage !== "undefined" && localStorage.getItem(DRAFT_FLAG_PREFIX + boardId) === "1"

const markDraftTouched = (boardId: string) => {
  try {
    localStorage.setItem(DRAFT_FLAG_PREFIX + boardId, "1")
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
  const [board, setBoard] = useState<PublicBoardDraft | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardTitle, setBoardTitle] = useState("")
  const [savingBoard, setSavingBoard] = useState(false)
  const [savedFeed, setSavedFeed] = useState(false)
  const pubBoardRef = useRef<PublicBoardDraft | null>(null)
  pubBoardRef.current = board

  const saveDraftItems = useCallback((items: Drawing[]) => {
    const b = pubBoardRef.current
    if (!b) return
    markDraftTouched(b._id)
    api.patch(`/public-boards/${b._id}`, { draftItems: serializeBoardItems(items) }).catch(() => {})
  }, [])

  const loadPublicBoard = useCallback(
    async (username: string) => {
      setBoardLoading(true)
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
          const hasDraft = Array.isArray(draftItems)
          const draftTouched = isDraftTouched(b._id as string)
          const draftSrc =
            hasDraft && (draftTouched || (draftItems as unknown[]).length > 0) ? draftItems : (b.items as unknown[] | undefined)
          setBoard({
            _id: b._id as string,
            slug: b.slug as string,
            title: (b.title as string) || "Mi Muro Público",
            isPublished: (b.isPublished as boolean) ?? true,
            items: normalizeBoardItems(draftSrc || []),
            updatedAt: (b.updatedAt as string) || undefined,
          })
          setBoardTitle(titleFrom(b))
        }
      } catch (error) {
        console.error("Error al cargar el muro público:", error)
      } finally {
        setBoardLoading(false)
      }
    },
    [],
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

  const savePublicBoard = useCallback(async () => {
    const b = pubBoardRef.current
    if (!b) return
    const title = boardTitle.trim() || "Mi Muro Público"
    setSavingBoard(true)
    try {
      const data = await api.patch(`/public-boards/${b._id}`, {
        title,
        draftTitle: title,
        items: serializeBoardItems(getDisplayItems()),
      })
      if (data.success) {
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                title,
                updatedAt: ((data.board as Record<string, unknown> | undefined)?.updatedAt as string) || prev.updatedAt,
              }
            : prev,
        )
        setSavedFeed(true)
        setTimeout(() => setSavedFeed(false), 1800)
      }
    } finally {
      setSavingBoard(false)
    }
  }, [boardTitle, getDisplayItems])

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
    pubBoardRef,
    loadPublicBoard,
    saveDraftItems,
    savePublicBoard,
    togglePublish,
    copyPublicLink,
  }
}