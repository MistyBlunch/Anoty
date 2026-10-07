export type EmailLocale = "es" | "en"

export interface NewDrawingEmailPayload {
  to: string
  recipientName: string
  recipientUsername: string
  authorName?: string
  boardUrl: string
  locale?: EmailLocale
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
}

export interface EmailService {
  isConfigured(): boolean
  sendNewDrawingNotification(payload: NewDrawingEmailPayload): Promise<EmailResult>
}
