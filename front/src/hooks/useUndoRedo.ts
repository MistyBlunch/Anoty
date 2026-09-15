import { useCallback, useRef, useState } from "react"
import type { Drawing } from "@/lib/board"

const MAX_HISTORY = 100

export interface UndoRedoState {
  canUndo: boolean
  canRedo: boolean
  commit: (items: Drawing[]) => void
  undo: () => Drawing[] | null
  redo: () => Drawing[] | null
  reset: (snapshot: Drawing[]) => void
}

export function useUndoRedo(): UndoRedoState {
  const historyRef = useRef<Drawing[][]>([])
  const indexRef = useRef(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(indexRef.current > 0)
    setCanRedo(indexRef.current < historyRef.current.length - 1)
  }, [])

  const commit = useCallback(
    (items: Drawing[]) => {
      if (!items) return
      const ahead = historyRef.current.length - 1 - indexRef.current
      if (ahead > 0) {
        historyRef.current = historyRef.current.slice(0, indexRef.current + 1)
      }
      historyRef.current.push(items)
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift()
      }
      indexRef.current = historyRef.current.length - 1
      syncFlags()
    },
    [syncFlags],
  )

  const undo = useCallback((): Drawing[] | null => {
    if (indexRef.current <= 0) return null
    indexRef.current--
    syncFlags()
    return historyRef.current[indexRef.current]
  }, [syncFlags])

  const redo = useCallback((): Drawing[] | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null
    indexRef.current++
    syncFlags()
    return historyRef.current[indexRef.current]
  }, [syncFlags])

  const reset = useCallback(
    (snapshot: Drawing[]) => {
      historyRef.current = [snapshot]
      indexRef.current = 0
      syncFlags()
    },
    [syncFlags],
  )

  return { canUndo, canRedo, commit, undo, redo, reset }
}