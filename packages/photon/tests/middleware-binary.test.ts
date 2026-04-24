// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import { decode } from 'cborg'
import { Hono } from 'hono'
import { binaryMiddleware } from '../src/middleware/binary'

describe('binaryMiddleware', () => {
  // Helper to create test app
  const createApp = () => {
    const app = new Hono()
    app.use(binaryMiddleware())
    return app
  }

  describe('CBOR encoding', () => {
    it('encodes JSON response as CBOR when Accept header is application/cbor', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ message: 'Hello CBOR', count: 42 }))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/cbor')

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({ message: 'Hello CBOR', count: 42 })
    })

    it('does not modify response when Accept header is not application/cbor', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ message: 'Hello JSON' }))

      const res = await app.request('/test', {
        headers: { Accept: 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')

      const body = await res.json()
      expect(body).toEqual({ message: 'Hello JSON' })
    })

    it('does not modify response when no Accept header is present', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ data: 'test' }))

      const res = await app.request('/test')

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')
    })
  })

  describe('status code preservation', () => {
    it('preserves 200 status code', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(200)
    })

    it('preserves 201 status code', async () => {
      const app = createApp()
      app.post('/test', (c) => c.json({ created: true }, 201))

      const res = await app.request('/test', {
        method: 'POST',
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(201)

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({ created: true })
    })

    it('preserves 400 status code', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ error: 'Bad Request' }, 400))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(400)
    })

    it('preserves 404 status code', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ error: 'Not Found' }, 404))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(404)
    })

    it('preserves 500 status code', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ error: 'Internal Error' }, 500))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(500)
    })
  })

  describe('header preservation', () => {
    it('preserves custom response headers', async () => {
      const app = createApp()
      app.get('/test', (c) => {
        c.header('X-Request-ID', '12345')
        c.header('X-Custom-Header', 'custom-value')
        return c.json({ data: 'test' })
      })

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.headers.get('X-Request-ID')).toBe('12345')
      expect(res.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(res.headers.get('Content-Type')).toBe('application/cbor')
    })

    it('preserves cache-control headers', async () => {
      const app = createApp()
      app.get('/test', (c) => {
        c.header('Cache-Control', 'max-age=3600')
        return c.json({ cached: true })
      })

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.headers.get('Cache-Control')).toBe('max-age=3600')
    })
  })

  describe('edge cases', () => {
    it('handles empty object response', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({}))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/cbor')

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({})
    })

    it('handles empty array response', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json([]))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual([])
    })

    it('handles null response', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json(null))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toBeNull()
    })

    it('handles nested objects', async () => {
      const app = createApp()
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      app.get('/test', (c) => c.json(nested))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual(nested)
    })

    it('handles array with objects', async () => {
      const app = createApp()
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]
      app.get('/test', (c) => c.json(data))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual(data)
    })

    it('skips encoding when Content-Type is not JSON', async () => {
      const app = createApp()
      // 使用 c.body() 並手動設置 Content-Type 為 text/plain
      app.get('/test', (c) => {
        return c.body('plain text response', 200, {
          'Content-Type': 'text/plain; charset=utf-8',
        })
      })

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const contentType = res.headers.get('Content-Type')
      expect(contentType).not.toBeNull()
      expect(contentType!).toContain('text/plain')
      // 驗證響應沒有被 CBOR 編碼，仍為純文字
      const body = await res.text()
      expect(body).toBe('plain text response')
    })

    it('skips encoding for HTML responses', async () => {
      const app = createApp()
      app.get('/test', (c) => c.html('<h1>Hello</h1>'))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.headers.get('Content-Type')).toContain('text/html')
      const body = await res.text()
      expect(body).toBe('<h1>Hello</h1>')
    })
  })

  describe('data types', () => {
    it('handles boolean values', async () => {
      const app = createApp()
      app.get('/test', (c) => c.json({ active: true, deleted: false }))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({ active: true, deleted: false })
    })

    it('handles numeric values', async () => {
      const app = createApp()
      app.get('/test', (c) =>
        c.json({
          integer: 42,
          negative: -100,
          float: Math.PI,
          zero: 0,
        })
      )

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({
        integer: 42,
        negative: -100,
        float: Math.PI,
        zero: 0,
      })
    })

    it('handles string values with unicode', async () => {
      const app = createApp()
      app.get('/test', (c) =>
        c.json({
          english: 'Hello',
          chinese: '你好',
          emoji: '🚀',
          mixed: 'Hello 世界 🌍',
        })
      )

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body))
      expect(decoded).toEqual({
        english: 'Hello',
        chinese: '你好',
        emoji: '🚀',
        mixed: 'Hello 世界 🌍',
      })
    })
  })

  describe('large payload handling', () => {
    it('encodes large arrays efficiently', async () => {
      const app = createApp()
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
      }))
      app.get('/test', (c) => c.json(largeArray))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/cbor')

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body)) as unknown[]
      expect(decoded.length).toBe(1000)
      expect((decoded[0] as { id: number }).id).toBe(0)
      expect((decoded[999] as { id: number }).id).toBe(999)
    })

    it('encodes objects with many keys', async () => {
      const app = createApp()
      const largeObject: Record<string, number> = {}
      for (let i = 0; i < 500; i++) {
        largeObject[`key_${i}`] = i
      }
      app.get('/test', (c) => c.json(largeObject))

      const res = await app.request('/test', {
        headers: { Accept: 'application/cbor' },
      })

      expect(res.status).toBe(200)

      const body = await res.arrayBuffer()
      const decoded = decode(new Uint8Array(body)) as Record<string, number>
      expect(Object.keys(decoded).length).toBe(500)
      expect(decoded.key_0).toBe(0)
      expect(decoded.key_499).toBe(499)
    })
  })
})
