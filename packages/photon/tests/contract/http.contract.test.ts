import { describe, expect, test } from 'bun:test'
import { Photon } from '../../src'

async function assertResponse(
  response: Response,
  status: number,
  body: string,
  headers: Record<string, string | null>
) {
  expect(response.status).toBe(status)
  for (const [name, value] of Object.entries(headers)) {
    expect(response.headers.get(name)).toBe(value)
  }
  expect(await response.text()).toBe(body)
}

for (const transport of ['request', 'fetch', 'socket'] as const) {
  describe(`HTTP contracts: ${transport}`, () => {
    async function exercise(
      app: Photon,
      check: (send: (path: string, init?: RequestInit) => Promise<Response>) => Promise<void>
    ) {
      if (transport !== 'socket') {
        await check((path, init) =>
          transport === 'request'
            ? app.request(path, init)
            : app.fetch(new Request(`http://localhost${path}`, init))
        )
        return
      }
      const server = Bun.serve(app.serveConfig({ port: 0, hostname: '127.0.0.1' }))
      try {
        await check((path, init) => fetch(new URL(path, server.url), init))
      } finally {
        await server.stop(true)
      }
    }

    test('default 404 retains middleware headers before and after next', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.header('x-before', 'yes')
        await next()
        c.header('x-after', 'yes')
      })
      await exercise(app, async (send) => {
        await assertResponse(await send('/missing'), 404, 'Not Found', {
          'content-type': 'text/plain',
          'x-before': 'yes',
          'x-after': 'yes',
        })
      })
    })

    test('mount preserves parent and child middleware headers, method, body and query', async () => {
      const app = new Photon()
      const child = new Photon()
      app.use(async (c, next) => {
        c.header('x-parent', 'before')
        await next()
        c.header('x-after', 'after')
      })
      child.use(async (c, next) => {
        c.header('x-child', 'yes')
        await next()
      })
      child.post('/items/:id', async (c) =>
        c.json({ id: c.req.param('id'), query: c.req.query('q'), body: await c.req.text() }, 201)
      )
      child.get('/', (c) => c.text('root'))
      app.mount('/api', child)
      await exercise(app, async (send) => {
        await assertResponse(
          await send('/api/items/a%20b?q=ok', { method: 'POST', body: 'payload' }),
          201,
          '{"id":"a b","query":"ok","body":"payload"}',
          {
            'content-type': 'application/json',
            'x-parent': 'before',
            'x-child': 'yes',
            'x-after': 'after',
          }
        )
        await assertResponse(await send('/api'), 200, 'root', {
          'x-parent': 'before',
          'x-child': 'yes',
        })
        await assertResponse(await send('/apix'), 404, 'Not Found', {
          'x-parent': 'before',
          'x-child': null,
        })
      })
    })
    test('sync and async errors, duplicate next and failing error handlers recover without leaking state', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.header('x-boundary', 'yes')
        await next()
      })
      app.get('/sync', (c) => {
        c.set('secret', 'old')
        throw new Error('sync')
      })
      app.get('/async', async () => {
        await Promise.resolve()
        throw new Error('async')
      })
      app.get('/twice', async (c, next) => {
        c.text('discard')
        await next()
        await next()
      })
      app.get('/handler-fails', () => {
        throw new Error('handler-fails')
      })
      app.get('/handler-rejects', () => {
        throw new Error('handler-rejects')
      })
      app.get('/clean', (c) =>
        c.json({
          secret: c.get('secret') ?? null,
          query: c.req.query('q') ?? null,
          params: c.req.params(),
        })
      )
      app.onError(async (error, c) => {
        if (error.message === 'handler-fails') {
          throw new Error('secondary')
        }
        if (error.message === 'handler-rejects') {
          await Promise.resolve()
          throw new Error('secondary async')
        }
        c.header('x-error', 'handled')
        return c.json({ error: error.message }, 500)
      })
      await exercise(app, async (send) => {
        for (const [path, message] of [
          ['/sync', 'sync'],
          ['/async', 'async'],
          ['/twice', 'next() called multiple times'],
        ]) {
          await assertResponse(await send(path!), 500, JSON.stringify({ error: message }), {
            'x-boundary': 'yes',
            'x-error': 'handled',
            'content-type': 'application/json',
          })
        }
        for (const path of ['/handler-fails', '/handler-rejects']) {
          await assertResponse(await send(path), 500, 'Internal Server Error', {
            'x-boundary': 'yes',
            'x-error': null,
            'content-type': 'text/plain',
          })
        }
        await assertResponse(
          await send('/clean'),
          200,
          '{"secret":null,"query":null,"params":{}}',
          { 'x-boundary': 'yes', 'x-error': null, 'content-type': 'application/json' }
        )
      })
    })

    test('custom 404, wildcard parameters, middleware order and short circuit', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.set('order', 'global>')
        await next()
        c.header('x-order', `${c.get('order')}<global`)
      })
      app.use('/files', async (c, next) => {
        c.set('order', `${c.get('order')}scoped>`)
        await next()
        c.set('order', `${c.get('order')}<scoped`)
      })
      app.get('/files/*', (c) => {
        c.set('order', `${c.get('order')}handler`)
        return c.text(c.req.param('*') ?? '')
      })
      app.use('/private', (c) => {
        c.header('x-denied', 'yes')
        return c.text('Denied', 403)
      })
      app.get('/private', () => {
        throw new Error('short circuit failed')
      })
      app.onNotFound((c) => c.json({ missing: c.req.path }, 404))
      await exercise(app, async (send) => {
        await assertResponse(await send('/files/a/b'), 200, 'a/b', {
          'x-order': 'global>scoped>handler<scoped<global',
          'content-type': 'text/plain',
        })
        await assertResponse(await send('/private'), 403, 'Denied', {
          'x-denied': 'yes',
          'x-order': 'global><global',
          'content-type': 'text/plain',
        })
        await assertResponse(await send('/missing'), 404, '{"missing":"/missing"}', {
          'x-order': 'global><global',
          'content-type': 'application/json',
        })
      })
    })

    test('overlapping requests and subsequent reuse isolate variables, params, query, headers and native request', async () => {
      const app = new Photon()
      let entered = 0
      let release!: () => void
      const barrier = new Promise<void>((resolve) => {
        release = resolve
      })
      app.get('/parallel/:id', async (c) => {
        const id = c.req.param('id')!
        c.set('id', id)
        c.header('x-id', id)
        c.req.query('q')
        if (++entered === 8) {
          release()
        }
        await barrier
        const native = c.native as { request: Request }
        return c.json({
          id: c.get('id'),
          param: c.req.param('id'),
          query: c.req.query('q'),
          native: new URL(native.request.url).pathname,
        })
      })
      app.get('/clean', (c) => {
        const native = c.native as { request: Request }
        return c.json({
          id: c.get('id') ?? null,
          params: c.req.params(),
          query: c.req.query('q') ?? null,
          native: new URL(native.request.url).pathname,
        })
      })
      await exercise(app, async (send) => {
        await Promise.all(
          Array.from({ length: 8 }, async (_, i) => {
            const id = String(i)
            await assertResponse(
              await send(`/parallel/${id}?q=q${id}`),
              200,
              JSON.stringify({ id, param: id, query: `q${id}`, native: `/parallel/${id}` }),
              { 'x-id': id, 'content-type': 'application/json' }
            )
          })
        )
        await assertResponse(
          await send('/clean'),
          200,
          '{"id":null,"params":{},"query":null,"native":"/clean"}',
          { 'x-id': null, 'content-type': 'application/json' }
        )
      })
    })
    test('fast paths bypass middleware and onError while preserving method and exact-path dispatch', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.header('x-security', 'standard-only')
        await next()
      })
      app.onError((_error, c) => c.text('standard error', 503))
      app.fast.get('/fast', () => new Response('fast GET', { headers: { 'x-fast': 'yes' } }))
      app.fast.post(
        '/fast',
        () => new Response('fast POST', { status: 201, headers: { 'x-fast': 'yes' } })
      )
      app.put('/fast', (c) => c.text('standard PUT', 202))
      app.fast.head(
        '/fast',
        () => new Response(null, { status: 204, headers: { 'x-fast': 'head' } })
      )
      app.options('/fast', (c) => c.text('standard OPTIONS'))
      app.fast.get('/literal/:id', () => new Response('literal', { headers: { 'x-fast': 'yes' } }))
      app.get('/literal/value', (c) => c.text('standard literal'))
      app.fast.get('/fast-sync', () => {
        throw new Error('private sync detail')
      })
      app.fast.get('/fast-async', async () => {
        await Promise.resolve()
        throw new Error('private async detail')
      })
      await exercise(app, async (send) => {
        await assertResponse(await send('/fast'), 200, 'fast GET', {
          'x-fast': 'yes',
          'x-security': null,
        })
        await assertResponse(await send('/fast', { method: 'POST' }), 201, 'fast POST', {
          'x-fast': 'yes',
          'x-security': null,
        })
        await assertResponse(await send('/fast', { method: 'PUT' }), 202, 'standard PUT', {
          'x-fast': null,
          'x-security': 'standard-only',
        })
        await assertResponse(await send('/fast', { method: 'DELETE' }), 404, 'Not Found', {
          'x-fast': null,
          'x-security': 'standard-only',
        })
        await assertResponse(await send('/literal/value'), 200, 'standard literal', {
          'x-fast': null,
          'x-security': 'standard-only',
        })
        await assertResponse(await send('/fast', { method: 'HEAD' }), 204, '', {
          'x-fast': 'head',
          'x-security': null,
        })
        await assertResponse(await send('/fast', { method: 'OPTIONS' }), 200, 'standard OPTIONS', {
          'x-fast': null,
          'x-security': 'standard-only',
        })
        for (const path of ['/fast-sync', '/fast-async']) {
          await assertResponse(await send(path), 500, 'Internal Server Error', {
            'content-type': 'text/plain',
            'x-security': null,
            'x-fast': null,
          })
        }
        await assertResponse(await send('/fast'), 200, 'fast GET', {
          'x-fast': 'yes',
          'x-security': null,
        })
      })
    })
    test('root mount and route alias match empty wildcard and preserve child 404', async () => {
      const app = new Photon()
      const child = new Photon()
      child.get('/', (c) => c.text('child root'))
      child.get('/files/*', (c) => c.text(c.req.param('*') ?? 'missing'))
      child.onNotFound((c) => c.text('child missing', 404))
      app.route('/', child)
      await exercise(app, async (send) => {
        await assertResponse(await send('/'), 200, 'child root', { 'content-type': 'text/plain' })
        await assertResponse(await send('/files'), 200, '', { 'content-type': 'text/plain' })
        await assertResponse(await send('/unknown'), 404, 'child missing', {
          'content-type': 'text/plain',
        })
      })
    })
    test('mutating one request params cannot poison a cached route match', async () => {
      const app = new Photon()
      app.get('/cached/:id', (c) => {
        const original = c.req.param('id')
        if (c.req.header('x-mutate')) {
          c.req.params().id = 'poison'
        }
        return c.json({ original, current: c.req.param('id') })
      })
      await exercise(app, async (send) => {
        await assertResponse(
          await send('/cached/real', { headers: { 'x-mutate': 'yes' } }),
          200,
          '{"original":"real","current":"poison"}',
          { 'content-type': 'application/json' }
        )
        await assertResponse(
          await send('/cached/real'),
          200,
          '{"original":"real","current":"real"}',
          { 'content-type': 'application/json' }
        )
      })
    })

    test('raw responses retain pending headers and middleware can replace the response', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.header('x-before', 'yes')
        await next()
        c.header('x-after', 'yes')
        if (c.req.path === '/replace') {
          c.res = new Response('replacement', { status: 202 })
        }
      })
      app.get(
        '/raw',
        () => new Response('raw', { status: 201, headers: { 'content-type': 'text/custom' } })
      )
      app.get('/replace', (c) => c.text('original'))
      app.get('/redirect', () => Response.redirect('https://example.com/', 302))
      await exercise(app, async (send) => {
        await assertResponse(await send('/raw'), 201, 'raw', {
          'content-type': 'text/custom',
          'x-before': 'yes',
          'x-after': 'yes',
        })
        await assertResponse(await send('/replace'), 202, 'replacement', {
          'x-before': 'yes',
          'x-after': 'yes',
        })
        await assertResponse(await send('/redirect', { redirect: 'manual' }), 302, '', {
          location: 'https://example.com/',
          'x-before': 'yes',
          'x-after': 'yes',
        })
      })
    })

    test('after middleware can set headers on an immutable raw response', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        await next()
        c.header('x-after', 'yes')
      })
      app.get('/', () => Response.redirect('https://example.com/', 302))
      await exercise(app, async (send) => {
        await assertResponse(await send('/', { redirect: 'manual' }), 302, '', {
          location: 'https://example.com/',
          'x-after': 'yes',
        })
      })
    })

    test('concurrent repeated next waits for downstream work before error handling and reuse', async () => {
      const app = new Photon()
      app.get(
        '/duplicate',
        async (_c, next) => {
          await Promise.all([next(), next()])
        },
        async (c) => {
          await Bun.sleep(5)
          c.set('finished', true)
          return c.text('discard')
        }
      )
      app.onError((error, c) =>
        c.json({ error: error.message, finished: c.get('finished') ?? false }, 500)
      )
      app.get('/clean', (c) => c.json({ finished: c.get('finished') ?? false }))
      await exercise(app, async (send) => {
        await assertResponse(
          await send('/duplicate'),
          500,
          '{"error":"next() called multiple times","finished":true}',
          { 'content-type': 'application/json' }
        )
        await assertResponse(await send('/clean'), 200, '{"finished":false}', {
          'content-type': 'application/json',
        })
      })
    })

    if (transport === 'socket') {
      test('server port is released even when a client assertion fails', async () => {
        const app = new Photon()
        app.get('/', (c) => c.text(new URL(c.req.url).port))
        let port = 0
        await expect(
          exercise(app, async (send) => {
            port = Number(await (await send('/')).text())
            throw new Error('intentional assertion failure')
          })
        ).rejects.toThrow('intentional assertion failure')
        expect(port).toBeGreaterThan(0)
        const replacement = Bun.serve({
          port,
          hostname: '127.0.0.1',
          fetch: () => new Response('released'),
        })
        try {
          await assertResponse(await fetch(replacement.url), 200, 'released', {})
        } finally {
          await replacement.stop(true)
        }
      })
    }

    test('middleware recovery waits for active next work before Context reuse', async () => {
      const app = new Photon()
      let finish!: () => void
      let entered!: () => void
      const started = new Promise<void>((resolve) => {
        entered = resolve
      })
      const barrier = new Promise<void>((resolve) => {
        finish = resolve
      })
      app.use(async (c, next) => {
        try {
          await next()
        } catch {
          return c.json({ recovered: c.get('finished') ?? false }, 409)
        }
      })
      app.get(
        '/recover',
        async (_c, next) => {
          await Promise.all([next(), next()])
        },
        async (c) => {
          entered()
          await barrier
          c.set('finished', true)
          c.header('x-downstream', 'finished')
          return c.text('discard')
        }
      )
      app.get('/clean', (c) => c.json({ finished: c.get('finished') ?? false }))
      await exercise(app, async (send) => {
        const recovering = send('/recover')
        await started
        try {
          await assertResponse(await send('/clean'), 200, '{"finished":false}', {
            'x-downstream': null,
            'content-type': 'application/json',
          })
        } finally {
          finish()
        }
        await assertResponse(await recovering, 409, '{"recovered":true}', {
          'x-downstream': 'finished',
          'content-type': 'application/json',
        })
        await assertResponse(await send('/clean'), 200, '{"finished":false}', {
          'x-downstream': null,
          'content-type': 'application/json',
        })
      })
    })

    test('raw response adoption preserves multiple pending Set-Cookie values once', async () => {
      const app = new Photon()
      app.use(async (c, next) => {
        c.header('set-cookie', 'session=one; Path=/; HttpOnly', { append: true })
        c.header('set-cookie', 'csrf=two; Path=/', { append: true })
        await next()
      })
      app.use(async (_c, next) => {
        await next()
      })
      app.get('/', () => new Response('cookies', { headers: { 'content-type': 'text/plain' } }))
      await exercise(app, async (send) => {
        const response = await send('/')
        expect(response.headers.getSetCookie()).toEqual([
          'session=one; Path=/; HttpOnly',
          'csrf=two; Path=/',
        ])
        await assertResponse(response, 200, 'cookies', { 'content-type': 'text/plain' })
      })
    })
  })
}

