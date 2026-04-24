/**
 * @fileoverview Body Size Limit Middleware for Photon
 *
 * Request body size limiting middleware migrated from @gravito/core.
 * This is the canonical location for body size limiting in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Options for body size limiting
 * @public
 */
export type BodySizeLimitOptions = {
  methods?: string[]
  requireContentLength?: boolean
}

const defaultMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Middleware to limit request body size.
 *
 * SECURITY NOTE: This middleware performs two-layer validation:
 * 1. Fast path: Checks Content-Length header (if present)
 * 2. Streaming path: Validates actual body size during stream consumption
 *
 * WARNING: If the request lacks Content-Length header and requireContentLength=false,
 * the handler MUST consume the body for size validation to take effect. If the handler
 * doesn't call req.text(), req.json(), or req.formData(), streaming validation is skipped.
 *
 * @param maxBytes - Maximum allowed size in bytes
 * @param options - Configuration options
 * @public
 */
export function bodySizeLimit(
  maxBytes: number,
  options: BodySizeLimitOptions = {}
): GravitoMiddleware {
  const allowedMethods = (options.methods ?? defaultMethods).map((m) => m.toUpperCase())

  const middleware: GravitoMiddleware = async (c, next) => {
    const method = c.req.method.toUpperCase()
    if (!allowedMethods.includes(method)) {
      await next()
      return
    }

    // Fast path: Check Content-Length header (cheap validation)
    const lengthHeader = c.req.header('Content-Length')
    if (lengthHeader) {
      const length = Number(lengthHeader)
      if (!Number.isNaN(length)) {
        if (length > maxBytes) {
          return c.text('Payload Too Large', 413)
        }
        // Header passes check, proceed with request
        await next()
        return
      }
      // Invalid Content-Length format
      if (options.requireContentLength) {
        return c.text('Invalid Content-Length', 400)
      }
    } else if (options.requireContentLength) {
      // No Content-Length header and it's required
      return c.text('Length Required', 411)
    }

    // Slow path: Validate actual body size by streaming chunks
    // This prevents attacks where clients omit/forge Content-Length header
    const rawRequest = c.req.raw
    const validationRequest =
      rawRequest && typeof rawRequest.clone === 'function' ? rawRequest.clone() : null

    if (validationRequest?.body) {
      try {
        const reader = validationRequest.body.getReader()
        let totalSize = 0

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            totalSize += value.byteLength
            if (totalSize > maxBytes) {
              // Body exceeds limit, cancel stream and return error
              reader.cancel()
              return c.text('Payload Too Large', 413)
            }
          }
        } finally {
          reader.releaseLock()
        }
      } catch (_error) {
        // Stream reading error (connection closed, etc.)
        // Allow handler to process
      }
    }

    await next()
  }

  return middleware
}
