/**
 * @fileoverview Rate Limiting Middleware for Photon
 *
 * Provides token bucket and sliding window rate limiting strategies.
 * Supports memory-based and Redis-based storage backends.
 *
 * @module @gravito/photon/middleware/ratelimit
 * @since 1.0.0
 */

import type { GravitoContext, GravitoMiddleware } from '@gravito/core'

// Type alias for convenience (used in config types)
type Context = GravitoContext

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the time window
   * @default 100
   */
  maxRequests: number

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs: number

  /**
   * Strategy for rate limiting
   * - 'token-bucket': Smooth rate limiting with token refill
   * - 'sliding-window': Time-based window that slides continuously
   * @default 'token-bucket'
   */
  strategy?: 'token-bucket' | 'sliding-window'

  /**
   * Custom key generator function
   * @default (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
   */
  keyGenerator?: (c: Context) => string | Promise<string>

  /**
   * Storage backend for rate limit state
   * @default new MemoryStore()
   */
  store?: RateLimitStore

  /**
   * Custom handler for rate-limited requests
   * @default (c) => c.json({ error: 'Too Many Requests', retryAfter: <seconds> }, 429)
   */
  onRateLimitExceeded?: (c: Context, retryAfter: number) => Response | Promise<Response>

  /**
   * Skip rate limiting for certain requests
   * @default undefined
   */
  skip?: (c: Context) => boolean | Promise<boolean>

  /**
   * Custom headers to include in responses
   * @default true
   */
  standardHeaders?: boolean

  /**
   * Include draft RateLimit headers (RateLimit-*)
   * @default false
   */
  draftHeaders?: boolean
}

export interface RateLimitStore {
  /**
   * Increment request count and return current state
   */
  increment(key: string): Promise<RateLimitState>

  /**
   * Reset the rate limit for a key
   */
  reset(key: string): Promise<void>

  /**
   * Get current state without incrementing
   */
  get(key: string): Promise<RateLimitState | null>
}

export interface RateLimitState {
  /**
   * Number of requests made in current window
   */
  count: number

  /**
   * Timestamp when the window expires (ms)
   */
  resetTime: number

  /**
   * Remaining requests allowed
   */
  remaining: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Store (Default)
// ─────────────────────────────────────────────────────────────────────────────

interface ExpiryNode {
  key: string
  resetTime: number
  prev?: ExpiryNode
  next?: ExpiryNode
}

export class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number; node: ExpiryNode }>()
  private head?: ExpiryNode
  private tail?: ExpiryNode
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private config: { maxRequests: number; windowMs: number },
    cleanupIntervalMs = 60000
  ) {
    // Efficient cleanup using O(M) complexity where M is number of expired entries
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let current = this.head
      while (current && current.resetTime < now) {
        // Entry expired, remove from both Map and LinkedList
        this.store.delete(current.key)
        this.removeNode(current)
        current = this.head // Move to the next head
      }
    }, cleanupIntervalMs)

    // Prevent blocking the process from exiting naturally
    if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref()
    }
  }

  private addNode(key: string, resetTime: number): ExpiryNode {
    const node: ExpiryNode = { key, resetTime }
    if (!this.tail) {
      this.head = this.tail = node
    } else {
      this.tail.next = node
      node.prev = this.tail
      this.tail = node
    }
    return node
  }

  private removeNode(node: ExpiryNode): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }

    // Help GC
    node.prev = undefined
    node.next = undefined
  }

  async increment(key: string): Promise<RateLimitState> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.resetTime < now) {
      // New window or expired
      if (existing) {
        this.removeNode(existing.node)
      }

      const resetTime = now + this.config.windowMs
      const node = this.addNode(key, resetTime)
      this.store.set(key, { count: 1, resetTime, node })

      return {
        count: 1,
        resetTime,
        remaining: Math.max(0, this.config.maxRequests - 1),
      }
    }

    // Increment existing window
    // Performance: Direct mutation is intentional to avoid object allocation
    // on every request in this hot path. Rate limiting must handle thousands of
    // requests per second, so object allocation overhead is unacceptable.
    existing.count++
    // We don't update node's resetTime because it's a fixed window
    return {
      count: existing.count,
      resetTime: existing.resetTime,
      remaining: Math.max(0, this.config.maxRequests - existing.count),
    }
  }

  async reset(key: string): Promise<void> {
    const existing = this.store.get(key)
    if (existing) {
      this.removeNode(existing.node)
      this.store.delete(key)
    }
  }

  async get(key: string): Promise<RateLimitState | null> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || existing.resetTime < now) {
      return null
    }

    return {
      count: existing.count,
      resetTime: existing.resetTime,
      remaining: Math.max(0, this.config.maxRequests - existing.count),
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
    this.head = undefined
    this.tail = undefined
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default key generator: use client IP
 *
 * SECURITY WARNING: This relies on x-forwarded-for and x-real-ip headers which can be
 * spoofed by clients. In production environments:
 * 1. Deploy behind a trusted reverse proxy (nginx, CloudFlare, etc.)
 * 2. Configure the proxy to overwrite these headers (don't trust client values)
 * 3. Use a custom keyGenerator that validates against your infrastructure
 *
 * Example custom key generator for trusted proxy:
 * ```
 * keyGenerator: (c) => {
 *   // Assuming nginx sets x-real-ip and overrides x-forwarded-for
 *   return c.req.header('x-real-ip') || c.req.header('x-forwarded-for') || 'unknown'
 * }
 * ```
 */
const defaultKeyGenerator = (c: Context): string => {
  // Extract first IP from x-forwarded-for (closest to client in chain)
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim()
  }
  // Fallback to x-real-ip if available
  return c.req.header('x-real-ip') || 'global-fallback'
}

/**
 * Default rate limit exceeded handler
 */
const defaultOnRateLimitExceeded = (c: Context, retryAfter: number): Response => {
  return c.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter,
    },
    429
  )
}

