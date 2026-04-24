/**
 * Tests for photon.fast() — ultra-low latency route API
 * Verifies that fast-path routes bypass context pool and DI.
 */

import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/photon'

describe('photon.fast()', () => {
  it('registers and serves a fast GET route via fast.get()', async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK'))

    const res = await app.fetch(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
  })

  it('registers a fast route via fast(method, path, handler) call', async () => {
    const app = new Photon()
    app.fast('GET', '/ping', () => new Response('pong'))

    const res = await app.fetch(new Request('http://localhost/ping'))
    expect(await res.text()).toBe('pong')
  })

  it('fast.post() registers a POST fast route', async () => {
    const app = new Photon()
    app.fast.post('/echo', (req) => new Response(`echo:${req.method}`))

    const res = await app.fetch(new Request('http://localhost/echo', { method: 'POST' }))
    expect(await res.text()).toBe('echo:POST')
  })

  it('fast.put() registers a PUT fast route', async () => {
    const app = new Photon()
    app.fast.put('/resource', () => new Response('put ok'))

    const res = await app.fetch(new Request('http://localhost/resource', { method: 'PUT' }))
    expect(await res.text()).toBe('put ok')
  })

  it('fast.delete() registers a DELETE fast route', async () => {
    const app = new Photon()
    app.fast.delete('/resource', () => new Response('deleted'))

    const res = await app.fetch(new Request('http://localhost/resource', { method: 'DELETE' }))
    expect(await res.text()).toBe('deleted')
  })

  it('fast.patch() registers a PATCH fast route', async () => {
    const app = new Photon()
    app.fast.patch('/resource', () => new Response('patched'))

    const res = await app.fetch(new Request('http://localhost/resource', { method: 'PATCH' }))
    expect(await res.text()).toBe('patched')
  })

  it('fast.head() registers a HEAD fast route', async () => {
    const app = new Photon()
    app.fast.head('/resource', () => new Response(null, { status: 200 }))

    const res = await app.fetch(new Request('http://localhost/resource', { method: 'HEAD' }))
    expect(res.status).toBe(200)
  })

  it('fast.options() registers an OPTIONS fast route', async () => {
    const app = new Photon()
    app.fast.options('/resource', () => new Response(null, { status: 204 }))

    const res = await app.fetch(new Request('http://localhost/resource', { method: 'OPTIONS' }))
    expect(res.status).toBe(204)
  })

  it('fast route takes priority over regular route on same path', async () => {
    const app = new Photon()
    app.get('/conflict', (ctx: any) => ctx.text('normal'))
    app.fast.get('/conflict', () => new Response('fast'))

    const res = await app.fetch(new Request('http://localhost/conflict'))
    expect(await res.text()).toBe('fast')
  })

  it('fast.get() returns Photon for chaining', () => {
    const app = new Photon()
    const result = app.fast.get('/a', () => new Response('a'))
    expect(result).toBe(app)
  })

  it('fast(method, path, handler) returns Photon for chaining', () => {
    const app = new Photon()
    const result = app.fast('GET', '/a', () => new Response('a'))
    expect(result).toBe(app)
  })

  it('fast route handler receives raw Request (no context)', async () => {
    const app = new Photon()
    let receivedRequest: Request | null = null

    app.fast.get('/raw', (req) => {
      receivedRequest = req
      return new Response('ok')
    })

    const req = new Request('http://localhost/raw?foo=bar')
    await app.fetch(req)

    expect(receivedRequest).not.toBeNull()
    expect(receivedRequest).toBeInstanceOf(Request)
  })

  it('supports async fast route handlers', async () => {
    const app = new Photon()
    app.fast.get('/async', async (_req) => {
      await Promise.resolve()
      return new Response('async ok')
    })

    const res = await app.fetch(new Request('http://localhost/async'))
    expect(await res.text()).toBe('async ok')
  })

  it('non-fast-path routes still work alongside fast routes', async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('fast'))
    app.get('/api/data', (ctx: any) => ctx.json({ data: 'value' }))

    const fastRes = await app.fetch(new Request('http://localhost/health'))
    const normalRes = await app.fetch(new Request('http://localhost/api/data'))

    expect(await fastRes.text()).toBe('fast')
    expect(normalRes.status).toBe(200)
    const body = await normalRes.json()
    expect((body as { data: string }).data).toBe('value')
  })
})

describe('photon.serveConfig()', () => {
  it('returns a config with routes and fetch', () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK'))

    const config = app.serveConfig()
    expect(config).toBeDefined()
    expect(typeof config.fetch).toBe('function')
    expect(config.routes).toBeDefined()
  })

  it('includes fast GET routes in routes object', () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK'))
    app.fast.get('/ready', () => new Response('Ready'))

    const config = app.serveConfig() as { routes: Record<string, (req: Request) => Response> }
    expect(typeof config.routes['/health']).toBe('function')
    expect(typeof config.routes['/ready']).toBe('function')
  })

  it('merges baseConfig into the output', () => {
    const app = new Photon()
    const config = app.serveConfig({ port: 3000, hostname: '0.0.0.0' })

    expect(config.port).toBe(3000)
    expect(config.hostname).toBe('0.0.0.0')
    expect(typeof config.fetch).toBe('function')
  })

  it('serveConfig routes functions are callable and return Response', async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK', { status: 200 }))

    const config = app.serveConfig() as {
      routes: Record<string, (req: Request) => Response | Promise<Response>>
    }

    const res = await config.routes['/health'](new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
  })

  it('non-GET fast routes are not included in routes map', () => {
    const app = new Photon()
    app.fast.post('/webhook', () => new Response('webhook'))

    const config = app.serveConfig() as { routes: Record<string, unknown> }
    // POST routes should not appear in the Bun.serve routes map (GET only optimization)
    expect(config.routes['/webhook']).toBeUndefined()
  })
})
