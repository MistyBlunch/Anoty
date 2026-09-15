import { describe, expect, it } from "vitest"
import { isNewerUpdatedAt, nextBackoff, wsUrlFromApi } from "@/lib/realtime"

describe("wsUrlFromApi", () => {
  it("convierte http a ws conservando host y puerto", () => {
    expect(wsUrlFromApi("http://localhost:3000")).toBe("ws://localhost:3000")
  })

  it("convierte https a wss", () => {
    expect(wsUrlFromApi("https://api.anoty.app")).toBe("wss://api.anoty.app")
  })

  it("quita la barra final", () => {
    expect(wsUrlFromApi("http://localhost:3000/")).toBe("ws://localhost:3000")
  })
})

describe("nextBackoff", () => {
  it("arranca en 1s y sube exponencial", () => {
    expect(nextBackoff(1)).toBe(1000)
    expect(nextBackoff(2)).toBe(2000)
    expect(nextBackoff(3)).toBe(4000)
  })

  it("techo de 15s", () => {
    expect(nextBackoff(5)).toBe(15000)
    expect(nextBackoff(10)).toBe(15000)
  })

  it("cero para intentos nulos", () => {
    expect(nextBackoff(0)).toBe(0)
  })
})

describe("isNewerUpdatedAt", () => {
  it("acepta cualquier valor si no hay referencia previa", () => {
    expect(isNewerUpdatedAt(null, "2026-01-01T00:00:00.000Z")).toBe(true)
  })

  it("acepta solo valores más nuevos", () => {
    const base = "2026-01-01T00:00:00.000Z"
    expect(isNewerUpdatedAt(base, "2026-01-02T00:00:00.000Z")).toBe(true)
    expect(isNewerUpdatedAt(base, "2025-01-01T00:00:00.000Z")).toBe(false)
    expect(isNewerUpdatedAt(base, base)).toBe(false)
  })

  it("rechaza tramas sin updatedAt", () => {
    expect(isNewerUpdatedAt(null, undefined)).toBe(false)
    expect(isNewerUpdatedAt(null, 123)).toBe(false)
  })
})