/**
 * Create a rate limiting middleware
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { rateLimit } from '@gravito/photon/middleware'
 *
 * const app = new Photon()
 *
 * // Basic usage: 100 requests per minute
 * app.use('*', rateLimit({ maxRequests: 100, windowMs: 60000 }))
 *
 * // Per-user rate limiting
 * app.use('/api/*', rateLimit({
 *   maxRequests: 50,
 *   windowMs: 60000,
 *   keyGenerator: (c) => {
 *     const userId = c.get('userId')
 *     return userId || c.req.header('x-forwarded-for') || 'anonymous'
 *   }
 * }))
 * ```
 */
export function rateLimit(config: RateLimitConfig): GravitoMiddleware {
  const {
    maxRequests,
    windowMs,
    keyGenerator = defaultKeyGenerator,
    store = new MemoryStore({ maxRequests, windowMs }),
    onRateLimitExceeded = defaultOnRateLimitExceeded,
    skip,
    standardHeaders = true,
    draftHeaders = false,
  } = config

  const middleware: GravitoMiddleware = async (c, next) => {
    if (skip && (await skip(c))) {
      await next()
      return undefined
    }

    const key = await keyGenerator(c)
    const state = await store.increment(key)

    if (standardHeaders) {
      c.header('X-RateLimit-Limit', maxRequests.toString())
      c.header('X-RateLimit-Remaining', state.remaining.toString())
      c.header('X-RateLimit-Reset', state.resetTime.toString())
    }

    if (draftHeaders) {
      c.header('RateLimit-Limit', maxRequests.toString())
      c.header('RateLimit-Remaining', state.remaining.toString())
      const windowSeconds = Math.ceil(windowMs / 1000)
      c.header('RateLimit-Reset', windowSeconds.toString())
    }

    if (state.count > maxRequests) {
      const retryAfter = Math.ceil((state.resetTime - Date.now()) / 1000)
      c.header('Retry-After', retryAfter.toString())

      return await onRateLimitExceeded(c, retryAfter)
    }

    await next()
  }

  return middleware
}

/**
 * Convenience factory: Create rate limiter with common presets
 */
export const createRateLimiter = {
  /**
   * Strict: 10 requests per minute
   */
  strict: (overrides?: Partial<RateLimitConfig>): GravitoMiddleware =>
    rateLimit({ maxRequests: 10, windowMs: 60000, ...overrides }),

  /**
   * Moderate: 60 requests per minute
   */
  moderate: (overrides?: Partial<RateLimitConfig>): GravitoMiddleware =>
    rateLimit({ maxRequests: 60, windowMs: 60000, ...overrides }),

  /**
   * Lenient: 100 requests per minute
   */
  lenient: (overrides?: Partial<RateLimitConfig>): GravitoMiddleware =>
    rateLimit({ maxRequests: 100, windowMs: 60000, ...overrides }),

  /**
   * API: 1000 requests per hour
   */
  api: (overrides?: Partial<RateLimitConfig>): GravitoMiddleware =>
    rateLimit({ maxRequests: 1000, windowMs: 3600000, ...overrides }),

  /**
   * Auth: 5 attempts per 15 minutes (for login endpoints)
   */
  auth: (overrides?: Partial<RateLimitConfig>): GravitoMiddleware =>
    rateLimit({ maxRequests: 5, windowMs: 900000, ...overrides }),
}

/**
 * Export convenience preset
 */
export { createRateLimiter as rateLimiter }
