import type { DrawingCreatedEvent } from "../../domain/index.js"
import type { EmailServicePort } from "../ports/out/email-service.port.js"

export interface DrawingNotificationConfig {
  appUrl?: string
  defaultLocale?: "es" | "en"
}

export class DrawingNotificationService {
  constructor(
    private readonly emailService: EmailServicePort,
    private readonly config: DrawingNotificationConfig = {},
  ) {}

  async handle(event: DrawingCreatedEvent): Promise<void> {
    const { recipient, note } = event
    if (!recipient.email) return

    const appUrl = this.config.appUrl || process.env.APP_URL || "https://anoty.app"
    const defaultLocale =
      this.config.defaultLocale || (process.env.EMAIL_LOCALE as "es" | "en") || "es"
    const resolvedLocale =
      recipient.locale === "es" || recipient.locale === "en"
        ? recipient.locale
        : defaultLocale

    const isAnonymous =
      !note.authorName ||
      [
        "amigo anónimo",
        "amigo anonimo",
        "un amigo anónimo",
        "un amigo anonimo",
        "anonymous friend",
        "an anonymous friend",
      ].includes(note.authorName.trim().toLowerCase())

    const authorName =
      (isAnonymous
        ? resolvedLocale === "es"
          ? "Un amigo anónimo"
          : "An anonymous friend"
        : note.authorName) ||
      (resolvedLocale === "es" ? "Un amigo anónimo" : "An anonymous friend")

    await this.emailService.sendNewDrawingNotification({
      to: recipient.email,
      recipientName: recipient.name || recipient.username,
      recipientUsername: recipient.username,
      authorName,
      boardUrl: `${appUrl}/dashboard`,
      locale: resolvedLocale,
    })
  }
}
