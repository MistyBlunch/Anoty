import { applyTransparency, isTransparent, reorderLayers, type Drawing } from "@/lib/board"

export interface SelectionActionsHost {
  selectedIds: string[]
  selectedDrawings: Drawing[]
  displayDrawings: Drawing[]
  mode: "inbox" | "public"
  setDisplayDrawings: (updater: (prev: Drawing[]) => Drawing[]) => void
  setPublicItems: (items: Drawing[]) => void
  publicItems: Drawing[] | null
  saveDraftItems: (items: Drawing[]) => void
  persistNote: (id: string, patch: Record<string, unknown>) => void
  commit: (items: Drawing[]) => void
  setSelectedIds: (ids: string[]) => void
  setConfirmDeleteId: (id: string | null) => void
}

export function useSelectionActions(host: SelectionActionsHost) {
  const persistSelection = (next: Drawing[], changed: Iterable<[string, Record<string, unknown>]>) => {
    if (host.mode === "public") {
      host.saveDraftItems(next)
    } else {
      for (const [id, patch] of changed) host.persistNote(id, patch)
    }
    host.commit(next)
  }

  const moveLayer = (dir: "front" | "back") => {
    if (host.selectedIds.length === 0) return
    const { next, changed } = reorderLayers(host.displayDrawings, host.selectedIds, dir)
    if (changed.size === 0) return
    host.setDisplayDrawings(() => next)
    persistSelection(next, [...changed].map(([id, z]) => [id, { z }] as [string, Record<string, unknown>]))
  }

  const toggleDrawingBackground = () => {
    if (host.selectedIds.length === 0) return
    const target = host.selectedDrawings.every((d) => isTransparent(d)) ? false : true
    const next = applyTransparency(host.displayDrawings, host.selectedIds, target)
    host.setDisplayDrawings(() => next)
    const changed: Array<[string, Record<string, unknown>]> = host.selectedDrawings.map((d) => [
      d._id,
      { transparent: target },
    ])
    persistSelection(next, changed)
  }

  const removeFromPublicBoard = () => {
    const pub = host.publicItems
    if (!pub || host.selectedIds.length === 0) return
    const ids = new Set(host.selectedIds)
    const next = pub.filter((it) => !ids.has(it._id))
    host.setPublicItems(next)
    host.saveDraftItems(next)
    host.setSelectedIds([])
    host.setConfirmDeleteId(null)
    host.commit(next)
  }

  return { moveLayer, toggleDrawingBackground, removeFromPublicBoard }
}