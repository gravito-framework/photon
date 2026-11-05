import { describe, expect, it } from 'bun:test'
import { Photon } from '../src'
import { HttpException } from '../src/http-exception'
import { type JwtVariables, jwt, sign } from '../src/jwt'
import { type HtmxVariables, htmxMiddleware } from '../src/middleware/htmx'

describe('independent public API', () => {
  it('preserves typed variables through middleware, native routes and fluent fast registration', async () => {
    interface Variables {
      user: string
    }
    const app = new Photon<Variables>()
    app.use(async (c, next) => {
      c.set('user', 'Ada')
      await next()
    })
    app.native.route('get', '/native', (c) => c.text(c.get('user')))
    app.fast.get('/fast', () => new Response('fast')).get('/', (c) => c.text(c.get('user')))
    expect(await (await app.request('/native')).text()).toBe('Ada')
    expect(await (await app.request('/')).text()).toBe('Ada')
    expect(await (await app.request('/fast')).text()).toBe('fast')
  })

  it('owns HTTP exception data without changing default error behavior, and recovers', async () => {
    const cause = new Error('cause')
    const error = new HttpException(409, {
      message: 'Conflict',
      cause,
      i18nKey: 'conflict',
      i18nParams: { id: 7 },
    })
    expect(error.status).toBe(409)
    expect(error.code).toBe('HTTP_ERROR')
    expect(error.cause).toBe(cause)
    expect(error.getLocalizedMessage((key, params) => `${key}:${params?.id}`)).toBe('conflict:7')
    const app = new Photon()
    app.get('/error', () => {
      throw error
    })
    app.get('/ok', (c) => c.text('ok'))
    expect((await app.request('/error')).status).toBe(500)
    app.onError((err, c) => c.text(err.message, err instanceof HttpException ? err.status : 500))
    expect((await app.request('/error')).status).toBe(409)
    expect(await (await app.request('/ok')).text()).toBe('ok')
  })
})

it('typed builtins write their declared slots and pooled contexts reset between requests', async () => {
  const app = new Photon<HtmxVariables & JwtVariables>()
  const secret = 'photon-typed-builtin-secret-for-test'
  app.use(htmxMiddleware(), jwt({ secret }))
  app.get('/', (c) =>
    c.json({ htmx: c.get('htmx'), boosted: c.get('htmx.boosted'), sub: c.get('jwtPayload')?.sub })
  )
  const token = await sign({ sub: 'Ada' }, secret)
  const first = await app.request('/', {
    headers: { 'HX-Request': 'true', 'HX-Boosted': 'true', Authorization: `Bearer ${token}` },
  })
  expect(await first.json()).toEqual({ htmx: true, boosted: true, sub: 'Ada' })
  expect(await (await app.request('/')).json()).toEqual({ htmx: false })
})
