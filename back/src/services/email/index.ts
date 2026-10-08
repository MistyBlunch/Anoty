/**
 * Email Service - Composition Root (Arquitectura Desacoplada)
 *
 * Para cambiar el proveedor de correo (ej. de Resend a Nodemailer, SendGrid, Brevo, AWS SES):
 * 1. Crea la clase implementadora que cumpla la interfaz `EmailService` (de ./email.types.ts).
 * 2. Cambia ÚNICAMENTE la función factory `createEmailService()` en este archivo.
 *
 * Ningún otro archivo (rutas, servicios de negocio, modelos, templates) necesita ser modificado.
 */
import { ResendEmailService, type ResendEmailServiceOptions } from "./resend-email.service.js"
import type { EmailService } from "./email.types.js"

export * from "./email.types.js"
export * from "./resend-email.service.js"
export * from "./templates/new-drawing.template.js"

export function createEmailService(options?: ResendEmailServiceOptions): EmailService {
  return new ResendEmailService(options)
}

export const defaultEmailService: EmailService = createEmailService()
