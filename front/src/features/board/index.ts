// Components
export { default as BoardControls } from "@/components/board/BoardControls"
export { default as BoardNote } from "@/components/board/BoardNote"
export { default as EmptyBoard } from "@/components/board/EmptyBoard"
export { default as ExcalidrawCanvas } from "@/components/ExcalidrawCanvas"
export { default as HintBar } from "@/components/board/HintBar"
export { default as MarqueeOverlay } from "@/components/board/MarqueeOverlay"
export { default as NoteCard } from "@/components/board/NoteCard"
export { default as NotesCanvas } from "@/components/board/NotesCanvas"
export { default as ZoomControls } from "@/components/board/ZoomControls"

// Hooks
export { useZoomPan } from "@/hooks/useZoomPan"
export { useBoardGesture } from "@/hooks/useBoardGesture"
export { useDrawings } from "@/hooks/useDrawings"
export { useUndoRedo } from "@/hooks/useUndoRedo"
export { useSelectionActions } from "@/hooks/useSelectionActions"
export { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
export { useActionsMenuPosition } from "@/hooks/useActionsMenuPosition"
export { useFitToContent } from "@/hooks/useFitToContent"
export { useResizeObserver } from "@/hooks/useResizeObserver"
export { useRealtimeBoard } from "@/hooks/useRealtimeBoard"
export { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications"

// Domain logic & utilities
export * from "@/lib/board"
