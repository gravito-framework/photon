/**
 * @fileoverview OpenTelemetry 整合中間件
 *
 * 提供可選的 OpenTelemetry 追蹤整合。
 * 當 @opentelemetry/api 未安裝時，自動降級為 no-op 模式。
 *
 * @module @gravito/photon/middleware/otel
 * @since 1.0.0
 */

import type { GravitoContext, GravitoMiddleware } from '@gravito/core'

// Type alias for convenience
type Context = GravitoContext

// ─────────────────────────────────────────────────────────────────────────────
// OpenTelemetry API 類型定義（避免硬依賴）
// ─────────────────────────────────────────────────────────────────────────────

interface OtelSpan {
  setAttribute(key: string, value: string | number | boolean): this
  setStatus(status: { code: number; message?: string }): this
  end(): void
  spanContext(): { traceId: string; spanId: string }
}

interface OtelTracer {
  startSpan(name: string, options?: Record<string, unknown>): OtelSpan
}

interface OtelApi {
  trace: {
    getTracer(name: string, version?: string): OtelTracer
  }
  SpanStatusCode: {
    OK: number
    ERROR: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 配置介面
// ─────────────────────────────────────────────────────────────────────────────

export interface OtelMiddlewareConfig {
  /**
   * 服務名稱（用於 span 的 service.name 屬性）
   * @default 'photon'
   */
  serviceName?: string

  /**
   * 服務版本
   * @default '1.0.0'
   */
  serviceVersion?: string

  /**
   * 排除追蹤的路徑列表（支援前綴比對）
   * @example ['/health', '/metrics']
   * @default []
   */
  excludePaths?: string[]

  /**
   * 自定義 span 名稱生成器
   * @default (c) => `${c.req.method} ${c.req.routePath || c.req.path}`
   */
  spanNameResolver?: (c: Context) => string

  /**
   * 是否在 response header 中傳播 trace id
   * @default true
   */
  propagateTraceId?: boolean

  /**
   * 傳播 trace id 的 header 名稱
   * @default 'X-Trace-Id'
   */
  traceIdHeader?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// No-op 實作（@opentelemetry/api 未安裝時的降級）
// ─────────────────────────────────────────────────────────────────────────────

const noopSpan: OtelSpan = {
  setAttribute: () => noopSpan,
  setStatus: () => noopSpan,
  end: () => {
    /* no-op */
  },
  spanContext: () => ({ traceId: '', spanId: '' }),
}

const noopTracer: OtelTracer = {
  startSpan: () => noopSpan,
}

const noopApi: OtelApi = {
  trace: {
    getTracer: () => noopTracer,
  },
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 動態載入 @opentelemetry/api（避免硬依賴）
// ─────────────────────────────────────────────────────────────────────────────

let otelApiPromise: Promise<OtelApi> | null = null

/**
 * 嘗試動態載入 @opentelemetry/api
 * 若未安裝則返回 no-op 實作
 */
function getOtelApi(): Promise<OtelApi> {
  if (!otelApiPromise) {
    otelApiPromise = import('@opentelemetry/api')
      .then((mod) => mod as unknown as OtelApi)
      .catch(() => noopApi)
  }
  return otelApiPromise
}

// ─────────────────────────────────────────────────────────────────────────────
// 輔助函數
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 判斷請求路徑是否應排除追蹤
 */
function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excluded) => path === excluded || path.startsWith(`${excluded}/`))
}

/**
 * 判斷 trace id 是否有效（非空且非全零）
 */
function isValidTraceId(traceId: string | undefined): boolean {
  return !!traceId && traceId !== '' && traceId !== '00000000000000000000000000000000'
}

/**
 * 從 HTTP 狀態碼判斷 span 狀態
 */
function getSpanStatusCode(
  statusCode: number,
  otelApi: OtelApi
): { code: number; message?: string } {
  if (statusCode >= 400) {
    return {
      code: otelApi.SpanStatusCode.ERROR,
      message: `HTTP ${statusCode}`,
    }
  }
  return { code: otelApi.SpanStatusCode.OK }
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenTelemetry 中間件
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 建立 OpenTelemetry 追蹤中間件
 *
 * 當 @opentelemetry/api 未安裝時，自動降級為 no-op 模式，不影響應用運行。
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { otelMiddleware } from '@gravito/photon/middleware/otel'
 *
 * const app = new Photon()
 *
 * // 基本使用
 * app.use('*', otelMiddleware())
 *
 * // 自定義配置
 * app.use('*', otelMiddleware({
 *   serviceName: 'my-api',
 *   excludePaths: ['/health', '/metrics'],
 *   propagateTraceId: true,
 * }))
 * ```
 */
export function otelMiddleware(config: OtelMiddlewareConfig = {}): GravitoMiddleware {
  const {
    serviceName = 'photon',
    serviceVersion = '1.0.0',
    excludePaths = [],
    spanNameResolver,
    propagateTraceId = true,
    traceIdHeader = 'X-Trace-Id',
  } = config

  const initPromise = getOtelApi().then((api) => ({
    api,
    tracer: api.trace.getTracer(serviceName, serviceVersion),
  }))

  const middleware: GravitoMiddleware = async (c, next) => {
    const { api: otelApi, tracer } = await initPromise
    const path = new URL(c.req.url).pathname

    // 排除特定路徑
    if (shouldExcludePath(path, excludePaths)) {
      return await next()
    }

    // 解析 span 名稱
    const spanName = spanNameResolver
      ? spanNameResolver(c)
      : `${c.req.method} ${c.req.routePath || path}`

    // 建立 span
    const span = tracer.startSpan(spanName)

    // 設定 HTTP 請求屬性
    span.setAttribute('http.method', c.req.method)
    span.setAttribute('http.url', c.req.url)
    span.setAttribute('http.target', path)

    const userAgent = c.req.header('user-agent')
    if (userAgent) {
      span.setAttribute('http.user_agent', userAgent)
    }

    // 傳播 trace id header（請求前）
    const { traceId, spanId } = span.spanContext()
    if (propagateTraceId && isValidTraceId(traceId)) {
      c.header(traceIdHeader, traceId)
    }

    try {
      const res = await next()

      // 設定 HTTP 回應屬性
      if (c.res) {
        const statusCode = c.res.status
        span.setAttribute('http.status_code', statusCode)
        span.setStatus(getSpanStatusCode(statusCode, otelApi))
      }

      // 確保 trace id 在回應 header 中
      if (propagateTraceId && isValidTraceId(traceId)) {
        c.header(traceIdHeader, traceId)
      }

      if (spanId) {
        c.header('X-Span-Id', spanId)
      }

      return res
    } catch (error) {
      // 設定錯誤狀態
      span.setStatus({
        code: otelApi.SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.setAttribute('error', true)
      throw error
    } finally {
      span.end()
    }
  }

  return middleware
}
