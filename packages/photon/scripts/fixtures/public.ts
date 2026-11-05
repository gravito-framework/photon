import assert from 'node:assert/strict'
import { Photon } from '@gravito/photon'
import * as cloudflare from '@gravito/photon/adapter/cloudflare'
import type * as deno from '@gravito/photon/adapter/deno'
import * as vercel from '@gravito/photon/adapter/vercel'
import { hc } from '@gravito/photon/client'
import { HttpException } from '@gravito/photon/http-exception'
import { decode, jwt, sign, verify, verifyWithJwks } from '@gravito/photon/jwt'
import { logger } from '@gravito/photon/logger'
import { binaryMiddleware } from '@gravito/photon/middleware/binary'
import { bodySizeLimit as bodyAlias } from '@gravito/photon/middleware/body'
import { cors as corsAlias } from '@gravito/photon/middleware/cors'
import { type HtmxVariables, htmxMiddleware } from '@gravito/photon/middleware/htmx'
import { otelMiddleware } from '@gravito/photon/middleware/otel'
import { rateLimit as rateLimitAlias } from '@gravito/photon/middleware/rate-limit'
import { MemoryStore, rateLimit, rateLimiter } from '@gravito/photon/middleware/ratelimit'
import { RedisStore } from '@gravito/photon/middleware/ratelimit-redis'
import {
  bodySizeLimit,
  cors,
  createHeaderGate,
  csrfProtection,
  getCsrfToken,
  requireHeaderToken,
  securityHeaders,
  throttleRequests,
} from '@gravito/photon/middleware/security'
import { stream } from '@gravito/photon/middleware/streaming'
import * as native from '@gravito/photon/native'
import type { Router as RegExpRouter } from '@gravito/photon/router/reg-exp-router'
import * as regexp from '@gravito/photon/router/reg-exp-router'
import type { Router as TrieRouter } from '@gravito/photon/router/trie-router'
import * as trie from '@gravito/photon/router/trie-router'
import { Hono } from 'hono'

// Compile the actual Hono compatibility contracts; these are not Photon adapters.
const hono = new Hono().get('/', (c) => c.text('compat'))
const rpc = hc<typeof hono>('http://localhost', {
  fetch: (req: RequestInfo | URL, init?: RequestInit) => hono.request(req, init),
})
assert.equal(await (await rpc.index.$get()).text(), 'compat')
assert.equal(typeof cloudflare.handle(hono), 'function')
assert.equal(
  typeof cloudflare.handleMiddleware(async (_c, next) => {
    await next()
  }),
  'function'
)
assert.equal(typeof cloudflare.serveStatic({ root: '.' }), 'function')
const denoOptions: Parameters<typeof deno.serveStatic>[0] = { root: '.' }
assert.equal(denoOptions.root, '.')
// This Hono compatibility entry requires Deno even at import time.
await assert.rejects(() => import('@gravito/photon/adapter/deno'), {
  name: 'ReferenceError',
  message: 'Deno is not defined',
})
assert.equal(typeof vercel.getConnInfo, 'function')
assert.equal(await (await vercel.handle(hono)(new Request('http://localhost/'))).text(), 'compat')
const routerTypeIdentity = (router: RegExpRouter<string>): TrieRouter<string> => router
assert.equal(typeof routerTypeIdentity, 'function')
assert.deepEqual(Object.keys(regexp), [])
assert.deepEqual(Object.keys(trie), [])
assert.equal(bodyAlias, bodySizeLimit)
assert.equal(corsAlias, cors)
assert.equal(rateLimitAlias, rateLimit)
assert.equal(typeof rateLimiter, 'object')
assert.equal(typeof MemoryStore, 'function')
assert.equal(typeof getCsrfToken, 'function')
assert.equal(typeof csrfProtection(), 'function')
assert.equal(typeof createHeaderGate, 'function')
assert.equal(typeof throttleRequests, 'function')
assert.equal(typeof jwt({ secret: 'fixture' }), 'function')
assert.equal(typeof verifyWithJwks, 'function')
const secret = 'photon-fixture-secret-key-32-bytes-long'
const token = await sign({ sub: 'fixture' }, secret)
assert.equal((await verify(token, secret)).sub, 'fixture')
assert.equal(decode(token).payload.sub, 'fixture')
await assert.rejects(() => verify('invalid.token', secret))
assert.equal((await verify(token, secret)).sub, 'fixture')
const redis = new RedisStore(
  { eval: async () => [1, 1000], del: async () => 1, get: async () => '1', pttl: async () => 1000 },
  { maxRequests: 3, windowMs: 1000 }
)
assert.equal((await redis.increment('key')).count, 1)
assert.equal(typeof native.defineWSHandler, 'function')
assert.equal(typeof native.SSEStreamingApi, 'function')
assert.equal(typeof native.StreamingApi, 'function')
assert.equal(typeof native.createSSEResponse, 'function')
assert.equal('NativePhoton' in native, false)

const app = new Photon<{ user: string } & HtmxVariables>()
app.use(
  logger(),
  binaryMiddleware(),
  htmxMiddleware(),
  otelMiddleware(),
  securityHeaders(),
  cors(),
  bodySizeLimit(1024)
)
app.use(async (c, next) => {
  c.set('user', 'Ada')
  await next()
})
app.get('/', (c) => c.text(c.get('user')))
app.get('/stream', (c) =>
  stream(c, async (writer) => {
    await writer.write('streamed')
  })
)
app.get('/gated', requireHeaderToken({ token: 'secret', headerName: 'x-token' }), (c) =>
  c.text('allowed')
)
app.get('/limited', rateLimit({ maxRequests: 1, windowMs: 1000 }), (c) => c.text('allowed'))
app.get('/error', () => {
  throw new HttpException(409, { message: 'conflict' })
})
app.onError((error, c) =>
  c.text(error.message, error instanceof HttpException ? error.status : 500)
)
assert.equal(await (await app.request('/')).text(), 'Ada')
assert.equal(await (await app.request('/stream')).text(), 'streamed')
assert.equal((await app.request('/error')).status, 409)
assert.equal((await app.request('/gated')).status, 403)
assert.equal((await app.request('/gated', { headers: { 'x-token': 'secret' } })).status, 200)
assert.equal((await app.request('/limited')).status, 200)
assert.equal((await app.request('/limited')).status, 429)
assert.equal(await (await app.request('/')).text(), 'Ada')
console.log('All public entrypoint contracts passed')
