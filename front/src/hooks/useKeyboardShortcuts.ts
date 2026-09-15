import { useEffect, useRef } from "react"

export interface KeyboardShortcutHandlers {
  onEscape: () => void
  onToolChange: (tool: "select" | "hand" | "marquee") => void
  onUndo: (shifted: boolean) => void
  onRedo: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      const h = ref.current

      if (e.key === "Escape") {
        h.onEscape()
        return
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === "z") {
          e.preventDefault()
          h.onUndo(e.shiftKey)
        } else if (key === "y") {
          e.preventDefault()
          h.onRedo()
        }
        return
      }

      const key = e.key.toLowerCase()
      if (key === "v") h.onToolChange("select")
      else if (key === "h") h.onToolChange("hand")
      else if (key === "m") h.onToolChange("marquee")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])
}