import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { bodySizeLimit } from '../../../src/middleware/security/body-size-limit'
import { cors } from '../../../src/middleware/security/cors'
import { csrfProtection, getCsrfToken } from '../../../src/middleware/security/csrf'
import {
  createHeaderGate,
  requireHeaderToken,
} from '../../../src/middleware/security/header-token-gate'
import { securityHeaders } from '../../../src/middleware/security/security-headers'

const makeContext = (options: {
  method?: string
  headers?: Record<string, string | undefined>
  parseBody?: () => Promise<Record<string, unknown>>
}) => {
  const headers = options.headers ?? {}
  const setHeaders: Record<string, string> = {}

  return {
    get: () => undefined,
    req: {
      method: options.method ?? 'GET',
      header: (key: string) => {
        if (headers[key] !== undefined) {
          return headers[key]
        }
        const lowerKey = key.toLowerCase()
        if (headers[lowerKey] !== undefined) {
          return headers[lowerKey]
        }
        const found = Object.keys(headers).find((k) => k.toLowerCase() === lowerKey)
        return found ? headers[found] : undefined
      },
      parseBody: options.parseBody ?? (async () => ({})),
    },
    header: (name: string, value: string) => {
      setHeaders[name] = value
    },
    text: (body: string, status: number) => ({ body, status, headers: { ...setHeaders } }),
    get headers() {
      return setHeaders
    },
  }
}

describe('cors middleware', () => {
  test('sets CORS headers for simple requests', async () => {
    const ctx = makeContext({
      method: 'GET',
      headers: { Origin: 'https://example.com' },
    }) as any

    const middleware = cors({ origin: 'https://example.com', credentials: true })
    const next = mock(async () => {})

    await middleware(ctx, next)
    expect(ctx.headers['Access-Control-Allow-Origin']).toBe('https://example.com')
    expect(ctx.headers['Access-Control-Allow-Credentials']).toBe('true')
    expect(next).toHaveBeenCalled()
  })

  test('handles preflight requests', async () => {
    const ctx = makeContext({
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-Test',
      },
    }) as any

    const middleware = cors({ origin: ['https://example.com'], maxAge: 600 })
    const res = await middleware(ctx, async () => {})

    expect((res as any)?.status).toBe(204)
    expect(ctx.headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(ctx.headers['Access-Control-Allow-Headers']).toBe('X-Test')
    expect(ctx.headers['Access-Control-Max-Age']).toBe('600')
  })
})

describe('bodySizeLimit middleware', () => {
  test('skips non-matching methods', async () => {
    const ctx = makeContext({ method: 'GET' }) as any
    const next = mock(async () => {})
    const middleware = bodySizeLimit(10)

    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  test('returns 411 when length required', async () => {
    const ctx = makeContext({ method: 'POST', headers: {} }) as any
    const res = await bodySizeLimit(10, { requireContentLength: true })(ctx, async () => {})
    expect((res as any)?.status).toBe(411)
  })

  test('returns 400 on invalid length', async () => {
    const ctx = makeContext({ method: 'POST', headers: { 'Content-Length': 'nope' } }) as any
    const res = await bodySizeLimit(10, { requireContentLength: true })(ctx, async () => {})
    expect((res as any)?.status).toBe(400)
  })

  test('returns 413 when length exceeds limit', async () => {
    const ctx = makeContext({ method: 'POST', headers: { 'Content-Length': '20' } }) as any
    const res = await bodySizeLimit(10)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  test('passes when length is within limit', async () => {
    const ctx = makeContext({ method: 'POST', headers: { 'Content-Length': '5' } }) as any
    const next = mock(async () => {})
    await bodySizeLimit(10)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  test('preserves request body for downstream handlers during streaming validation', async () => {
    const request = new Request('https://example.com', {
      method: 'POST',
      body: 'hello',
    })

    const ctx = {
      ...makeContext({ method: 'POST', headers: {} }),
      req: {
        ...makeContext({ method: 'POST', headers: {} }).req,
        raw: request,
      },
    } as any

    let bodyText = ''
    await bodySizeLimit(10)(ctx, async () => {
      bodyText = await request.text()
    })

    expect(bodyText).toBe('hello')
  })
})

describe('securityHeaders middleware', () => {
  test('sets default headers and custom CSP', async () => {
    const ctx = makeContext({}) as any
    const middleware = securityHeaders({
      contentSecurityPolicy: () => "default-src 'self'",
      hsts: { maxAge: 10, includeSubDomains: true, preload: true },
    })

    await middleware(ctx, async () => {})
    expect(ctx.headers['X-Frame-Options']).toBe('DENY')
    expect(ctx.headers['Content-Security-Policy']).toBe("default-src 'self'")
    expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=10; includeSubDomains; preload')
  })
})

describe('csrf helpers', () => {
  beforeEach(() => {
    // Ensure fresh state for each test — no shared mock or context bleeding between workers
  })

  afterEach(() => {
    mock.restore()
  })

  test('returns existing csrf token from cookie', () => {
    const ctx = makeContext({ headers: { Cookie: 'gravito_csrf=token123' } }) as any
    const token = getCsrfToken(ctx)
    expect(token).toBe('token123')
  })

  test('queues csrf token when missing', () => {
    let queued: { name: string; value: string } | null = null
    const ctx = {
      ...makeContext({ headers: {} }),
      get: () => ({
        queue: (name: string, value: string) => {
          queued = { name, value }
        },
      }),
    } as any

    const token = getCsrfToken(ctx)
    expect(token).toBeTruthy()
    // photon 版本不使用 CookieJar，改用 header 設定 cookie
    expect(queued).toBeNull()
  })

  test('csrfProtection validates token', async () => {
    const token = 'abc'
    const ctx = makeContext({
      method: 'POST',
      headers: { Cookie: `gravito_csrf=${token}`, 'X-CSRF-Token': token },
    }) as any
    const next = mock(async () => {})

    await csrfProtection()(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  test('csrfProtection rejects missing token', async () => {
    const ctx = makeContext({ method: 'POST', headers: {} }) as any
    const res = await csrfProtection()(ctx, async () => {})
    expect((res as any)?.status).toBe(419)
  })

  test('csrfProtection accepts form body token', async () => {
    const token = 'form-token'
    const ctx = makeContext({
      method: 'POST',
      headers: {
        Cookie: `gravito_csrf=${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      parseBody: async () => ({ _token: token }),
    }) as any

    const next = mock(async () => {})
    await csrfProtection()(ctx, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('header token gate', () => {
  test('createHeaderGate validates tokens', async () => {
    const ctx = makeContext({ headers: { 'x-admin-token': 'secret' } }) as any
    const gate = createHeaderGate({ token: 'secret' })
    expect(await gate(ctx)).toBe(true)
  })

  test('requireHeaderToken blocks when missing', async () => {
    const ctx = makeContext({ headers: {} }) as any
    const res = await requireHeaderToken({ token: 'secret', message: 'nope' })(ctx, async () => {})
    expect((res as any)?.status).toBe(403)
    expect((res as any)?.body).toBe('nope')
  })
})
