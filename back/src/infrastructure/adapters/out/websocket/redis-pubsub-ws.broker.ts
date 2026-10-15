import { Redis, type RedisOptions } from "ioredis"
import { randomUUID } from "node:crypto"
import type {
  WsBrokerPort,
  RealtimeClient,
} from "../../../../core/application/ports/out/ws-broker.port.js"

export interface RedisWsBrokerOptions {
  redisUrl?: string
  redisOptions?: RedisOptions
  pubClient?: Redis
  subClient?: Redis
  pubSubChannel?: string
  instanceId?: string
}

interface RedisBroadcastEnvelope {
  senderId: string
  targetChannel: string
  data: object
}

export class RedisPubSubWsBroker implements WsBrokerPort {
  private readonly localRooms = new Map<string, Set<RealtimeClient>>()
  private readonly pubClient: Redis
  private readonly subClient: Redis
  private readonly pubSubChannel: string
  private readonly instanceId: string

  constructor(options: RedisWsBrokerOptions = {}) {
    const redisUrl = options.redisUrl ?? process.env.REDIS_URL
    this.pubSubChannel = options.pubSubChannel ?? "anoty:ws:events"
    this.instanceId = options.instanceId ?? randomUUID()

    const defaultOptions: RedisOptions = {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ [RedisWsBroker] Reintentos agotados al conectar con Redis.")
          return null
        }
        return Math.min(times * 500, 2000)
      },
      ...options.redisOptions,
    }

    if (options.pubClient && options.subClient) {
      this.pubClient = options.pubClient
      this.subClient = options.subClient
    } else if (redisUrl) {
      this.pubClient = new Redis(redisUrl, defaultOptions)
      this.subClient = new Redis(redisUrl, defaultOptions)
    } else {
      this.pubClient = new Redis(defaultOptions)
      this.subClient = new Redis(defaultOptions)
    }

    this.initSubscriber()
  }

  private initSubscriber() {
    this.subClient.subscribe(this.pubSubChannel, (err) => {
      if (err) {
        console.error("❌ [RedisWsBroker] Error al suscribirse al canal Pub/Sub:", err)
      } else {
        console.log(`📡 [RedisWsBroker] Suscrito a canal Pub/Sub: "${this.pubSubChannel}" (Instancia: ${this.instanceId.slice(0, 8)})`)
      }
    })

    this.subClient.on("message", (channel, rawMessage) => {
      if (channel !== this.pubSubChannel) return
      try {
        const envelope = JSON.parse(rawMessage) as RedisBroadcastEnvelope
        // Si el mensaje proviene de esta misma instancia, ya fue emitido localmente
        if (envelope.senderId === this.instanceId) return

        if (envelope.targetChannel && envelope.data) {
          this.broadcastLocally(envelope.targetChannel, envelope.data)
        }
      } catch (err) {
        console.error("❌ [RedisWsBroker] Error al parsear mensaje de Redis:", err)
      }
    })

    this.subClient?.on?.("error", (err: any) => {
      console.warn("⚠️ [RedisWsBroker] Advertencia en conexión de suscripción Redis:", err?.message)
    })
    this.pubClient?.on?.("error", (err: any) => {
      console.warn("⚠️ [RedisWsBroker] Advertencia en conexión de publicación Redis:", err?.message)
    })
  }

  register(channel: string, client: RealtimeClient): void {
    let set = this.localRooms.get(channel)
    if (!set) {
      set = new Set()
      this.localRooms.set(channel, set)
    }
    set.add(client)
  }

  unregister(client: RealtimeClient): void {
    for (const set of this.localRooms.values()) {
      set.delete(client)
    }
  }

  private broadcastLocally(targetChannel: string, message: object): void {
    const set = this.localRooms.get(targetChannel)
    if (!set) return
    const data = JSON.stringify(message)
    for (const client of set) {
      client.send(data)
    }
  }

  async broadcast(channel: string, message: object): Promise<void> {
    // 1. Emitir inmediatamente a clientes locales conectados en este servidor (latencia cero)
    this.broadcastLocally(channel, message)

    // 2. Retransmitir al resto de instancias del cluster vía Redis Pub/Sub
    const envelope: RedisBroadcastEnvelope = {
      senderId: this.instanceId,
      targetChannel: channel,
      data: message,
    }

    try {
      await this.pubClient.publish(this.pubSubChannel, JSON.stringify(envelope))
    } catch (err) {
      console.error("❌ [RedisWsBroker] Error al publicar evento en Redis:", err)
    }
  }

  async close(): Promise<void> {
    try {
      await this.subClient.unsubscribe(this.pubSubChannel)
      this.subClient.disconnect()
      this.pubClient.disconnect()
    } catch {
      // Ignorar al cerrar
    }
  }
}
