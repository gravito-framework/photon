import { type GravitoMiddleware, Photon } from '@gravito/photon'
import { otelMiddleware } from '@gravito/photon/middleware/otel'
import { rateLimit, rateLimiter } from '@gravito/photon/middleware/ratelimit'
import {
  createHeaderGate,
  requireHeaderToken,
  securityHeaders,
} from '@gravito/photon/middleware/security'

interface Variables {
  user: { id: string }
  optional?: string
}
const app = new Photon<Variables>()
const init: GravitoMiddleware<Variables> = async (c, next) => {
  c.set('user', { id: '42' })
  await next()
}
app.use(init)
app.useGlobal(init)
app.useScoped('/scope', '/child', init)
for (const method of ['post', 'put', 'delete', 'patch', 'head', 'options'] as const) {
  app[method]('/typed', (c) => c.text(c.get('user').id))
}
const variable: string = app.native.createContext(new Request('http://localhost')).get('user').id
void variable
app.get('/', (c) => c.text(c.get('user').id))
app.onError((_error, c) => c.text(c.get('optional') ?? 'error'))
app.onNotFound((c) => c.text(c.get('optional') ?? 'missing', 404))
app.fast.get('/health', () => new Response('ok')).get('/chain', (c) => c.text(c.get('user').id))
app.native.route('get', '/native', (c) => c.text(c.get('user').id))
app.router.add('get', '/router', [(c) => c.text(c.get('user').id)])
app.router.where('id', /^\d+$/)
const child = new Photon<{ count: number }>()
child.use(async (c, next) => {
  c.set('count', 1)
  await next()
})
child.get('/', (c) => c.json(c.get('count')))
app.route('/child', child)
const config = app.serveConfig({ port: 0, hostname: '127.0.0.1' })
const server = Bun.serve(config)
await server.stop(true)
Bun.serve(new Photon().serveConfig({ unix: '/tmp/photon-type-fixture.sock' }))

// Factory callbacks use the application's map; callback-free factories compose freely.
const pure: GravitoMiddleware<{}> = async (_c, next) => {
  await next()
}
const configured = new Photon<Variables>()
configured.use(pure)
configured.use(
  rateLimit<Variables>({
    maxRequests: 5,
    windowMs: 1000,
    keyGenerator: (c) => c.get('user').id,
    skip: (c) => c.get('optional') === 'skip',
    onRateLimitExceeded: (c) => {
      c.set('user', { id: 'limited' })
      return c.text('limited')
    },
  })
)
configured.use(rateLimiter.moderate())
configured.use(rateLimiter.strict<Variables>({ keyGenerator: (c) => c.get('user').id }))
configured.use(otelMiddleware<Variables>({ spanNameResolver: (c) => c.get('user').id }))
configured.use(
  securityHeaders<Variables>({ contentSecurityPolicy: (c) => c.get('optional') ?? false })
)
configured.use(requireHeaderToken<Variables>({ token: (c) => c.get('optional') }))
configured.get('/gate', async (c) =>
  c.json(await createHeaderGate<Variables>({ token: (c) => c.get('user').id })(c))
)
