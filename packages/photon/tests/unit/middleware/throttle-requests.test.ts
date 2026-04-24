import { describe, expect, it } from 'bun:test'
import { throttleRequests } from '../../../src/middleware/security/throttle-requests'

/**
 * throttle-requests 測試（photon 版本）
 *
 * 注意：photon 版本使用函數基底 API（throttleRequests(options)），
 * 不再使用 core 版本的類別基底 API（new ThrottleRequests(core).handle(max, decay)）。
 *
 * 主要差異：
 * - core: new ThrottleRequests(core).handle(maxAttempts, decaySeconds)
 * - photon: throttleRequests({ maxAttempts, decaySeconds, trustProxy, onMissingCache })
 */
describe('throttleRequests', () => {
  it('skips rate limiting when cache is missing', async () => {
    const warns: string[] = []
    const middleware = throttleRequests({
      onMissingCache: (msg) => warns.push(msg),
    })

    let nextCalled = false
    const ctx = {
      get: (_key: string) => undefined,
      req: { header: (_name: string) => undefined, path: '/test', raw: undefined },
    }

    await middleware(ctx as any, async () => {
      nextCalled = true
      return undefined
    })

    expect(nextCalled).toBe(true)
    expect(warns.length).toBe(1)
  })

  it('returns 429 when limit is exceeded', async () => {
    const middleware = throttleRequests({ maxAttempts: 2, decaySeconds: 60 })

    const headers = new Map<string, string>()
    const ctx = {
      get: (key: string) => {
        if (key === 'cache') {
          return {
            limiter: () => ({
              attempt: async () => ({ allowed: false, remaining: 0, reset: 123 }),
            }),
          }
        }
        return undefined
      },
      header: (name: string, value: string) => {
        headers.set(name, value)
      },
      req: { header: (_name: string) => '203.0.113.1', path: '/test', raw: undefined },
      text: (text: string, status: number) => new Response(text, { status }),
    }

    const res = await middleware(ctx as any, async () => undefined)
    expect(res?.status).toBe(429)
    expect(headers.get('X-RateLimit-Limit')).toBe('2')
    expect(headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(headers.get('X-RateLimit-Reset')).toBe('123')
    expect(headers.get('Retry-After')).toBe('60')
  })

  it('allows request when limiter permits it', async () => {
    const middleware = throttleRequests({ maxAttempts: 5, decaySeconds: 10 })

    const headers = new Map<string, string>()
    let nextCalled = false
    const ctx = {
      get: (key: string) => {
        if (key === 'cache') {
          return {
            limiter: () => ({
              attempt: async () => ({ allowed: true, remaining: 4, reset: 0 }),
            }),
          }
        }
        return undefined
      },
      header: (name: string, value: string) => {
        headers.set(name, value)
      },
      req: { header: (_name: string) => '203.0.113.1', path: '/test', raw: undefined },
    }

    const res = await middleware(ctx as any, async () => {
      nextCalled = true
      return undefined
    })

    expect(res).toBeUndefined()
    expect(nextCalled).toBe(true)
    expect(headers.get('X-RateLimit-Limit')).toBe('5')
    expect(headers.get('X-RateLimit-Remaining')).toBe('4')
    expect(headers.has('Retry-After')).toBe(false)
  })
})
