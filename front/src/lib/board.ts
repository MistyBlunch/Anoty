import type { Drawing } from "@/types/drawing"
import type { PublicBoardItem, PublicBoardItemDelta } from "@/types/publicboard"

export type { Drawing } from "@/types/drawing"
export type { PublicBoardItem, PublicBoardItemDelta } from "@/types/publicboard"

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 3
export const BOARD_LIMIT = 100000
export const MAX_ROW_WIDTH = 2000
export const GAP = 14
export const DEFAULT_NOTE_W = 320
export const DEFAULT_NOTE_H = 220

export interface Vector2 {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface BoardViewState {
  zoom: number
  pan: Vector2
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const isTransparent = (d: { transparent?: boolean | null }) => d.transparent === true

export interface MenuPosition {
  left: number
  top: number
  above: boolean
}

export const hintForTool = (
  tool: "select" | "hand" | "marquee",
  mode: "inbox" | "public",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string,
) =>
  tool === "hand"
    ? t("hint_hand")
    : tool === "marquee"
      ? t("hint_marquee")
      : mode === "public"
        ? t("hint_public")
        : t("hint_inbox")

export interface LayerReorder {
  next: Drawing[]
  changed: Map<string, number>
}

export function reorderLayers(
  items: Drawing[],
  selectedIds: string[],
  dir: "front" | "back",
): LayerReorder {
  const ids = new Set(selectedIds)
  const ordered = [...items]
    .map((d, index) => ({ d, index }))
    .sort((a, b) => (a.d.z || 0) - (b.d.z || 0) || a.index - b.index)
  const sel = ordered.filter(({ d }) => ids.has(d._id))
  const others = ordered.filter(({ d }) => !ids.has(d._id))
  if (sel.length === 0) return { next: items, changed: new Map<string, number>() }
  const final = dir === "back" ? [...sel, ...others] : [...others, ...sel]
  const changed = new Map<string, number>()
  final.forEach(({ d }, i) => {
    if ((d.z || 0) !== i) changed.set(d._id, i)
  })
  if (changed.size === 0) return { next: items, changed }
  const next = items.map((d) => {
    const z = changed.get(d._id)
    return z !== undefined ? { ...d, z } : d
  })
  return { next, changed }
}

export const applyTransparency = (
  items: Drawing[],
  selectedIds: string[],
  target: boolean,
): Drawing[] => {
  const ids = new Set(selectedIds)
  return items.map((d) => (ids.has(d._id) ? { ...d, transparent: target } : d))
}

export const fitNoteSize = (w?: number | string | null, h?: number | string | null) => {
  const maxW = 520
  const maxH = 420
  const ww = Math.max(40, Number(w) || 320)
  const hh = Math.max(40, Number(h) || 220)
  const k = Math.min(1, maxW / ww, maxH / hh)
  return { width: Math.round(ww * k), height: Math.round(hh * k) }
}

export const rectsCollide = (rects: Rect[], x: number, y: number, w: number, h: number, gap = GAP) =>
  rects.some((r) => x < r.x + r.w + gap && x + w + gap > r.x && y < r.y + r.h + gap && y + h + gap > r.y)

export function placeDrawings(items: Drawing[]): Drawing[] {
  const placed: Rect[] = []
  const sorted = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const findFreeSlot = (w: number, h: number) => {
    for (let cy = 0; cy < BOARD_LIMIT; cy += 14) {
      for (let cx = 0; cx < MAX_ROW_WIDTH; cx += 14) {
        if (!rectsCollide(placed, cx, cy, w, h)) return { x: cx, y: cy }
      }
    }
    return { x: 0, y: 0 }
  }

  return sorted.map((d) => {
    const w = d.width || DEFAULT_NOTE_W
    const h = d.height || DEFAULT_NOTE_H
    const hasPosition = Boolean(d.positionSet) || d.x !== 0 || d.y !== 0

    if (hasPosition) {
      placed.push({ x: d.x, y: d.y, w, h })
      return d
    }

    const slot = findFreeSlot(w, h)
    placed.push({ x: slot.x, y: slot.y, w, h })
    return { ...d, x: slot.x, y: slot.y, positionSet: true }
  })
}

export function findVisibleFreeSlot(
  viewW: number,
  viewH: number,
  pan: Vector2,
  zoom: number,
  w: number,
  h: number,
  rects: Rect[],
): Vector2 | null {
  const x0 = -pan.x / zoom
  const y0 = -pan.y / zoom
  const x1 = (viewW - pan.x) / zoom
  const y1 = (viewH - pan.y) / zoom

  const isVisible = (x: number, y: number) => x >= x0 && y >= y0 && x + w <= x1 && y + h <= y1

  const vCenterX = (x0 + x1) / 2
  const vCenterY = (y0 + y1) / 2

  const centerSlot = (): Vector2 => ({
    x: Math.round(vCenterX - w / 2),
    y: Math.round(vCenterY - h / 2),
  })

  if (rects.length === 0) return centerSlot()

  const distToCenter = (r: Rect) =>
    Math.abs(r.x + r.w / 2 - vCenterX) + Math.abs(r.y + r.h / 2 - vCenterY)

  const sorted = [...rects].sort((a, b) => distToCenter(a) - distToCenter(b))

  for (const r of sorted) {
    const spots = [
      { x: r.x + r.w + GAP, y: r.y },
      { x: r.x - w - GAP, y: r.y },
      { x: r.x, y: r.y + r.h + GAP },
      { x: r.x, y: r.y - h - GAP },
    ]
    for (const spot of spots) {
      if (isVisible(spot.x, spot.y) && !rectsCollide(rects, spot.x, spot.y, w, h)) {
        return spot
      }
    }
  }

  const step = 28
  const HALF = 1500
  const sx0 = Math.max(x0, vCenterX - HALF)
  const sy0 = Math.max(y0, vCenterY - HALF)
  const sx1 = Math.min(x1, vCenterX + HALF)
  const sy1 = Math.min(y1, vCenterY + HALF)
  for (let cy = sy0; cy + h <= sy1; cy += step) {
    for (let cx = sx0; cx + w <= sx1; cx += step) {
      if (!rectsCollide(rects, cx, cy, w, h)) return { x: cx, y: cy }
    }
  }

  const minX = Math.min(vCenterX - HALF, ...rects.map((r) => r.x - w - GAP))
  const minY = Math.min(vCenterY - HALF, ...rects.map((r) => r.y - h - GAP))
  const maxX = Math.max(vCenterX + HALF, ...rects.map((r) => r.x + r.w + GAP))
  const maxY = Math.max(vCenterY + HALF, ...rects.map((r) => r.y + r.h + GAP))
  for (let cy = minY; cy + h <= maxY; cy += step) {
    for (let cx = minX; cx + w <= maxX; cx += step) {
      if (!rectsCollide(rects, cx, cy, w, h)) return { x: cx, y: cy }
    }
  }
  return null
}

const fitViewport = (
  viewW: number,
  viewH: number,
  box: Rect,
  capZoom = 1.25,
  padding = 60,
): BoardViewState => {
  const boxW = Math.max(1, Number(box.w) || DEFAULT_NOTE_W)
  const boxH = Math.max(1, Number(box.h) || DEFAULT_NOTE_H)
  const boxX = Number(box.x) || 0
  const boxY = Number(box.y) || 0
  const fitX = (viewW - padding) / (boxW + padding)
  const fitY = (viewH - padding) / (boxH + padding)
  let zoom = Math.min(fitX, fitY)
  zoom = Math.min(zoom, capZoom)
  zoom = Math.max(zoom, MIN_ZOOM)
  if (Number.isNaN(zoom)) zoom = 0.8
  const centerX = boxX + boxW / 2
  const centerY = boxY + boxH / 2
  const panX = viewW / 2 - centerX * zoom
  const panY = viewH / 2 - centerY * zoom
  return {
    zoom,
    pan: {
      x: Number.isNaN(panX) ? 0 : panX,
      y: Number.isNaN(panY) ? 0 : panY,
    },
  }
}

export function computeContentView(viewW: number, viewH: number, items: Drawing[]): BoardViewState {
  if (items.length === 0) return { zoom: 0.8, pan: { x: 0, y: 0 } }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const d of items) {
    const w = Number(d.width) || DEFAULT_NOTE_W
    const h = Number(d.height) || DEFAULT_NOTE_H
    const x = Number(d.x) || 0
    const y = Number(d.y) || 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  return fitViewport(viewW, viewH, {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  })
}

export function computeFocusView(viewW: number, viewH: number, d: Drawing): BoardViewState {
  const w = Number(d.width) || DEFAULT_NOTE_W
  const h = Number(d.height) || DEFAULT_NOTE_H
  const x = Number(d.x) || 0
  const y = Number(d.y) || 0
  return fitViewport(viewW, viewH, { x, y, w, h })
}

export function zoomTowardPoint(
  pan: Vector2,
  zoom: number,
  factor: number,
  cx: number,
  cy: number,
): BoardViewState {
  const next = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const k = next / zoom
  return {
    zoom: next,
    pan: { x: cx - (cx - pan.x) * k, y: cy - (cy - pan.y) * k },
  }
}

export function serializeBoardItems(
  items: Drawing[],
  options: { includeContent?: boolean } = {},
): PublicBoardItem[] {
  return items.map((it) => {
    const item: PublicBoardItem = {
      noteId: it._id,
      authorName: it.authorName,
      createdAt: it.createdAt,
      x: Math.round(it.x),
      y: Math.round(it.y),
      width: it.width,
      height: it.height,
      rotation: it.rotation || 0,
      z: it.z || 0,
      transparent: isTransparent(it),
    }
    if (options.includeContent) {
      item.content = it.content
    }
    return item
  })
}

export function serializeBoardLayout(items: Drawing[]): PublicBoardItem[] {
  return serializeBoardItems(items, { includeContent: false })
}

export function diffBoardItems(prev: Drawing[], next: Drawing[]): PublicBoardItemDelta[] {
  const prevMap = new Map(prev.map((d) => [d._id, d]))
  const deltas: PublicBoardItemDelta[] = []

  for (const n of next) {
    const p = prevMap.get(n._id)
    if (!p) continue
    const roundX = Math.round(n.x)
    const roundY = Math.round(n.y)
    const prevX = Math.round(p.x)
    const prevY = Math.round(p.y)
    const hasChanged =
      roundX !== prevX ||
      roundY !== prevY ||
      n.width !== p.width ||
      n.height !== p.height ||
      (n.rotation || 0) !== (p.rotation || 0) ||
      (n.z || 0) !== (p.z || 0) ||
      isTransparent(n) !== isTransparent(p)

    if (hasChanged) {
      deltas.push({
        noteId: n._id,
        x: roundX,
        y: roundY,
        width: n.width,
        height: n.height,
        rotation: n.rotation || 0,
        z: n.z || 0,
        transparent: isTransparent(n),
      })
    }
  }

  return deltas
}

export function normalizeBoardItems(arr: unknown[]): Drawing[] {
  return arr.map((raw) => {
    const it = raw as Record<string, unknown>
    const ww = Number(it.width)
    const hh = Number(it.height)
    const width = Number.isFinite(ww) && ww > 0 ? Math.max(40, Math.min(5000, Math.round(ww))) : DEFAULT_NOTE_W
    const height = Number.isFinite(hh) && hh > 0 ? Math.max(40, Math.min(5000, Math.round(hh))) : DEFAULT_NOTE_H
    const itemId = (it.noteId || it._id || it.id || "") as string
    return {
      _id: itemId,
      content: (it.content as string) || "",
      x: Number(it.x) || 0,
      y: Number(it.y) || 0,
      width,
      height,
      rotation: Number(it.rotation) || 0,
      authorName: it.authorName as string | undefined,
      createdAt: (it.createdAt as string) || new Date().toISOString(),
      z: Number(it.z) || 0,
      transparent: typeof it.transparent === "boolean" ? it.transparent : null,
    }
  })
}

export function normalizeNotes(notes: unknown[]): Drawing[] {
  return (notes || [])
    .filter((n) => (n as Record<string, unknown>).type === "drawing")
    .map((raw) => {
      const n = raw as Record<string, unknown>
      const size = fitNoteSize(n.width as number | undefined, n.height as number | undefined)
      const noteId = (n._id || n.id || "") as string
      return {
        _id: noteId,
        content: (n.content as string) || "",
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        width: size.width,
        height: size.height,
        rotation: Number(n.rotation) || 0,
        authorName: n.authorName as string | undefined,
        createdAt: n.createdAt as string,
        isSeen: n.isSeen as boolean | undefined,
        positionSet: Boolean(n.positionSet),
        z: Number(n.z) || 0,
        transparent: typeof n.transparent === "boolean" ? n.transparent : null,
      }
    })
}