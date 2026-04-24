/**
 * @fileoverview Throttle Requests Middleware for Photon
 *
 * Rate limiting middleware migrated from @gravito/core.
 * API 重構：類別基底（需 PlanetCore 注入）→ 函數基底（配置注入）
 *
 * 原始設計使用 `new ThrottleRequests(core).handle(max, decay)` 模式，
 * 需要 PlanetCore 容器提供 logger 和 config。
 * 新設計使用 `throttleRequests(options)` 函數模式，
 * 透過選項物件直接注入配置，不依賴 IoC 容器。
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type { GravitoMiddleware } from '@gravito/core'

type RateLimiterLike = {
  attempt: (
    key: string,
    maxAttempts: number,
    decaySeconds: number
  ) => Promise<{ allowed: boolean; remaining: number; reset: number }>
}

type CacheLike = {
  limiter: () => RateLimiterLike
}

/**
 * Options for throttle requests middleware
 * @public
 */
export type ThrottleRequestsOptions = {
  /** Max requests allowed in the time window. @default 60 */
  maxAttempts?: number
  /** Time window in seconds. @default 60 */
  decaySeconds?: number
  /** Whether to trust X-Forwarded-For header for IP. @default false */
  trustProxy?: boolean
  /**
   * Custom logger warning callback.
   * Called when cache service is not available.
   * @default console.warn
   */
  onMissingCache?: (message: string) => void
}

/**
 * Rate limiting middleware using Orbit Cache context variable.
 * Requires a CacheService to be bound to `c.get('cache')` by an upstream middleware.
 *
 * @example
 * ```typescript
 * // 基本用法
 * app.use('*', throttleRequests())
 *
 * // 自訂配置
 * app.use('/api/*', throttleRequests({
 *   maxAttempts: 100,
 *   decaySeconds: 60,
 *   trustProxy: true,
 * }))
 * ```
 * @public
 */
export function throttleRequests(options: ThrottleRequestsOptions = {}): GravitoMiddleware {
  const maxAttempts = options.maxAttempts ?? 60
  const decaySeconds = options.decaySeconds ?? 60
  const trustProxy = options.trustProxy ?? false
  const onMissingCache = options.onMissingCache ?? ((msg: string) => console.warn(msg))

  // keyCache：WeakMap 以 Request 為鍵，避免重複解析相同請求的 IP
  const keyCache = new WeakMap<Request, string>()

  const middleware: GravitoMiddleware = async (c, next) => {
    const cache = c.get('cache') as CacheLike | undefined
    if (!cache) {
      // 若 cache 服務不可用，略過限速並記錄警告
      onMissingCache('RateLimiter: OrbitCache not found. Skipping rate limiting.')
      await next()
      return
    }

    // 解析客戶端 IP（利用 WeakMap 快取避免重複計算）
    const raw = c.req.raw
    let key = raw && typeof raw === 'object' ? keyCache.get(raw) : undefined

    if (!key) {
      let ip = '127.0.0.1'

      // Determine IP based on trustProxy setting
      if (trustProxy) {
        // When trustProxy is true, prefer x-forwarded-for (first IP in chain)
        const forwardedFor = c.req.header('x-forwarded-for') || ''
        const forwardedIp = forwardedFor.split(',')[0]?.trim()
        ip = forwardedIp || '127.0.0.1'
      } else {
        // When trustProxy is false, use x-real-ip only if available, or fall back to localhost
        // Note: In a real app behind a proxy, you'd need better IP extraction from request socket
        const realIp = c.req.header('x-real-ip')
        ip = realIp || '127.0.0.1'
      }

      key = `throttle:${ip}:${c.req.path}`

      if (raw && typeof raw === 'object') {
        keyCache.set(raw, key)
      }
    }

    const limiter = cache.limiter()
    const result = await limiter.attempt(key, maxAttempts, decaySeconds)

    // 設定速率限制 headers
    c.header('X-RateLimit-Limit', String(maxAttempts))
    c.header('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))

    if (result.reset) {
      c.header('X-RateLimit-Reset', String(result.reset))
    }

    if (!result.allowed) {
      c.header('Retry-After', String(decaySeconds))
      return c.text('Too Many Requests', 429)
    }

    await next()
  }

  return middleware
}
