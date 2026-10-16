import type { WsBrokerPort } from "../../../../core/application/ports/out/ws-broker.port.js"
import { InMemoryWsBroker } from "./in-memory-ws.broker.js"
import { RedisPubSubWsBroker, type RedisWsBrokerOptions } from "./redis-pubsub-ws.broker.js"

export * from "./in-memory-ws.broker.js"
export * from "./redis-pubsub-ws.broker.js"

export function createWsBroker(options: RedisWsBrokerOptions = {}): WsBrokerPort {
  const rawUrl = options.redisUrl ?? process.env.REDIS_URL
  if (!rawUrl) {
    console.log("ℹ️ [WebSocket] Sin REDIS_URL configurada. Usando broker en memoria (InMemoryWsBroker).")
    return new InMemoryWsBroker()
  }

  let redisUrl = rawUrl.trim().replace(/^["']|["']$/g, "")

  // Si el usuario pegó el comando completo de redis-cli (ej: redis-cli --tls -u redis://...)
  const hasTlsFlag = redisUrl.includes("--tls")
  const cliMatch = redisUrl.match(/redis(?:s)?:\/\/[^\s'"]+/)
  if (cliMatch) {
    redisUrl = cliMatch[0]
  }

  // Upstash en el puerto 6379 o con flag --tls requiere TLS (rediss://)
  if (redisUrl.startsWith("redis://") && (hasTlsFlag || redisUrl.includes("upstash.io"))) {
    redisUrl = redisUrl.replace(/^redis:\/\//, "rediss://")
  }

  if (redisUrl.startsWith("http://") || redisUrl.startsWith("https://")) {
    console.warn(
      "⚠️ [WebSocket] REDIS_URL tiene protocolo http/https (Upstash REST API). Para WebSockets con ioredis se requiere el protocolo rediss:// (ej. rediss://default:token@host.upstash.io:6379). Usando InMemoryWsBroker como fallback seguro."
    )
    return new InMemoryWsBroker()
  }

  try {
    console.log("⚡ [WebSocket] REDIS_URL detectada. Inicializando broker escalable Redis Pub/Sub...")
    return new RedisPubSubWsBroker({ ...options, redisUrl })
  } catch (err: any) {
    console.error(
      `❌ [WebSocket] Error al instanciar RedisPubSubWsBroker: ${err?.message}. Usando InMemoryWsBroker como fallback seguro.`
    )
    return new InMemoryWsBroker()
  }
}

export const defaultWsBroker = createWsBroker()

