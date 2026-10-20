import type { Context, MiddlewareHandler } from "hono"
import { Redis } from "ioredis"

export interface RateLimiterOptions {
  windowMs?: number
  max?: number
  cooldownMs?: number
  keyGenerator?: (c: Context) => string | Promise<string>
  message?: string
  skip?: (c: Context) => boolean | Promise<boolean>
}

interface MemoryRecord {
  count: number
  resetAt: number
  lastHitAt: number
}

// Store en memoria con recolección periódica de basura para prevenir fugas de RAM
class MemoryStore {
  private readonly hits = new Map<string, MemoryRecord>()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000)
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  async increment(key: string, windowMs: number, cooldownMs: number): Promise<{
    current: number
    remaining: number
    resetAt: number
    isCooldownViolation: boolean
  }> {
    const now = Date.now()
    const record = this.hits.get(key)

    if (!record || now >= record.resetAt) {
      const resetAt = now + windowMs
      this.hits.set(key, { count: 1, resetAt, lastHitAt: now })
      return {
        current: 1,
        remaining: -1, // Se calculará con max
        resetAt,
        isCooldownViolation: false,
      }
    }

    const isCooldownViolation = cooldownMs > 0 && now - record.lastHitAt < cooldownMs
    if (isCooldownViolation) {
      return {
        current: record.count,
        remaining: 0,
        resetAt: record.resetAt,
        isCooldownViolation: true,
      }
    }

    record.count += 1
    record.lastHitAt = now
    return {
      current: record.count,
      remaining: -1,
      resetAt: record.resetAt,
      isCooldownViolation: false,
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, record] of this.hits.entries()) {
      if (now >= record.resetAt) {
        this.hits.delete(key)
      }
    }
  }

  clear() {
    this.hits.clear()
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Store distribuido opcional con Redis si REDIS_URL está presente
class RedisStore {
  private redis: Redis | null = null

  constructor(redisUrl: string) {
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        lazyConnect: true,
      })
      this.redis.connect().catch((err) => {
        console.warn("⚠️ [RateLimiter] Error conectando a Redis para Rate Limiter, usando memoria:", err.message)
        this.redis = null
      })
    } catch {
      this.redis = null
    }
  }

  isAvailable(): boolean {
    return this.redis !== null && this.redis.status === "ready"
  }

  async increment(key: string, windowMs: number, cooldownMs: number): Promise<{
    current: number
    remaining: number
    resetAt: number
    isCooldownViolation: boolean
  } | null> {
    if (!this.redis || this.redis.status !== "ready") return null

    const now = Date.now()
    const redisKey = `anoty:ratelimit:${key}`
    const cooldownKey = `anoty:ratelimit:cooldown:${key}`

    try {
      if (cooldownMs > 0) {
        const inCooldown = await this.redis.get(cooldownKey)
        if (inCooldown) {
          const ttl = await this.redis.pttl(redisKey)
          return {
            current: 9999,
            remaining: 0,
            resetAt: now + (ttl > 0 ? ttl : windowMs),
            isCooldownViolation: true,
          }
        }
      }

      const p = this.redis.pipeline()
      p.incr(redisKey)
      p.pttl(redisKey)
      if (cooldownMs > 0) {
        p.set(cooldownKey, "1", "PX", cooldownMs)
      }
      const results = await p.exec()
      if (!results) return null

      const [incrErr, current] = results[0] as [Error | null, number]
      const [ttlErr, ttl] = results[1] as [Error | null, number]

      if (incrErr || ttlErr) return null

      // Si la key es nueva o no tenía TTL, configurarla
      if (ttl < 0) {
        await this.redis.pexpire(redisKey, windowMs)
      }

      return {
        current: Number(current),
        remaining: -1,
        resetAt: now + (ttl > 0 ? ttl : windowMs),
        isCooldownViolation: false,
      }
    } catch {
      return null
    }
  }
}

export function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  const cfIp = c.req.header("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  const realIp = c.req.header("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}

export function createRateLimiter(options: RateLimiterOptions = {}): MiddlewareHandler {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 60
  const cooldownMs = options.cooldownMs ?? 0
  const defaultMessage = "Has realizado demasiadas peticiones. Por favor, espera unos momentos antes de intentar nuevamente."
  const message = options.message ?? defaultMessage

  const memoryStore = new MemoryStore()
  let redisStore: RedisStore | null = null

  const redisUrl = process.env.REDIS_URL
  if (redisUrl && (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://"))) {
    redisStore = new RedisStore(redisUrl)
  }

  return async (c, next) => {
    if (options.skip && (await options.skip(c))) {
      return next()
    }

    const key = options.keyGenerator
      ? await options.keyGenerator(c)
      : `${getClientIp(c)}:${c.req.path}`

    let result: {
      current: number
      remaining: number
      resetAt: number
      isCooldownViolation: boolean
    } | null = null

    if (redisStore?.isAvailable()) {
      result = await redisStore.increment(key, windowMs, cooldownMs)
    }

    if (!result) {
      result = await memoryStore.increment(key, windowMs, cooldownMs)
    }

    const now = Date.now()
    const remaining = Math.max(0, max - result.current)
    const resetSeconds = Math.max(1, Math.ceil((result.resetAt - now) / 1000))

    c.header("RateLimit-Limit", max.toString())
    c.header("RateLimit-Remaining", remaining.toString())
    c.header("RateLimit-Reset", resetSeconds.toString())

    if (result.isCooldownViolation) {
      c.header("Retry-After", "2")
      return c.json(
        {
          success: false,
          message: "Por favor espera un par de segundos antes de enviar otra petición.",
        },
        429,
      )
    }

    if (result.current > max) {
      c.header("Retry-After", resetSeconds.toString())
      return c.json(
        {
          success: false,
          message,
          retryAfter: resetSeconds,
        },
        429,
      )
    }

    return next()
  }
}
