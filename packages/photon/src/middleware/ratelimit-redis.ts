import type { RateLimitState, RateLimitStore } from './ratelimit'

/**
 * Interface for Redis client compatibility.
 * Supports both ioredis and node-redis style clients.
 */
interface RedisLikeClient {
  /**
   * Execute Lua script (ioredis and node-redis compatible)
   */
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown[]>

  /**
   * Delete key(s)
   */
  del(key: string): Promise<number>

  /**
   * Get string value
   */
  get(key: string): Promise<string | null>

  /**
   * Get TTL in milliseconds
   */
  pttl(key: string): Promise<number>

  /**
   * Pipeline support (optional, for optimization)
   */
  pipeline?(): {
    get(key: string): RedisPipeline
    pttl(key: string): RedisPipeline
    exec(): Promise<[Error | null, unknown][]>
  }
}

interface RedisPipeline {
  get(key: string): RedisPipeline
  pttl(key: string): RedisPipeline
  exec(): Promise<[Error | null, unknown][]>
}

type EvalRateLimitResult = [number | string, number | string]

function isEvalRateLimitResult(value: unknown): value is EvalRateLimitResult {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    (typeof value[0] === 'number' || typeof value[0] === 'string') &&
    (typeof value[1] === 'number' || typeof value[1] === 'string')
  )
}

/**
 * Redis-based storage for Rate Limiting.
 *
 * Implements atomic rate limiting using Lua scripts to prevent race conditions
 * in distributed environments.
 *
 * @remarks
 * This store is recommended for production environments with multiple application
 * instances. It requires a Redis client (like ioredis or node-redis).
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { rateLimit } from '@gravito/photon/middleware'
 * import { RedisStore } from '@gravito/photon/middleware/ratelimit-redis'
 *
 * const redis = new Redis()
 * const app = new Photon()
 *
 * app.use(rateLimit({
 *   maxRequests: 100,
 *   windowMs: 60000,
 *   store: new RedisStore(redis, { maxRequests: 100, windowMs: 60000 })
 * }))
 * ```
 * @public
 */
export class RedisStore implements RateLimitStore {
  /**
   * Create a new RedisStore.
   *
   * @param client - Redis client instance (must support .eval(), compatible with ioredis or node-redis)
   * @param config - Rate limit configuration
   * @throws {Error} If client does not support required Redis operations
   */
  constructor(
    private client: RedisLikeClient,
    private config: {
      maxRequests: number
      windowMs: number
      prefix?: string
    }
  ) {
    // Validate client has required methods
    if (typeof client.eval !== 'function') {
      throw new Error('Redis client must support eval() method')
    }
    if (typeof client.del !== 'function' || typeof client.get !== 'function') {
      throw new Error('Redis client must support del() and get() methods')
    }
  }

  private get prefix(): string {
    return this.config.prefix ?? 'rl:'
  }

  /**
   * Atomic increment and TTL management using Lua.
   */
  async increment(key: string): Promise<RateLimitState> {
    const fullKey = this.prefix + key
    const luaScript = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('PEXPIRE', KEYS[1], ARGV[1])
      end
      return {current, redis.call('PTTL', KEYS[1])}
    `

    // Support both ioredis and node-redis style eval
    const result = await this.client.eval(luaScript, 1, fullKey, this.config.windowMs)
    if (!isEvalRateLimitResult(result)) {
      throw new Error('Redis client eval() returned an unexpected result')
    }

    // result is [count, ttl]
    const count = Number(result[0])
    const ttl = Number(result[1])

    return {
      count,
      resetTime: Date.now() + (ttl > 0 ? ttl : this.config.windowMs),
      remaining: Math.max(0, this.config.maxRequests - count),
    }
  }

  async reset(key: string): Promise<void> {
    const fullKey = this.prefix + key
    await this.client.del(fullKey)
  }

  async get(key: string): Promise<RateLimitState | null> {
    const fullKey = this.prefix + key

    // We need both value and TTL
    // If not using pipeline, this might be 2 roundtrips.
    let countRaw: string | null
    let ttl: number

    if (typeof this.client.pipeline === 'function') {
      const pipeline = this.client.pipeline()
      const results = await pipeline.get(fullKey).pttl(fullKey).exec()
      countRaw = results[0][1] as string | null
      ttl = results[1][1] as number
    } else {
      countRaw = await this.client.get(fullKey)
      ttl = await this.client.pttl(fullKey)
    }

    if (countRaw === null || ttl <= 0) {
      return null
    }

    const count = Number(countRaw)
    return {
      count,
      resetTime: Date.now() + ttl,
      remaining: Math.max(0, this.config.maxRequests - count),
    }
  }
}
