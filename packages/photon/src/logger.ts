/**
 * Logging Middleware for Photon.
 *
 * Provides request logging capabilities to track incoming traffic,
 * response times, and status codes.
 *
 * Native implementation (no Hono dependency).
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { logger } from '@gravito/photon/logger'
 *
 * const app = new Photon()
 * app.use(logger())
 * ```
 *
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Request logger middleware
 *
 * Logs HTTP method, path, status code, and response time for each request.
 *
 * @returns GravitoMiddleware
 */
export function logger(): GravitoMiddleware {
  return async (ctx, next) => {
    const start = Date.now()
    const method = ctx.req.method
    const path = ctx.req.path

    await next()

    const duration = Date.now() - start
    const status = ctx.res?.status ?? 200

    console.log(`${method} ${path} ${status} ${duration}ms`)
  }
}
