import { describe, expect, it, mock } from 'bun:test'
import { bodySizeLimit } from '../../../src/middleware/security/body-size-limit'
import {
  createHeaderGate,
  requireHeaderToken,
} from '../../../src/middleware/security/header-token-gate'
import { securityHeaders } from '../../../src/middleware/security/security-headers'

// 建立模擬 Context 的工具函式
const makeContext = (options: {
  method?: string
  headers?: Record<string, string | undefined>
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
      raw: {} as any,
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

describe('BodySizeLimit edge cases', () => {
  it('should allow PUT method by default', async () => {
    const ctx = makeContext({
      method: 'PUT',
      headers: { 'Content-Length': '100' },
    }) as any
    const res = await bodySizeLimit(50)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  it('should allow PATCH method by default', async () => {
    const ctx = makeContext({
      method: 'PATCH',
      headers: { 'Content-Length': '100' },
    }) as any
    const res = await bodySizeLimit(50)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  it('should allow DELETE method by default', async () => {
    const ctx = makeContext({
      method: 'DELETE',
      headers: { 'Content-Length': '100' },
    }) as any
    const res = await bodySizeLimit(50)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  it('should skip non-default methods like OPTIONS', async () => {
    const ctx = makeContext({
      method: 'OPTIONS',
      headers: { 'Content-Length': '100' },
    }) as any
    const next = mock(async () => {})
    await bodySizeLimit(50)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('should support custom methods list', async () => {
    const ctx = makeContext({
      method: 'CUSTOM',
      headers: { 'Content-Length': '100' },
    }) as any
    const res = await bodySizeLimit(50, { methods: ['CUSTOM'] })(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  it('should be case-insensitive for method matching', async () => {
    const ctx = makeContext({
      method: 'post',
      headers: { 'Content-Length': '100' },
    }) as any
    const res = await bodySizeLimit(50)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
  })

  it('should pass through when no Content-Length and not required', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: {},
    }) as any
    const next = mock(async () => {})
    await bodySizeLimit(100)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('should pass through when Content-Length is NaN and not required', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: { 'Content-Length': 'invalid' },
    }) as any
    const next = mock(async () => {})
    await bodySizeLimit(100)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('should return 411 when Content-Length missing and requireContentLength=true', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: {},
    }) as any
    const res = await bodySizeLimit(100, { requireContentLength: true })(ctx, async () => {})
    expect((res as any)?.status).toBe(411)
    expect((res as any)?.body).toBe('Length Required')
  })

  it('should return 400 when Content-Length is invalid and requireContentLength=true', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: { 'Content-Length': 'abc' },
    }) as any
    const res = await bodySizeLimit(100, { requireContentLength: true })(ctx, async () => {})
    expect((res as any)?.status).toBe(400)
    expect((res as any)?.body).toBe('Invalid Content-Length')
  })

  it('should allow exact size limit', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: { 'Content-Length': '100' },
    }) as any
    const next = mock(async () => {})
    await bodySizeLimit(100)(ctx, next)
    expect(next).toHaveBeenCalled()
  })

  it('should reject size just over limit', async () => {
    const ctx = makeContext({
      method: 'POST',
      headers: { 'Content-Length': '101' },
    }) as any
    const res = await bodySizeLimit(100)(ctx, async () => {})
    expect((res as any)?.status).toBe(413)
    expect((res as any)?.body).toBe('Payload Too Large')
  })
})

describe('SecurityHeaders edge cases', () => {
  it('should set default security headers with no options', async () => {
    const ctx = makeContext({}) as any
    const next = mock(async () => {})

    await securityHeaders()(ctx, next)

    expect(ctx.headers['X-Content-Type-Options']).toBe('nosniff')
    expect(ctx.headers['X-Frame-Options']).toBe('DENY')
    expect(ctx.headers['Referrer-Policy']).toBe('no-referrer')
    expect(ctx.headers['Cross-Origin-Opener-Policy']).toBe('same-origin')
    expect(ctx.headers['Cross-Origin-Resource-Policy']).toBe('same-site')
    expect(next).toHaveBeenCalled()
  })

  it('should not set Permissions-Policy by default (false)', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders()(ctx, async () => {})
    expect(ctx.headers['Permissions-Policy']).toBeUndefined()
  })

  it('should not set CSP by default (undefined)', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders()(ctx, async () => {})
    expect(ctx.headers['Content-Security-Policy']).toBeUndefined()
  })

  it('should not set HSTS by default (undefined)', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders()(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBeUndefined()
  })

  it('should disable noSniff when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ noSniff: false })(ctx, async () => {})
    expect(ctx.headers['X-Content-Type-Options']).toBeUndefined()
  })

  it('should disable frameOptions when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ frameOptions: false })(ctx, async () => {})
    expect(ctx.headers['X-Frame-Options']).toBeUndefined()
  })

  it('should disable referrerPolicy when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ referrerPolicy: false })(ctx, async () => {})
    expect(ctx.headers['Referrer-Policy']).toBeUndefined()
  })

  it('should set custom frameOptions value', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ frameOptions: 'SAMEORIGIN' })(ctx, async () => {})
    expect(ctx.headers['X-Frame-Options']).toBe('SAMEORIGIN')
  })

  it('should set custom referrerPolicy value', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ referrerPolicy: 'strict-origin' })(ctx, async () => {})
    expect(ctx.headers['Referrer-Policy']).toBe('strict-origin')
  })

  it('should set Permissions-Policy when provided', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ permissionsPolicy: 'camera=(), microphone=()' })(ctx, async () => {})
    expect(ctx.headers['Permissions-Policy']).toBe('camera=(), microphone=()')
  })

  it('should set CSP as string', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ contentSecurityPolicy: "default-src 'none'" })(ctx, async () => {})
    expect(ctx.headers['Content-Security-Policy']).toBe("default-src 'none'")
  })

  it('should set CSP from function', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({
      contentSecurityPolicy: () => "script-src 'self'",
    })(ctx, async () => {})
    expect(ctx.headers['Content-Security-Policy']).toBe("script-src 'self'")
  })

  it('should not set CSP when function returns false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({
      contentSecurityPolicy: () => false,
    })(ctx, async () => {})
    expect(ctx.headers['Content-Security-Policy']).toBeUndefined()
  })

  it('should not set CSP when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ contentSecurityPolicy: false })(ctx, async () => {})
    expect(ctx.headers['Content-Security-Policy']).toBeUndefined()
  })

  it('should set HSTS with maxAge only', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ hsts: { maxAge: 31536000 } })(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=31536000')
  })

  it('should set HSTS with includeSubDomains', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({
      hsts: { maxAge: 31536000, includeSubDomains: true },
    })(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
  })

  it('should set HSTS with preload', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({
      hsts: { maxAge: 31536000, preload: true },
    })(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=31536000; preload')
  })

  it('should handle negative maxAge as 0', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ hsts: { maxAge: -1 } })(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBe('max-age=0')
  })

  it('should disable HSTS when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ hsts: false })(ctx, async () => {})
    expect(ctx.headers['Strict-Transport-Security']).toBeUndefined()
  })

  it('should disable crossOriginOpenerPolicy when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ crossOriginOpenerPolicy: false })(ctx, async () => {})
    expect(ctx.headers['Cross-Origin-Opener-Policy']).toBeUndefined()
  })

  it('should disable crossOriginResourcePolicy when set to false', async () => {
    const ctx = makeContext({}) as any
    await securityHeaders({ crossOriginResourcePolicy: false })(ctx, async () => {})
    expect(ctx.headers['Cross-Origin-Resource-Policy']).toBeUndefined()
  })

  it('should always call next after setting headers', async () => {
    // photon 版本使用 Hono Context，保證 c.header 存在
    // 此測試驗證所有 headers 設定後 next 一定被呼叫
    const ctx = makeContext({}) as any
    const next = mock(async () => {})
    await securityHeaders()(ctx, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('HeaderTokenGate edge cases', () => {
  it('should use default header name x-admin-token', async () => {
    const ctx = makeContext({
      headers: { 'x-admin-token': 'my-secret' },
    }) as any

    const gate = createHeaderGate({ token: 'my-secret' })
    expect(await gate(ctx)).toBe(true)
  })

  it('should use custom header name', async () => {
    const ctx = makeContext({
      headers: { 'x-api-key': 'my-key' },
    }) as any

    const gate = createHeaderGate({
      headerName: 'x-api-key',
      token: 'my-key',
    })
    expect(await gate(ctx)).toBe(true)
  })

  it('should return false when expected token is undefined', async () => {
    const originalEnv = process.env.ADMIN_TOKEN
    delete process.env.ADMIN_TOKEN

    const ctx = makeContext({
      headers: { 'x-admin-token': 'something' },
    }) as any

    const gate = createHeaderGate({})
    expect(await gate(ctx)).toBe(false)

    if (originalEnv !== undefined) {
      process.env.ADMIN_TOKEN = originalEnv
    }
  })

  it('should use token function when provided', async () => {
    const ctx = makeContext({
      headers: { 'x-admin-token': 'dynamic-token' },
    }) as any

    const gate = createHeaderGate({
      token: () => 'dynamic-token',
    })
    expect(await gate(ctx)).toBe(true)
  })

  it('should return false when token function returns undefined', async () => {
    const ctx = makeContext({
      headers: { 'x-admin-token': 'something' },
    }) as any

    const gate = createHeaderGate({
      token: () => undefined,
    })
    expect(await gate(ctx)).toBe(false)
  })

  it('should return false when provided token does not match', async () => {
    const ctx = makeContext({
      headers: { 'x-admin-token': 'wrong-token' },
    }) as any

    const gate = createHeaderGate({ token: 'correct-token' })
    expect(await gate(ctx)).toBe(false)
  })

  it('should return false when header is missing', async () => {
    const ctx = makeContext({
      headers: {},
    }) as any

    const gate = createHeaderGate({ token: 'secret' })
    expect(await gate(ctx)).toBe(false)
  })

  it('should fall back to ADMIN_TOKEN env variable', async () => {
    const originalEnv = process.env.ADMIN_TOKEN
    process.env.ADMIN_TOKEN = 'env-token'

    const ctx = makeContext({
      headers: { 'x-admin-token': 'env-token' },
    }) as any

    const gate = createHeaderGate({})
    expect(await gate(ctx)).toBe(true)

    if (originalEnv !== undefined) {
      process.env.ADMIN_TOKEN = originalEnv
    } else {
      delete process.env.ADMIN_TOKEN
    }
  })

  describe('requireHeaderToken middleware', () => {
    it('should pass through when token matches', async () => {
      const ctx = makeContext({
        headers: { 'x-admin-token': 'valid' },
      }) as any

      const next = mock(async () => {})
      await requireHeaderToken({ token: 'valid' })(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('should return 403 by default when token fails', async () => {
      const ctx = makeContext({ headers: {} }) as any
      const res = await requireHeaderToken({ token: 'secret' })(ctx, async () => {})
      expect((res as any)?.status).toBe(403)
    })

    it('should use custom status code', async () => {
      const ctx = makeContext({ headers: {} }) as any
      const res = await requireHeaderToken({
        token: 'secret',
        status: 401,
      })(ctx, async () => {})
      expect((res as any)?.status).toBe(401)
    })

    it('should use custom message', async () => {
      const ctx = makeContext({ headers: {} }) as any
      const res = await requireHeaderToken({
        token: 'secret',
        message: 'Access denied',
      })(ctx, async () => {})
      expect((res as any)?.body).toBe('Access denied')
    })

    it('should use default message "Unauthorized"', async () => {
      const ctx = makeContext({ headers: {} }) as any
      const res = await requireHeaderToken({ token: 'secret' })(ctx, async () => {})
      expect((res as any)?.body).toBe('Unauthorized')
    })
  })
})
