// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import { Photon } from '@gravito/photon'
import { MemoryStore, rateLimit, rateLimiter } from '../ratelimit'

describe('Rate Limiting Middleware', () => {
  it('should allow requests within limit', async () => {
    const app = new Photon()
    app.use('*', rateLimit({ maxRequests: 3, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    for (let i = 0; i < 3; i++) {
      const res = await app.request('http://localhost/test')
      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Remaining')).toBe((2 - i).toString())
    }
  })

  it('should block requests exceeding limit', async () => {
    const app = new Photon()
    app.use('*', rateLimit({ maxRequests: 2, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    await app.request('http://localhost/test')
    await app.request('http://localhost/test')

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(429)

    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toBe('Too Many Requests')
  })

  it('should add rate limit headers', async () => {
    const app = new Photon()
    app.use('*', rateLimit({ maxRequests: 100, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')

    expect(res.headers.get('X-RateLimit-Limit')).toBe('100')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('99')
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()
  })

  it('should support custom key generator', async () => {
    const app = new Photon()
    app.use(
      '*',
      rateLimit({
        maxRequests: 2,
        windowMs: 60000,
        keyGenerator: (c) => c.req.query('user') || 'anonymous',
      })
    )
    app.get('/test', (c) => c.json({ ok: true }))

    await app.request('http://localhost/test?user=alice')
    await app.request('http://localhost/test?user=alice')
    const aliceBlocked = await app.request('http://localhost/test?user=alice')
    expect(aliceBlocked.status).toBe(429)

    const bobOk = await app.request('http://localhost/test?user=bob')
    expect(bobOk.status).toBe(200)
  })

  it('should support skip function', async () => {
    const app = new Photon()
    app.use(
      '*',
      rateLimit({
        maxRequests: 1,
        windowMs: 60000,
        skip: (c) => c.req.query('admin') === 'true',
      })
    )
    app.get('/test', (c) => c.json({ ok: true }))

    for (let i = 0; i < 5; i++) {
      const res = await app.request('http://localhost/test?admin=true')
      expect(res.status).toBe(200)
    }

    await app.request('http://localhost/test')
    const blocked = await app.request('http://localhost/test')
    expect(blocked.status).toBe(429)
  })

  it('should include draft headers when enabled', async () => {
    const app = new Photon()
    app.use('*', rateLimit({ maxRequests: 100, windowMs: 60000, draftHeaders: true }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')

    expect(res.headers.get('RateLimit-Limit')).toBe('100')
    expect(res.headers.get('RateLimit-Remaining')).toBe('99')
    expect(res.headers.get('RateLimit-Reset')).toBe('60')
  })

  it('should support preset configurations', async () => {
    const app = new Photon()
    app.use('/api/*', rateLimiter.strict())
    app.get('/api/data', (c) => c.json({ ok: true }))

    for (let i = 0; i < 10; i++) {
      await app.request('http://localhost/api/data')
    }

    const blocked = await app.request('http://localhost/api/data')
    expect(blocked.status).toBe(429)
  })
})

describe('MemoryStore', () => {
  it('should increment count correctly', async () => {
    const store = new MemoryStore({ maxRequests: 10, windowMs: 60000 })

    const state1 = await store.increment('user1')
    expect(state1.count).toBe(1)
    expect(state1.remaining).toBe(9)

    const state2 = await store.increment('user1')
    expect(state2.count).toBe(2)
    expect(state2.remaining).toBe(8)
  })

  it('should reset after window expires', async () => {
    const store = new MemoryStore({ maxRequests: 10, windowMs: 100 })

    await store.increment('user1')
    await store.increment('user1')

    await new Promise((resolve) => setTimeout(resolve, 150))

    const state = await store.increment('user1')
    expect(state.count).toBe(1)
  })

  it('should reset manually', async () => {
    const store = new MemoryStore({ maxRequests: 10, windowMs: 60000 })

    await store.increment('user1')
    await store.increment('user1')

    await store.reset('user1')

    const state = await store.get('user1')
    expect(state).toBeNull()
  })
})
