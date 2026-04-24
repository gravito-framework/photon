/**
 * @fileoverview Security Headers Middleware for Photon
 *
 * Helmet-style security headers middleware migrated from @gravito/core.
 * This is the canonical location for security headers middleware in the Gravito ecosystem.
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type { GravitoContext as Context, GravitoMiddleware } from '@gravito/core'

/**
 * HSTS Configuration
 * @public
 */
export type HstsOptions = {
  maxAge: number
  includeSubDomains?: boolean
  preload?: boolean
}

/**
 * Options for Security Headers middleware
 * @public
 */
export type SecurityHeadersOptions = {
  contentSecurityPolicy?: string | false | ((c: Context) => string | false)
  frameOptions?: string | false
  referrerPolicy?: string | false
  noSniff?: boolean
  hsts?: HstsOptions | false
  permissionsPolicy?: string | false
  crossOriginOpenerPolicy?: string | false
  crossOriginResourcePolicy?: string | false
}

function buildHstsHeader(options: HstsOptions): string {
  const parts = [`max-age=${Math.max(0, options.maxAge)}`]
  if (options.includeSubDomains) {
    parts.push('includeSubDomains')
  }
  if (options.preload) {
    parts.push('preload')
  }
  return parts.join('; ')
}

/**
 * Apply common security headers to responses (Helmet-style).
 * @public
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): GravitoMiddleware {
  const defaults: Required<Omit<SecurityHeadersOptions, 'contentSecurityPolicy' | 'hsts'>> = {
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    noSniff: true,
    permissionsPolicy: false,
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-site',
  }

  const merged = {
    ...defaults,
    ...options,
  }

  const middleware: GravitoMiddleware = async (c, next) => {
    if (merged.noSniff) {
      c.header('X-Content-Type-Options', 'nosniff')
    }
    if (merged.frameOptions) {
      c.header('X-Frame-Options', merged.frameOptions)
    }
    if (merged.referrerPolicy) {
      c.header('Referrer-Policy', merged.referrerPolicy)
    }
    if (merged.permissionsPolicy) {
      c.header('Permissions-Policy', merged.permissionsPolicy)
    }
    if (merged.crossOriginOpenerPolicy) {
      c.header('Cross-Origin-Opener-Policy', merged.crossOriginOpenerPolicy)
    }
    if (merged.crossOriginResourcePolicy) {
      c.header('Cross-Origin-Resource-Policy', merged.crossOriginResourcePolicy)
    }
    const cspValue =
      typeof merged.contentSecurityPolicy === 'function'
        ? merged.contentSecurityPolicy(c)
        : merged.contentSecurityPolicy
    if (cspValue) {
      c.header('Content-Security-Policy', cspValue)
    }
    if (merged.hsts) {
      c.header('Strict-Transport-Security', buildHstsHeader(merged.hsts))
    }

    return await next()
  }

  return middleware
}
