/**
 * @fileoverview Security Middleware for Photon
 *
 * 集合了從 @gravito/core 遷移過來的 HTTP 安全中間件：
 * - cors: Cross-Origin Resource Sharing (CORS)
 * - csrfProtection: CSRF 防護
 * - securityHeaders: 安全 headers（Helmet-style）
 * - bodySizeLimit: 請求 body 大小限制
 * - requireHeaderToken / createHeaderGate: Header token 認證
 * - throttleRequests: 速率限制（函數基底）
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 *
 * @example
 * ```typescript
 * import { cors, securityHeaders, throttleRequests } from '@gravito/photon/middleware/security'
 *
 * app.use('*', cors({ origin: 'https://example.com' }))
 * app.use('*', securityHeaders())
 * app.use('/api/*', throttleRequests({ maxAttempts: 100, decaySeconds: 60 }))
 * ```
 */

export type { BodySizeLimitOptions } from './body-size-limit'
export { bodySizeLimit } from './body-size-limit'
export type { CorsOptions, CorsOrigin } from './cors'
export { cors } from './cors'
export type { CsrfCookieOptions, CsrfOptions } from './csrf'
export { csrfProtection, getCsrfToken } from './csrf'
export type { HeaderTokenGateOptions, RequireHeaderTokenOptions } from './header-token-gate'
export { createHeaderGate, requireHeaderToken } from './header-token-gate'
export type { HstsOptions, SecurityHeadersOptions } from './security-headers'
export { securityHeaders } from './security-headers'
export type { ThrottleRequestsOptions } from './throttle-requests'
export { throttleRequests } from './throttle-requests'
