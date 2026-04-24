/**
 * @fileoverview CORS Middleware for Photon
 *
 * Cross-Origin Resource Sharing (CORS) middleware migrated from @gravito/core.
 * This is the canonical location for CORS middleware in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Allowed origin(s) configuration.
 * @public
 */
export type CorsOrigin = string | string[] | ((origin: string | undefined) => string | false)

/**
 * Options for CORS middleware
 * @public
 */
export type CorsOptions = {
  origin?: CorsOrigin
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
  optionsSuccessStatus?: number
}

function resolveOrigin(
  origin: CorsOrigin | undefined,
  requestOrigin: string | undefined
): string | false {
  if (!origin) {
    return '*'
  }
  if (typeof origin === 'string') {
    return origin
  }
  if (Array.isArray(origin)) {
    return requestOrigin && origin.includes(requestOrigin) ? requestOrigin : false
  }
  return origin(requestOrigin)
}

/**
 * Middleware handling Cross-Origin Resource Sharing (CORS).
 * @public
 */
export function cors(options: CorsOptions = {}): GravitoMiddleware {
  const methods = (
    options.methods ?? ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  ).join(', ')
  const allowedHeaders = options.allowedHeaders?.join(', ')
  const exposedHeaders = options.exposedHeaders?.join(', ')
  const credentials = options.credentials === true
  const maxAge = options.maxAge
  const optionsStatus = options.optionsSuccessStatus ?? 204

  const middleware: GravitoMiddleware = async (c, next) => {
    const requestOrigin = c.req.header('Origin')
    const allowOrigin = resolveOrigin(options.origin, requestOrigin)

    if (allowOrigin) {
      c.header('Access-Control-Allow-Origin', allowOrigin)
      if (allowOrigin !== '*') {
        c.header('Vary', 'Origin')
      }
      if (credentials) {
        c.header('Access-Control-Allow-Credentials', 'true')
      }
      if (exposedHeaders) {
        c.header('Access-Control-Expose-Headers', exposedHeaders)
      }
    }

    if (c.req.method.toUpperCase() === 'OPTIONS') {
      const requestMethod = c.req.header('Access-Control-Request-Method')
      if (requestMethod) {
        c.header('Access-Control-Allow-Methods', methods)
        if (allowedHeaders) {
          c.header('Access-Control-Allow-Headers', allowedHeaders)
        } else {
          const reqHeaders = c.req.header('Access-Control-Request-Headers')
          if (reqHeaders) {
            c.header('Access-Control-Allow-Headers', reqHeaders)
          }
        }
        if (maxAge !== undefined) {
          c.header('Access-Control-Max-Age', String(maxAge))
        }
        // Standard HTTP status for successful OPTIONS: 204 (No Content) or 200 (OK)
        return c.text('', optionsStatus)
      }
    }

    await next()
  }

  return middleware
}
