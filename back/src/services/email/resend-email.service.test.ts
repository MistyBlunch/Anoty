import { describe, it, expect, vi } from "vitest"
import { ResendEmailService } from "./resend-email.service.js"
import { renderNewDrawingEmail } from "./templates/new-drawing.template.js"

describe("renderNewDrawingEmail", () => {
  it("genera subject, html y text en inglés por defecto cuando no se especifica locale", () => {
    const output = renderNewDrawingEmail({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      authorName: "Lucas",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(output.subject).toContain("New noty on your board, @emma!")
    expect(output.text).toContain("Lucas")
    expect(output.text).toContain("https://anoty.app/dashboard")
    expect(output.html).toContain("Hi, Emma!")
    expect(output.html).toContain("View drawing on my board")
    expect(output.html).toContain("https://anoty.app/dashboard")
  })

  it("utiliza 'An anonymous friend' en inglés por defecto si no se proporciona authorName", () => {
    const output = renderNewDrawingEmail({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(output.text).toContain("An anonymous friend")
    expect(output.html).toContain("An anonymous friend")
  })

  it("traduce 'Amigo Anónimo' a 'An anonymous friend' si el correo es en inglés", () => {
    const output = renderNewDrawingEmail({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      authorName: "Amigo Anónimo",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(output.text).toContain("An anonymous friend")
    expect(output.html).toContain("An anonymous friend")
    expect(output.text).not.toContain("Amigo Anónimo")
  })

  it("genera la plantilla en español cuando locale es 'es'", () => {
    const output = renderNewDrawingEmail({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      authorName: "Lucas",
      boardUrl: "https://anoty.app/dashboard",
      locale: "es",
    })

    expect(output.subject).toContain("¡Nuevo noty en tu board, @emma!")
    expect(output.html).toContain("¡Hola, Emma!")
    expect(output.html).toContain("Ver dibujo en mi board")
    expect(output.text).toContain("te ha dejado un nuevo dibujo")
  })

  it("utiliza 'Un amigo anónimo' en español si no se proporciona authorName y locale es 'es'", () => {
    const output = renderNewDrawingEmail({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      boardUrl: "https://anoty.app/dashboard",
      locale: "es",
    })

    expect(output.text).toContain("Un amigo anónimo")
    expect(output.html).toContain("Un amigo anónimo")
  })
})

describe("ResendEmailService", () => {
  it("omite el envío y retorna error descriptivo si no hay API key", async () => {
    const service = new ResendEmailService({ apiKey: "" })
    expect(service.isConfigured()).toBe(false)

    const result = await service.sendNewDrawingNotification({
      to: "test@example.com",
      recipientName: "Test",
      recipientUsername: "test",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("RESEND_API_KEY no configurada")
  })

  it("falla de forma segura si la dirección de correo es inválida", async () => {
    const mockSend = vi.fn()
    const service = new ResendEmailService({
      apiKey: "re_fake_key",
      client: { emails: { send: mockSend } } as any,
    })

    const result = await service.sendNewDrawingNotification({
      to: "invalid-email",
      recipientName: "Test",
      recipientUsername: "test",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("inválida")
    expect(mockSend).not.toHaveBeenCalled()
  })

  it("envía el correo con éxito usando el cliente de Resend", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      data: { id: "resend_msg_123" },
      error: null,
    })
    const service = new ResendEmailService({
      apiKey: "re_fake_key",
      from: "Anoty <onboarding@resend.dev>",
      client: { emails: { send: mockSend } } as any,
    })

    const result = await service.sendNewDrawingNotification({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      authorName: "Pedro",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(result.success).toBe(true)
    expect(result.id).toBe("resend_msg_123")
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Anoty <onboarding@resend.dev>",
        to: "emma@example.com",
        subject: expect.stringContaining("@emma"),
        html: expect.stringContaining("Pedro"),
      }),
    )
  })

  it("captura errores de la API de Resend sin arrojar excepción", async () => {
    const mockSend = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Resend rate limit exceeded" },
    })
    const service = new ResendEmailService({
      apiKey: "re_fake_key",
      client: { emails: { send: mockSend } } as any,
    })

    const result = await service.sendNewDrawingNotification({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe("Resend rate limit exceeded")
  })

  it("captura excepciones no controladas de red sin arrojar error", async () => {
    const mockSend = vi.fn().mockRejectedValue(new Error("Network timeout"))
    const service = new ResendEmailService({
      apiKey: "re_fake_key",
      client: { emails: { send: mockSend } } as any,
    })

    const result = await service.sendNewDrawingNotification({
      to: "emma@example.com",
      recipientName: "Emma",
      recipientUsername: "emma",
      boardUrl: "https://anoty.app/dashboard",
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe("Network timeout")
  })
})
