import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { api } from "@/lib/api"
import { normalizeNotes, placeDrawings, type Drawing, type Rect, type Vector2 } from "@/lib/board"
import type { AuthenticatedUser } from "@/types/auth"

interface UseDrawingsInput {
  user: AuthenticatedUser | null
  fitToContent: (items: Drawing[]) => void
  findVisibleSlot: (w: number, h: number, rects: Rect[]) => Vector2 | null
}

interface UseDrawingsOutput {
  drawings: Drawing[]
  setDrawings: Dispatch<SetStateAction<Drawing[]>>
  newArrivals: Drawing[]
  setNewArrivals: Dispatch<SetStateAction<Drawing[]>>
  isLoading: boolean
  refresh: (silent?: boolean) => Promise<void>
  markAllSeen: () => Promise<void>
  deleteNote: (id: string) => Promise<boolean>
  persistNote: (id: string, patch: Record<string, unknown>) => void
  pulseId: string | null
  setPulseId: Dispatch<SetStateAction<string | null>>
  pulseTimerRef: MutableRefObject<number | null>
}

export function useDrawings({ user, fitToContent, findVisibleSlot }: UseDrawingsInput): UseDrawingsOutput {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [newArrivals, setNewArrivals] = useState<Drawing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pulseId, setPulseId] = useState<string | null>(null)
  const pulseTimerRef = useRef<number | null>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    if (user) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current)
    }
  }, [])

  const refresh = useCallback(
    async (silent = false) => {
      if (!user) return
      if (!silent) setIsLoading(true)
      try {
        const data = await api.get(`/board/my-notes/${user.username}`)
        if (data.success) {
          const items = normalizeNotes(((data as unknown as Record<string, unknown>).notes as unknown[]) || [])

          const isBaseline = knownIdsRef.current.size === 0
          const newNotys = isBaseline
            ? items.filter((it) => it.isSeen === false)
            : items.filter((it) => !knownIdsRef.current.has(it._id))
          items.forEach((it) => knownIdsRef.current.add(it._id))

          const placed = placeDrawings(items)

          let nextZ = items.reduce((m, it) => Math.max(m, it.z || 0), 0)
          placed.forEach((p) => {
            const original = items.find((it) => it._id === p._id)
            if (original && !original.positionSet) p.z = ++nextZ
          })

          if (isBaseline) {
            initializedRef.current = true
            api.post(`/board/my-notes/${user.username}/seen`).catch(() => {})
          }

          if (newNotys.length > 0) {
            const newIds = new Set(newNotys.map((n) => n._id))
            const rects = placed
              .filter((p) => !newIds.has(p._id))
              .map((p) => ({ x: p.x, y: p.y, w: p.width || 320, h: p.height || 220 }))
            for (const noty of newNotys) {
              const slot = findVisibleSlot(noty.width || 320, noty.height || 220, rects)
              if (slot) {
                const target = placed.find((p) => p._id === noty._id)
                if (target) {
                  target.x = slot.x
                  target.y = slot.y
                  target.positionSet = true
                }
                rects.push({ x: slot.x, y: slot.y, w: noty.width || 320, h: noty.height || 220 })
              }
            }
            const arrivalDrawings = placed.filter((p) => newIds.has(p._id))
            setNewArrivals((prev) => {
              const existing = new Set(prev.map((d) => d._id))
              const novel = arrivalDrawings.filter((d) => !existing.has(d._id))
              return novel.length ? [...prev, ...novel] : prev
            })
          }

          setDrawings(placed)
          if (!silent) fitToContent(placed)

          placed
            .filter((p) => {
              const original = items.find((it) => it._id === p._id)
              return original && !original.positionSet
            })
            .forEach((d) => {
              api
                .patch(`/board/notes/${d._id}`, {
                  x: Math.round(d.x),
                  y: Math.round(d.y),
                  positionSet: true,
                  z: d.z || 0,
                })
                .catch(() => {})
            })
        }
      } catch (error) {
        console.error("Error al cargar el muro:", error)
      } finally {
        setIsLoading(false)
      }
    },
    [user, fitToContent, findVisibleSlot],
  )

  const markAllSeen = useCallback(async () => {
    if (!user) return
    await api.post(`/board/my-notes/${user.username}/seen`).catch(() => {})
  }, [user])

  const deleteNote = useCallback(async (id: string) => {
    try {
      const data = await api.delete(`/board/notes/${id}`)
      if (data.success) {
        setDrawings((prev) => prev.filter((d) => d._id !== id))
        return true
      }
      return false
    } catch (error) {
      console.error("Error al eliminar el dibujo:", error)
      return false
    }
  }, [])

  const persistNote = useCallback((id: string, patch: Record<string, unknown>) => {
    api.patch(`/board/notes/${id}`, patch).catch(() => {})
  }, [])

  return {
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
  }
}