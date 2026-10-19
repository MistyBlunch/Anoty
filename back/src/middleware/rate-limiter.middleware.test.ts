import { describe, it, expect } from "vitest"
import { Hono } from "hono"
import { createRateLimiter } from "./rate-limiter.middleware.js"

describe("RateLimiter Middleware", () => {
  it("permite peticiones dentro del límite permitido", async () => {
    const app = new Hono()
    app.use(
      "/test",
      createRateLimiter({
        windowMs: 60_000,
        max: 3,
        keyGenerator: () => "test-ip-1",
      }),
    )
    app.get("/test", (c) => c.json({ ok: true }))

    const res1 = await app.request("/test")
    expect(res1.status).toBe(200)
    expect(res1.headers.get("RateLimit-Remaining")).toBe("2")

    const res2 = await app.request("/test")
    expect(res2.status).toBe(200)
    expect(res2.headers.get("RateLimit-Remaining")).toBe("1")

    const res3 = await app.request("/test")
    expect(res3.status).toBe(200)
    expect(res3.headers.get("RateLimit-Remaining")).toBe("0")
  })

  it("bloquea con 429 cuando se excede el límite máximo", async () => {
    const app = new Hono()
    app.use(
      "/test",
      createRateLimiter({
        windowMs: 60_000,
        max: 2,
        keyGenerator: () => "test-ip-2",
        message: "Límite excedido",
      }),
    )
    app.get("/test", (c) => c.json({ ok: true }))

    await app.request("/test")
    await app.request("/test")

    const resBlocked = await app.request("/test")
    expect(resBlocked.status).toBe(429)
    const json = (await resBlocked.json()) as any
    expect(json.success).toBe(false)
    expect(json.message).toBe("Límite excedido")
    expect(resBlocked.headers.get("Retry-After")).toBeDefined()
  })

  it("bloquea con 429 si se viola el cooldown entre peticiones", async () => {
    const app = new Hono()
    app.use(
      "/test",
      createRateLimiter({
        windowMs: 60_000,
        max: 10,
        cooldownMs: 1000, // Requiere al menos 1 segundo entre llamadas
        keyGenerator: () => "test-ip-cooldown",
      }),
    )
    app.get("/test", (c) => c.json({ ok: true }))

    const res1 = await app.request("/test")
    expect(res1.status).toBe(200)

    // Inmediata segunda llamada -> violación de cooldown
    const res2 = await app.request("/test")
    expect(res2.status).toBe(429)
    const json = (await res2.json()) as any
    expect(json.message).toContain("espera")
  })
})
