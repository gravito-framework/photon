/**
 * @gravito/photon - Native Bun HTTP engine for Gravito
 *
 * Photon is a high-performance, type-safe HTTP layer built on Bun's native
 * features and @gravito/core's BunNativeAdapter.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.get('/api/users', (c) => c.json({ users: [] }))
 * export default app
 * ```
 */
/**
 * Binary-related middleware for Photon.
 *
 * Provides utilities for handling binary data formats like CBOR,
 * optimizing payload size and serialization speed for high-performance APIs.
 *
 * @public
 */

export type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
} from '@gravito/core'
export * from './middleware/binary'
/**
 * HTMX-related middleware for Photon.
 *
 * Enhances Photon with first-class support for HTMX, including
 * automatic request detection and simplified header access for hypermedia-driven UIs.
 *
 * @public
 */
export * from './middleware/htmx'
/**
 * Rate limiting middleware for Photon.
 *
 * Provides built-in rate limiting with token bucket and sliding window strategies.
 * Supports both memory-based and custom storage backends.
 *
 * @public
 */
export * from './middleware/ratelimit'
/**
 * Redis-based rate limiting storage.
 * @public
 */
export * from './middleware/ratelimit-redis'
/**
 * Security middleware for Photon.
 *
 * Provides HTTP security utilities migrated from `@gravito/core`:
 * CORS, CSRF protection, security headers, body size limiting,
 * header token gating, and request throttling.
 *
 * @public
 */
export * from './middleware/security'
export * from './middleware-adapter'
// Export main Photon application class and types
export { Photon } from './photon'
