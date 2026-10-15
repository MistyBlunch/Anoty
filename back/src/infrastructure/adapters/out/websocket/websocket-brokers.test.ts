import { describe, it, expect, vi } from "vitest"
import { InMemoryWsBroker } from "./in-memory-ws.broker.js"
import { RedisPubSubWsBroker } from "./redis-pubsub-ws.broker.js"
import { createWsBroker } from "./index.js"

function makeFakeClient() {
  const sent: string[] = []
  return {
    sent,
    send: (data: string) => void sent.push(data),
    close: () => {},
  }
}

describe("InMemoryWsBroker", () => {
  it("permite registrar, emitir y desregistrar clientes por canal", () => {
    const broker = new InMemoryWsBroker()
    const clientA = makeFakeClient()
    const clientB = makeFakeClient()

    broker.register("user:emma", clientA)
    broker.register("user:emma", clientB)
    broker.register("board:emma", clientA)

    broker.broadcast("user:emma", { type: "test" })

    expect(clientA.sent).toEqual([JSON.stringify({ type: "test" })])
    expect(clientB.sent).toEqual([JSON.stringify({ type: "test" })])

    broker.unregister(clientB)
    broker.broadcast("user:emma", { type: "test2" })

    expect(clientA.sent).toHaveLength(2)
    expect(clientB.sent).toHaveLength(1)
  })

  it("gestiona canales sin clientes sin lanzar excepciones", () => {
    const broker = new InMemoryWsBroker()
    expect(() => broker.broadcast("inexistente", { type: "ping" })).not.toThrow()
  })
})

describe("RedisPubSubWsBroker", () => {
  it("emite localmente de inmediato y publica en Redis para otras instancias", async () => {
    const publishedPayloads: string[] = []
    let messageHandler: ((channel: string, msg: string) => void) | null = null

    const mockPubClient: any = {
      publish: vi.fn(async (ch: string, data: string) => {
        publishedPayloads.push(data)
        return 1
      }),
      on: vi.fn(),
      disconnect: vi.fn(),
    }

    const mockSubClient: any = {
      subscribe: vi.fn((_ch: string, cb?: (err: null) => void) => cb?.(null)),
      on: vi.fn((event: string, handler: any) => {
        if (event === "message") messageHandler = handler
      }),
      unsubscribe: vi.fn(),
      disconnect: vi.fn(),
    }

    const broker = new RedisPubSubWsBroker({
      pubClient: mockPubClient,
      subClient: mockSubClient,
      instanceId: "inst-1",
    })

    const localClient = makeFakeClient()
    broker.register("user:emma", localClient)

    await broker.broadcast("user:emma", { type: "drawing-created" })

    // 1. Cliente local recibió el mensaje de inmediato
    expect(localClient.sent).toEqual([JSON.stringify({ type: "drawing-created" })])

    // 2. Se publicó en Redis con el envelope correcto
    expect(mockPubClient.publish).toHaveBeenCalledTimes(1)
    const envelope = JSON.parse(publishedPayloads[0])
    expect(envelope.senderId).toBe("inst-1")
    expect(envelope.targetChannel).toBe("user:emma")
    expect(envelope.data).toEqual({ type: "drawing-created" })

    // 3. Cuando llega un mensaje emitido por la misma instancia, no lo re-emite localmente (evita eco duplicado)
    expect(messageHandler).toBeTruthy()
    messageHandler!("anoty:ws:events", publishedPayloads[0])
    expect(localClient.sent).toHaveLength(1)

    // 4. Cuando llega un mensaje de otra instancia ("inst-2"), sí lo retransmite a sus clientes locales
    const foreignEnvelope = JSON.stringify({
      senderId: "inst-2",
      targetChannel: "user:emma",
      data: { type: "drawing-created", fromOtherNode: true },
    })
    messageHandler!("anoty:ws:events", foreignEnvelope)
    expect(localClient.sent).toHaveLength(2)
    expect(localClient.sent[1]).toBe(
      JSON.stringify({ type: "drawing-created", fromOtherNode: true }),
    )
  })

  it("createWsBroker devuelve InMemoryWsBroker si no hay REDIS_URL", () => {
    delete process.env.REDIS_URL
    const broker = createWsBroker()
    expect(broker).toBeInstanceOf(InMemoryWsBroker)
  })
})
