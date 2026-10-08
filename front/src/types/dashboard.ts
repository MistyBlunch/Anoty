import type React from "react"
import type { Drawing } from "./drawing"
import type { AuthenticatedUser } from "./auth"
import type { MenuPosition } from "@/lib/board"
import type { PaletteDrag } from "@/hooks/useBoardGesture"

export type DashboardMode = "inbox" | "public"

export interface BoardSwitcherProps {
  mode: DashboardMode
  onInbox: () => void
  onPublic: () => void
}

export interface HeaderActionsProps {
  user: AuthenticatedUser
  mode: DashboardMode
  onInbox: () => void
  onPublic: () => void
  newArrivals: Drawing[]
  notificationsOpen: boolean
  onToggleNotifications: () => void
  onFocusDrawing: (d: Drawing) => void
  onClearNotifications: () => void
  onLogout: () => void
}

export interface NotificationsDropdownProps {
  user: AuthenticatedUser
  newArrivals: Drawing[]
  open: boolean
  onToggle: () => void
  onFocus: (d: Drawing) => void
  onClear: () => void
}

export interface ActionsMenuProps {
  innerRef: React.Ref<HTMLDivElement>
  drawings: Drawing[]
  mode: DashboardMode
  confirmDeleteVisible: boolean
  pos: MenuPosition
  onExportPng: () => void
  onToggleBackground: () => void
  onMoveLayer: (dir: "front" | "back") => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onRemovePublic: () => void
}

export interface PublicControlsProps {
  copied: boolean
  isPublished: boolean
  onCopy: () => void
  onToggle: () => void
}

export interface PublicSidebarProps {
  innerRef: React.Ref<HTMLElement>
  hovered: boolean
  title: string
  onTitleChange: (value: string) => void
  paletteDrawings: Drawing[]
  onPalettePointerDown: (e: React.PointerEvent, d: Drawing) => void
  paletteDrag: PaletteDrag | null
  open: boolean
  onToggle: () => void
  saving: boolean
  savedFeed: boolean
  onSave: () => void
}
