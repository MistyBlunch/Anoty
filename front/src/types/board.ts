import type React from "react"
import type { Drawing } from "./drawing"
import type { Vector2 } from "@/lib/board"
import type { MarqueeRect } from "@/hooks/useBoardGesture"

export type BoardTool = "select" | "hand" | "marquee"

export interface BoardDrag {
  startX: number
  startY: number
  origPanX: number
  origPanY: number
  moved: boolean
}

export interface EmptyBoardProps {
  variant: "inbox" | "public" | "viewer"
  shifted?: boolean
  copied?: boolean
  onCopyShare?: () => void
}

export interface HintBarProps {
  text: string
}

export interface ZoomControlsProps {
  zoom: number
  onZoom: (factor: number) => void
}

export interface BoardControlsProps {
  tool: BoardTool
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onToolChange: (tool: BoardTool) => void
  onUndo: () => void
  onRedo: () => void
  onZoom: (factor: number) => void
}

export interface MarqueeOverlayProps {
  rect: MarqueeRect
}

export interface BoardNoteProps {
  drawing: Drawing
  selected?: boolean
  pulsing?: boolean
}

export interface NoteCardProps {
  drawing: Drawing
  selected: boolean
  pulsing: boolean
  scale: number
  handTool?: boolean
  onDrawStart: (e: React.PointerEvent, d: Drawing) => void
  onResizeStart: (e: React.PointerEvent, d: Drawing) => void
}

export interface NotesCanvasProps {
  items: Drawing[]
  pan: Vector2
  zoom: number
  zIndex?: number
  interactive?: boolean
  handTool?: boolean
  animated?: boolean
  selectedIds?: string[]
  pulseId?: string | null
  scaleOf?: (d: Drawing) => number
  onDrawStart?: (e: React.PointerEvent, d: Drawing) => void
  onResizeStart?: (e: React.PointerEvent, d: Drawing) => void
}
