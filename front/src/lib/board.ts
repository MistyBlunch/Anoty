import type { Drawing } from "@/types/drawing"
import type { PublicBoardItem } from "@/types/publicboard"

export type { Drawing } from "@/types/drawing"
export type { PublicBoardItem } from "@/types/publicboard"

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

export const hintForTool = (tool: "select" | "hand" | "marquee", mode: "inbox" | "public") =>
  tool === "hand"
    ? "Modo mano — arrastra para mover el lienzo • Rueda o pellizco para zoom • V: seleccionar • Ctrl+Z: deshacer"
    : tool === "marquee"
      ? "Arrastra en el lienzo para seleccionar varios dibujos • Mantén Shift mientras arrastras para sumar • Esc: salir"
      : mode === "public"
        ? "Arrastra tus dibujos desde el panel izquierdo • Mueve y reordena como quieras • M: selección múltiple • H: mano • Ctrl+Z: deshacer"
        : "Arrastra el fondo para moverte • Rueda o pellizco para zoom • Arrastra un dibujo para moverlo • M: selección múltiple • H: mano • Ctrl+Z: deshacer"

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
  const boxW = box.w
  const boxH = box.h
  const fitX = (viewW - padding) / (boxW + padding)
  const fitY = (viewH - padding) / (boxH + padding)
  let zoom = Math.min(fitX, fitY)
  zoom = Math.min(zoom, capZoom)
  zoom = Math.max(zoom, MIN_ZOOM)
  const centerX = box.x + boxW / 2
  const centerY = box.y + boxH / 2
  return {
    zoom,
    pan: {
      x: viewW / 2 - centerX * zoom,
      y: viewH / 2 - centerY * zoom,
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
    const w = d.width || DEFAULT_NOTE_W
    const h = d.height || DEFAULT_NOTE_H
    minX = Math.min(minX, d.x)
    minY = Math.min(minY, d.y)
    maxX = Math.max(maxX, d.x + w)
    maxY = Math.max(maxY, d.y + h)
  }

  return fitViewport(viewW, viewH, {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  })
}

export function computeFocusView(viewW: number, viewH: number, d: Drawing): BoardViewState {
  const w = d.width || DEFAULT_NOTE_W
  const h = d.height || DEFAULT_NOTE_H
  return fitViewport(viewW, viewH, { x: d.x, y: d.y, w, h })
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

export function serializeBoardItems(items: Drawing[]): PublicBoardItem[] {
  return items.map((it) => ({
    noteId: it._id,
    content: it.content,
    authorName: it.authorName,
    createdAt: it.createdAt,
    x: Math.round(it.x),
    y: Math.round(it.y),
    width: it.width,
    height: it.height,
    rotation: it.rotation || 0,
    z: it.z || 0,
    transparent: isTransparent(it),
  }))
}

export function normalizeBoardItems(arr: unknown[]): Drawing[] {
  return arr.map((raw) => {
    const it = raw as Record<string, unknown>
    const size = fitNoteSize(it.width as number | undefined, it.height as number | undefined)
    return {
      _id: it.noteId as string,
      content: (it.content as string) || "",
      x: Number(it.x) || 0,
      y: Number(it.y) || 0,
      width: size.width,
      height: size.height,
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
      return {
        _id: n._id as string,
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