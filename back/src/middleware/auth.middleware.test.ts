import { describe, it, expect, beforeAll } from "vitest"
import { Hono } from "hono"
import { authMiddleware } from "./auth.middleware.js"
import { signSessionToken } from "../lib/auth.js"
import { AppError } from "../lib/error.js"

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret"
})

function makeApp() {
  const app = new Hono()
  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json({ success: false, message: error.message }, error.status as any)
    }
    return c.json({ success: false }, 500)
  })
  app.get("/private", authMiddleware, async (c) => {
    const u = c.get("authUser")
    return c.json({ ok: true, sub: u.sub, username: u.username })
  })
  return app
}

describe("auth.middleware", () => {
  it("rechaza peticiones sin header Authorization", async () => {
    const res = await makeApp().request("/private")
    expect(res.status).toBe(401)
  })

  it("rechaza headers que no son Bearer", async () => {
    const res = await makeApp().request("/private", {
      headers: { Authorization: "Basic abc" },
    })
    expect(res.status).toBe(401)
  })

  it("rechaza tokens con firma inválida", async () => {
    const res = await makeApp().request("/private", {
      headers: { Authorization: "Bearer token-inventado" },
    })
    expect(res.status).toBe(401)
  })

  it("permite el acceso con un token firmado válido e inyecta el usuario", async () => {
    const token = await signSessionToken({ _id: "u1", username: "emma" })
    const res = await makeApp().request("/private", {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, sub: "u1", username: "emma" })
  })
})