test('fetch awaits its per-dispatch Context observer before pre-existing middleware', async () => {
  const app = new Photon<{ owner: string }>()
  app.use(async (c, next) => {
    c.header('x-owner', c.get('owner'))
    await next()
  })
  app.get('/', (c) => c.text(c.get('owner')))
  const request = new Request('http://localhost/')
  const responses = await Promise.all(
    ['first', 'second'].map((owner) =>
      app.fetch(request, undefined, async (c) => {
        await Bun.sleep(owner === 'first' ? 2 : 1)
        c.set('owner', owner)
      })
    )
  )
  expect(await Promise.all(responses.map((r) => r.text()))).toEqual(['first', 'second'])
  expect(responses.map((r) => r.headers.get('x-owner'))).toEqual(['first', 'second'])
})

test('observer failures use onError and release pooled contexts for the next dispatch', async () => {
  const app = new Photon<{ owner?: string }>()
  let handlers = 0
  app.get('/', (c) => {
    handlers++
    return c.text(c.get('owner') ?? 'fresh')
  })
  app.onError((error, c) => c.text(`${error.message}:${c.get('owner')}`, 503))
  for (const asynchronous of [false, true]) {
    const response = await app.fetch(new Request('http://localhost/'), undefined, (c) => {
      c.set('owner', 'observed')
      if (asynchronous) {
        return Promise.reject(new Error('observer'))
      }
      throw new Error('observer')
    })
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('observer:observed')
  }
  expect(handlers).toBe(0)
  app.onError(() => {
    throw new Error('renderer failed')
  })
  expect(
    (
      await app.fetch(new Request('http://localhost/'), undefined, () => {
        throw new Error('observer')
      })
    ).status
  ).toBe(500)
  expect(await (await app.fetch(new Request('http://localhost/'))).text()).toBe('fresh')
  expect(handlers).toBe(1)
})

test('fast routes bypass the per-dispatch Context observer', async () => {
  const app = new Photon()
  app.fast.get('/', () => new Response('fast'))
  let observed = false
  const response = await app.fetch(new Request('http://localhost/'), undefined, () => {
    observed = true
  })
  expect(await response.text()).toBe('fast')
  expect(observed).toBe(false)
})
