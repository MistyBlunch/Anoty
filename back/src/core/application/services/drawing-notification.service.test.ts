import { describe, it, expect, vi } from "vitest"
import { DrawingNotificationService } from "./drawing-notification.service.js"
import type { EmailServicePort } from "../ports/out/email-service.port.js"

describe("DrawingNotificationService", () => {
  it("omite la notificación si el destinatario no tiene correo", async () => {
    const sendFn = vi.fn()
    const emailService: EmailServicePort = {
      isConfigured: () => true,
      sendNewDrawingNotification: sendFn,
    }

    const service = new DrawingNotificationService(emailService)
    await service.handle({
      recipient: { username: "emma" },
      note: { boardUsername: "emma", type: "drawing", content: "data" },
    })

    expect(sendFn).not.toHaveBeenCalled()
  })

  it("normaliza el autor a 'Un amigo anónimo' en español si no tiene nombre o es 'amigo anonimo'", async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: true })
    const emailService: EmailServicePort = {
      isConfigured: () => true,
      sendNewDrawingNotification: sendFn,
    }

    const service = new DrawingNotificationService(emailService, {
      appUrl: "https://anoty.app",
      defaultLocale: "es",
    })

    await service.handle({
      recipient: { username: "emma", email: "emma@example.com", locale: "es" },
      note: {
        boardUsername: "emma",
        type: "drawing",
        content: "data",
        authorName: "amigo anonimo",
      },
    })

    expect(sendFn).toHaveBeenCalledTimes(1)
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "emma@example.com",
        authorName: "Un amigo anónimo",
        locale: "es",
      }),
    )
  })

  it("normaliza el autor a 'An anonymous friend' si el locale es inglés", async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: true })
    const emailService: EmailServicePort = {
      isConfigured: () => true,
      sendNewDrawingNotification: sendFn,
    }

    const service = new DrawingNotificationService(emailService, {
      appUrl: "https://anoty.app",
      defaultLocale: "en",
    })

    await service.handle({
      recipient: { username: "emma", email: "emma@example.com", locale: "en" },
      note: {
        boardUsername: "emma",
        type: "drawing",
        content: "data",
        authorName: "an anonymous friend",
      },
    })

    expect(sendFn).toHaveBeenCalledTimes(1)
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "emma@example.com",
        authorName: "An anonymous friend",
        locale: "en",
      }),
    )
  })

  it("preserva el nombre personalizado del autor", async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: true })
    const emailService: EmailServicePort = {
      isConfigured: () => true,
      sendNewDrawingNotification: sendFn,
    }

    const service = new DrawingNotificationService(emailService)

    await service.handle({
      recipient: { username: "emma", email: "emma@example.com" },
      note: {
        boardUsername: "emma",
        type: "drawing",
        content: "data",
        authorName: "Carlos D.",
      },
    })

    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        authorName: "Carlos D.",
      }),
    )
  })

  it("evita inundación de correos aplicando cooldown cuando llegan múltiples dibujos consecutivos", async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: true })
    const emailService: EmailServicePort = {
      isConfigured: () => true,
      sendNewDrawingNotification: sendFn,
    }

    const service = new DrawingNotificationService(emailService, {
      emailCooldownMs: 60_000,
    })

    const event = {
      recipient: { username: "emma", email: "emma@example.com" },
      note: {
        boardUsername: "emma",
        type: "drawing" as const,
        content: "data",
        authorName: "Amigo 1",
      },
    }

    // Primer dibujo -> Se envía el correo
    await service.handle(event)
    expect(sendFn).toHaveBeenCalledTimes(1)

    // Segundo y tercer dibujo inmediato -> Omitidos por cooldown activo
    await service.handle(event)
    await service.handle(event)
    expect(sendFn).toHaveBeenCalledTimes(1)
  })
})
