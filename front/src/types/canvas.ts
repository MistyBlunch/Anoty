export interface ExcalidrawCanvasActions {
  canSend: boolean
  isSending: boolean
  sendDrawing: () => Promise<void>
}

export interface ExcalidrawCanvasProps {
  username?: string
  onSent?: () => void
  onCanSendChange?: (canSend: boolean) => void
  onIsSendingChange?: (isSending: boolean) => void
  onRegisterSend?: (sendFn: () => Promise<void>) => void
  hideFloatingButton?: boolean
}
