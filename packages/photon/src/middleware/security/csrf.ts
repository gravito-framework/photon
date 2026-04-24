/**
 * @fileoverview CSRF Protection Middleware for Photon
 *
 * Cross-Site Request Forgery protection middleware migrated from @gravito/core.
 * This is the canonical location for CSRF middleware in the Gravito ecosystem.
 *
 * 注意：CookieJar 依賴移至使用 Hono 原生 context，cookie 解析改用內建實作
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */

import type { GravitoContext as Context, GravitoMiddleware } from '@gravito/core'

/**
 * Cookie 設定選項（從 @gravito/core CookieOptions 提取，避免循環依賴）
 * @public
 */
export type CsrfCookieOptions = {
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number
  expires?: Date
}

/**
 * Configuration for CSRF Protection
 * @public
 */
export type CsrfOptions = {
  cookieName?: string
  headerName?: string
  formFieldName?: string
  cookie?: CsrfCookieOptions
  safeMethods?: string[]
}

const defaultSafeMethods = ['GET', 'HEAD', 'OPTIONS']

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function buildCookieOptions(custom?: CsrfCookieOptions): CsrfCookieOptions {
  return {
    path: '/',
    sameSite: 'Lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    ...custom,
  }
}

function setCookieHeader(c: Context, name: string, value: string, options: CsrfCookieOptions) {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }
  if (options.path) {
    parts.push(`Path=${options.path}`)
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }
  if (options.secure) {
    parts.push('Secure')
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }
  c.header('Set-Cookie', parts.join('; '), { append: true })
}

/**
 * 解析 Cookie header 字串（不依賴 Bun.CookieMap 以保持可攜性）
 */
function parseCookies(header: string): Record<string, string> {
  if (!header) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) {
      continue
    }
    const key = part.slice(0, eqIdx).trim()
    const val = part.slice(eqIdx + 1).trim()
    out[key] = decodeURIComponent(val)
  }
  return out
}

/**
 * Generate (or retrieve existing) CSRF token for the session.
 * @public
 */
export function getCsrfToken(c: Context, options: CsrfOptions = {}): string {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const cookieHeader = c.req.header('Cookie') || ''
  const cookies = parseCookies(cookieHeader)
  let token = cookies[cookieName]

  if (!token) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const cookieOptions = buildCookieOptions(options.cookie)
    // 在 photon 中直接設定 cookie header（不依賴 CookieJar）
    setCookieHeader(c, cookieName, token, cookieOptions)
  }

  return token
}

/**
 * Middleware that validates CSRF tokens on unsafe requests.
 * @public
 */
export function csrfProtection(options: CsrfOptions = {}): GravitoMiddleware {
  const cookieName = options.cookieName ?? 'gravito_csrf'
  const headerName = (options.headerName ?? 'X-CSRF-Token').toLowerCase()
  const formFieldName = options.formFieldName ?? '_token'
  const safeMethods = (options.safeMethods ?? defaultSafeMethods).map((m) => m.toUpperCase())

  return async (c, next) => {
    const method = c.req.method.toUpperCase()
    const cookieHeader = c.req.header('Cookie') || ''
    const cookies = parseCookies(cookieHeader)
    const token = cookies[cookieName] || getCsrfToken(c, options)

    if (safeMethods.includes(method)) {
      await next()
      return
    }

    const headerToken = c.req.header(headerName) || c.req.header(headerName.toLowerCase())
    let bodyToken: string | undefined
    const contentType = c.req.header('Content-Type') || ''
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      try {
        const body = (await c.req.parseBody()) as Record<string, unknown> | null
        const raw = body?.[formFieldName]
        if (typeof raw === 'string') {
          bodyToken = raw
        }
      } catch (_error) {
        // Body parsing failed, skip form token validation
      }
    }

    const requestToken = headerToken || bodyToken
    if (!requestToken || !timingSafeEqual(token, requestToken)) {
      // HTTP 419: Authentication Timeout (Laravel standard for CSRF failures)
      return c.text('Invalid CSRF token', 419)
    }

    await next()
  }
}
