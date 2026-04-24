/**
 * @fileoverview Circuit Breaker Middleware for Photon
 *
 * 實作三態熔斷器（CLOSED/OPEN/HALF_OPEN）中間件，
 * 防止對下游服務的連鎖故障傳播。
 *
 * 內部使用 @gravito/resilience CircuitBreaker，保持公開 API 不變。
 *
 * 狀態轉換：
 * - CLOSED → OPEN：失敗次數超過閾值
 * - OPEN → HALF_OPEN：超時後允許探測請求
 * - HALF_OPEN → CLOSED：探測請求成功
 * - HALF_OPEN → OPEN：探測請求失敗
 *
 * @module @gravito/photon/middleware/circuit-breaker
 * @since 1.0.0
 */

import { CircuitBreaker as ResilienceCB } from '@gravito/resilience'
import type { GravitoContext, GravitoMiddleware } from '@gravito/core'

// Type alias for convenience
type Context = GravitoContext

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 熔斷器三態狀態
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  /**
   * 觸發熔斷的連續失敗次數閾值
   * @default 5
   */
  failureThreshold: number

  /**
   * 熔斷器從 OPEN 進入 HALF_OPEN 狀態前的等待時間（毫秒）
   * @default 30000 (30 秒)
   */
  resetTimeoutMs: number

  /**
   * HALF_OPEN 狀態下允許通過的最大請求數（探測請求）
   * @default 1
   */
  halfOpenMaxRequests?: number

  /**
   * 判斷請求是否失敗的函數
   * @default (res) => res.status >= 500
   */
  isFailure?: (response: Response) => boolean | Promise<boolean>

  /**
   * 熔斷器開路時的自定義處理器
   * @default (c) => c.json({ error: 'Service Unavailable', ... }, 503)
   */
  onOpen?: (c: Context, state: CircuitBreakerState) => Response | Promise<Response>

  /**
   * 熔斷器名稱（用於識別多個熔斷器實例）
   * @default 'default'
   */
  name?: string

  /**
   * 成功請求數閾值（HALF_OPEN 狀態下，達此數量後轉為 CLOSED）
   * @default 1
   */
  successThreshold?: number
}

export interface CircuitBreakerState {
  /** 當前熔斷器狀態 */
  state: CircuitState
  /** 連續失敗次數 */
  failureCount: number
  /** 連續成功次數（用於 HALF_OPEN 狀態） */
  successCount: number
  /** 最後一次失敗的時間戳（毫秒） */
  lastFailureTime: number
  /** HALF_OPEN 狀態下當前進行中的請求數 */
  halfOpenRequests: number
  /** 熔斷器名稱 */
  name: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 預設判斷失敗的函數：HTTP 5xx 狀態碼視為失敗
 */
const defaultIsFailure = (response: Response): boolean => response.status >= 500

/**
 * 預設熔斷器開路處理器（含 Retry-After header per D-08）
 */
const defaultOnOpen = (c: Context, state: CircuitBreakerState, resetTimeoutMs: number): Response => {
  const res = c.json(
    {
      error: 'Service Unavailable',
      message: 'Circuit breaker is open. Service temporarily unavailable.',
      circuitBreaker: {
        name: state.name,
        state: state.state,
        failureCount: state.failureCount,
      },
    },
    503
  )
  res.headers.set('Retry-After', String(Math.ceil(resetTimeoutMs / 1000)))
  return res
}

/**
 * 建立 Circuit Breaker 中間件
 *
 * 內部使用 @gravito/resilience CircuitBreaker，公開 API 與舊版相同（D-07）。
 * 503 回應包含 Retry-After header（D-08）。
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { circuitBreaker } from '@gravito/photon/middleware/circuit-breaker'
 *
 * const app = new Photon()
 *
 * // 基本用法
 * app.use('/api/*', circuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 * }))
 *
 * // 使用預設配置
 * import { circuitBreakerPresets } from '@gravito/photon/middleware/circuit-breaker'
 * app.use('/payment/*', circuitBreakerPresets.sensitive())
 * ```
 */
export function circuitBreaker(config: CircuitBreakerConfig): GravitoMiddleware {
  const {
    isFailure = defaultIsFailure,
    onOpen,
    name = 'default',
    failureThreshold,
    resetTimeoutMs,
    successThreshold,
    halfOpenMaxRequests,
  } = config

  // Map photon's resetTimeoutMs -> resilience's resetTimeout (Pitfall 1)
  // ResilienceCB constructor: (name: string, options?: CircuitBreakerOptions)
  const breaker = new ResilienceCB(name, {
    failureThreshold,
    resetTimeout: resetTimeoutMs,
    successThreshold: successThreshold ?? 1,
    halfOpenRequests: halfOpenMaxRequests ?? 1,
  })

  /**
   * Build photon CircuitBreakerState from resilience CB metrics
   */
  function getPhotonState(): CircuitBreakerState {
    const metrics = breaker.getMetrics()
    const stateStr = breaker.getState() as unknown as string
    return {
      state: stateStr as CircuitState,
      failureCount: metrics.failures,
      successCount: metrics.successes,
      lastFailureTime: metrics.lastFailureAt ? metrics.lastFailureAt.getTime() : 0,
      halfOpenRequests: 0,
      name,
    }
  }

  const middleware: GravitoMiddleware = async (c, next) => {
    try {
      await breaker.execute(async () => {
        await next()

        // Check if response is considered a failure
        const response = c.res
        if (response && (await isFailure(response.clone()))) {
          throw new Error('Response indicates failure')
        }
      })
    } catch (error) {
      // If the circuit is open, return 503 with Retry-After
      if (breaker.isOpen()) {
        const photonState = getPhotonState()
        if (onOpen) {
          const response = await onOpen(c, photonState)
          // Add Retry-After if not already present (per D-08)
          if (!response.headers.has('Retry-After')) {
            response.headers.set('Retry-After', String(Math.ceil(resetTimeoutMs / 1000)))
          }
          return response
        }
        return defaultOnOpen(c, photonState, resetTimeoutMs)
      }
      // Re-throw non-circuit-open errors
      throw error
    }
  }

  return middleware
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit Breaker 預設配置集合
 */
export const circuitBreakerPresets = {
  /**
   * 敏感型：低閾值，適用於金融、支付等關鍵服務
   * - 失敗閾值：3 次
   * - 重置超時：60 秒
   * - 半開探測：1 個請求
   */
  sensitive: (overrides?: Partial<CircuitBreakerConfig>): GravitoMiddleware =>
    circuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      halfOpenMaxRequests: 1,
      successThreshold: 1,
      name: 'sensitive',
      ...overrides,
    }),

  /**
   * 標準型：中等閾值，適用於一般 API 服務
   * - 失敗閾值：5 次
   * - 重置超時：30 秒
   * - 半開探測：2 個請求
   */
  standard: (overrides?: Partial<CircuitBreakerConfig>): GravitoMiddleware =>
    circuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxRequests: 2,
      successThreshold: 1,
      name: 'standard',
      ...overrides,
    }),

  /**
   * 韌性型：高閾值，適用於非關鍵服務或容錯要求高的場景
   * - 失敗閾值：10 次
   * - 重置超時：10 秒
   * - 半開探測：3 個請求
   */
  resilient: (overrides?: Partial<CircuitBreakerConfig>): GravitoMiddleware =>
    circuitBreaker({
      failureThreshold: 10,
      resetTimeoutMs: 10000,
      halfOpenMaxRequests: 3,
      successThreshold: 2,
      name: 'resilient',
      ...overrides,
    }),
}
