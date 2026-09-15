import { describe, expect, it } from "vitest"
import { wsHub, WS_USER_PREFIX, WS_BOARD_PREFIX } from "./ws-hub.js"

function fakeClient() {
  const sent: string[] = []
  return {
    sent,
    send: (data: string) => void sent.push(data),
    close() {},
  }
}

describe("ws-hub", () => {
  it("registra, emite y limpia conexiones por canal", () => {
    const a = fakeClient()
    const b = fakeClient()
    const c = fakeClient()

    wsHub.register(`${WS_USER_PREFIX}ana`, a)
    wsHub.register(`${WS_USER_PREFIX}ana`, b)
    wsHub.register(`${WS_BOARD_PREFIX}ana`, c)

    wsHub.broadcast(`${WS_USER_PREFIX}ana`, { type: "new-drawing" })

    expect(a.sent).toEqual([JSON.stringify({ type: "new-drawing" })])
    expect(b.sent).toEqual([JSON.stringify({ type: "new-drawing" })])
    expect(c.sent).toEqual([])

    wsHub.unregister(b)
    wsHub.broadcast(`${WS_USER_PREFIX}ana`, { type: "new-drawing" })

    expect(a.sent).toHaveLength(2)
    expect(b.sent).toHaveLength(1)
  })

  it("no hace nada si el canal no tiene suscriptores", () => {
    expect(() => wsHub.broadcast(`${WS_USER_PREFIX}nadie`, { type: "new-drawing" })).not.toThrow()
  })
})