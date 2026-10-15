export interface SendEmailPayload {
  to: string
  recipientName: string
  recipientUsername: string
  authorName: string
  boardUrl: string
  locale: "es" | "en"
}

export interface EmailServicePort {
  sendNewDrawingNotification(payload: SendEmailPayload): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }>
  isConfigured(): boolean
}
