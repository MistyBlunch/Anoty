import type { WsBrokerPort } from "../../../../core/application/ports/out/ws-broker.port.js"
import { InMemoryWsBroker } from "./in-memory-ws.broker.js"
import { RedisPubSubWsBroker, type RedisWsBrokerOptions } from "./redis-pubsub-ws.broker.js"

export * from "./in-memory-ws.broker.js"
export * from "./redis-pubsub-ws.broker.js"

export function createWsBroker(options: RedisWsBrokerOptions = {}): WsBrokerPort {
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL

  if (redisUrl) {
    console.log("⚡ [WebSocket] REDIS_URL detectada. Inicializando broker escalable Redis Pub/Sub...")
    return new RedisPubSubWsBroker(options)
  }

  console.log("ℹ️ [WebSocket] Sin REDIS_URL configurada. Usando broker en memoria (InMemoryWsBroker).")
  return new InMemoryWsBroker()
}

export const defaultWsBroker = createWsBroker()
