import { ResendEmailService, type ResendEmailServiceOptions } from "./resend-email.service.js"
import type { EmailService } from "./email.types.js"

export * from "./email.types.js"
export * from "./resend-email.service.js"
export * from "./templates/new-drawing.template.js"

export function createEmailService(options?: ResendEmailServiceOptions): EmailService {
  return new ResendEmailService(options)
}

export const defaultEmailService = createEmailService()
