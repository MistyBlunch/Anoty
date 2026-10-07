import { Resend } from "resend"
import type { EmailService, EmailResult, NewDrawingEmailPayload } from "./email.types.js"
import { renderNewDrawingEmail } from "./templates/new-drawing.template.js"

export interface ResendEmailServiceOptions {
  apiKey?: string
  from?: string
  client?: Resend
}

export class ResendEmailService implements EmailService {
  private readonly apiKey?: string
  private readonly from: string
  private readonly client?: Resend

  constructor(options: ResendEmailServiceOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.RESEND_API_KEY
    this.from = options.from ?? process.env.RESEND_FROM_EMAIL ?? "Anoty <onboarding@resend.dev>"

    if (options.client) {
      this.client = options.client
    } else if (this.apiKey) {
      this.client = new Resend(this.apiKey)
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.client)
  }

  async sendNewDrawingNotification(payload: NewDrawingEmailPayload): Promise<EmailResult> {
    if (!this.isConfigured() || !this.client) {
      console.log(
        `ℹ️ [EmailService] RESEND_API_KEY no configurada. Omitiendo notificación por correo para @${payload.recipientUsername} (${payload.to}).`,
      )
      return {
        success: false,
        error: "RESEND_API_KEY no configurada",
      }
    }

    if (!payload.to || !payload.to.includes("@")) {
      console.warn(
        `⚠️ [EmailService] Dirección de correo inválida para @${payload.recipientUsername}: "${payload.to}".`,
      )
      return {
        success: false,
        error: "Dirección de correo inválida",
      }
    }

    const { subject, html, text } = renderNewDrawingEmail(payload)

    try {
      const response = await this.client.emails.send({
        from: this.from,
        to: payload.to,
        subject,
        html,
        text,
      })

      if (response.error) {
        console.error(
          `❌ [EmailService] Error de Resend al notificar a @${payload.recipientUsername} (${payload.to}):`,
          response.error,
        )
        return {
          success: false,
          error: response.error.message,
        }
      }

      console.log(
        `📧 [EmailService] Correo enviado con éxito a @${payload.recipientUsername} (${payload.to}) [ID: ${response.data?.id}]`,
      )
      return {
        success: true,
        id: response.data?.id,
      }
    } catch (err: any) {
      console.error(
        `❌ [EmailService] Excepción al enviar correo a @${payload.recipientUsername} (${payload.to}):`,
        err?.message || err,
      )
      return {
        success: false,
        error: err?.message || "Error desconocido al enviar correo",
      }
    }
  }
}
