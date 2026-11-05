# Independent Photon: unreleased major migration

Photon owns its Bun HTTP engine. It no longer installs or imports Gravito core/resilience, including source development and tests. This is still an intermediate major-version migration; do not publish it. HTTP correctness, performance/release rehearsal and Gravito integration have later stories.

## Complete previous export map

Paths below are relative to `@gravito/photon`, compared with commit `ae0db3aa40ff91435065a8e739d6a027339eb8fa`. `scripts/fixtures/public.ts` covers every retained path at runtime and in a strict consumer; intentionally rejected imports are in `scripts/fixtures/rejections.json`.

| Previous path | Disposition and current contract |
| --- | --- |
| `.` | Retained: `Photon`, local `GravitoContext`, `GravitoHandler`, `GravitoMiddleware`, `GravitoErrorHandler`, `GravitoNotFoundHandler`. Adds `GravitoVariables`, `GravitoNext`, fast-handler and serve-config types. Old middleware exports move to the subpaths below. |
| `./native` | Replaced in place with independent SSE, streaming and WebSocket helpers plus local context/middleware/next types. `NativePhoton` is removed: it was the core engine constructor, not an alias for Photon. Use `Photon` for an independent application; framework identity belongs to the deferred integration. |
| `./adapter` | Moved to deferred Gravito integration. Import is intentionally rejected. `PhotonAdapter`, adapter helpers and framework type guards are preserved in the private regression fixture; final package name/exports remain undecided. |
| `./client` | Retained Hono `hc` compatibility export. Its RPC type contract is for Hono applications, not the independent Photon class. |
| `./logger` | Retained native `logger`. |
| `./jwt` | Retained `jwt`, `sign`, `verify`, `decode`, `verifyWithJwks` and their option/payload/header types. |
| `./middleware/binary` | Retained `binaryMiddleware`; CBOR dependency is declared. |
| `./middleware/htmx` | Retained `htmxMiddleware`. |
| `./middleware/ratelimit` | Retained rate-limit middleware, stores, presets and types. |
| `./middleware/ratelimit-redis` | Retained `RedisStore`; caller supplies a client implementing the declared Redis command interface. No Redis client package or server is automatically provided. |
| `./middleware/otel` | Retained `otelMiddleware` and `OtelMiddlewareConfig`; optional `@opentelemetry/api` peer. Without it the middleware is a no-op. Install it explicitly to enable OTel. |
| `./middleware/streaming` | Retained native streaming helpers, including `stream`. |
| `./middleware/security` | Retained CORS, CSRF, body limits, security headers, header-token gates and throttling, with their types. |
| `./middleware/body` | Retained alias for `bodySizeLimit` and its options. |
| `./middleware/cors` | Retained alias for `cors` and its types. |
| `./middleware/rate-limit` | Retained alias for the full `ratelimit` module. |
| `./http-exception` | Replaced core re-export with Photon-owned `HttpException` and `ExceptionOptions`. Constructor `(status, options)`, message/cause/status/code, localization fields and `getLocalizedMessage` remain. Core constructor identity and `instanceof GravitoException` do not. |
| `./router/reg-exp-router` | Retained Hono `Router<T>` type only; runtime namespace is intentionally empty. Does not export a native router constructor. |
| `./router/trie-router` | Retained the same Hono `Router<T>` type-only contract. |
| `./adapter/cloudflare` | Retained Hono compatibility exports. Type/import checks under Bun are not Cloudflare deployment verification or native Photon support. |
| `./adapter/vercel` | Retained Hono compatibility exports. A Hono handler request is exercised under Bun; Vercel deployment is not verified. |
| `./adapter/deno` | Retained Hono compatibility exports. Types require Deno ambient declarations (Deno itself or explicit `@types/deno`, fixture uses 2.7.0). Under Bun, importing this module currently rejects with `ReferenceError: Deno is not defined`; the rejection is asserted. Deno runtime execution is not verified. |

## Previous root symbols

The root remains limited to the engine and HTTP types; the following replacements are intentional major-version changes. Associated exported types move with the functions.

| Previous root symbol(s) | Replacement |
| --- | --- |
| `binaryMiddleware` | `./middleware/binary` |
| `htmxMiddleware` | `./middleware/htmx` |
| `rateLimit`, `MemoryStore`, `createRateLimiter`, `rateLimiter`, `RateLimitConfig`, `RateLimitStore`, `RateLimitState` | `./middleware/ratelimit` |
| `RedisStore` | `./middleware/ratelimit-redis` |
| `bodySizeLimit`, `BodySizeLimitOptions` | `./middleware/body` or `./middleware/security` |
| `cors`, `CorsOptions`, `CorsOrigin` | `./middleware/cors` or `./middleware/security` |
| `csrfProtection`, `getCsrfToken`, `CsrfOptions`, `CsrfCookieOptions` | `./middleware/security` |
| `securityHeaders`, `SecurityHeadersOptions`, `HstsOptions` | `./middleware/security` |
| `createHeaderGate`, `requireHeaderToken`, `HeaderTokenGateOptions`, `RequireHeaderTokenOptions` | `./middleware/security` |
| `throttleRequests`, `ThrottleRequestsOptions` | `./middleware/security` |
| `asHonoMiddleware` | Removed. It was an identity function, not a Hono adapter. Pass Photon middleware directly to `app.use`. |

`./native` retains `createSSEResponse`, `SSEStreamingApi`, `StreamingApi`, `streamFromGenerator`, `streamJSONLines`, `streamText`, `streamWithHandler`, `defineWSHandler` and the previously exported SSE/streaming/WebSocket types. `NativePhoton` is the sole removed runtime symbol there. The `Gravito*` type names now describe Photon-owned types, without framework services.

## Variables, routers and server configuration

`new Photon<Variables>()` preserves declared variable keys and value types through HTTP methods, middleware, error handlers, `native`, router handlers and fluent fast calls. Ordinary interfaces are supported; optional properties remain optional. Declaring a required variable does not initialize it: application middleware must set it before reading it. Framework `RequestScope`, `scoped`, container services and named-route URL generation are absent. A mounted child receives a new Context; parent variables are not inherited.

Writable middleware must use a compatible variable map. A middleware that can write `string | number` cannot attach to a context that promises `string`. `set` also rejects an uncorrelated union of keys and values. Variable-free middleware can use `GravitoMiddleware<{}>`; factories infer HTTP-only capabilities when no Context callback is supplied.

For typed applications using JWT or HTMX, include their declared slots. JWT exports `JwtVariables` (`jwtPayload?`); HTMX exports `HtmxVariables` (`htmx` plus optional conditional header slots). Default `new Photon()` remains dynamic and accepts these middleware without a type argument. A narrower incompatible destination, such as `htmx: true` or `jwtPayload: string`, is rejected.

```ts
import { Photon } from '@gravito/photon'
import { jwt, type JwtVariables } from '@gravito/photon/jwt'
import { htmxMiddleware, type HtmxVariables } from '@gravito/photon/middleware/htmx'
import { rateLimit } from '@gravito/photon/middleware/ratelimit'

type Variables = { user: string } & JwtVariables & HtmxVariables
const app = new Photon<Variables>()
app.use(async (c, next) => { c.set('user', 'Ada'); await next() })
app.use(jwt({ secret: 'replace-with-your-secret' }), htmxMiddleware())
app.use(rateLimit<Variables>({ maxRequests: 100, windowMs: 60000, keyGenerator: c => c.get('user') }))
```

Context callbacks in rate-limit/presets, OTel, security headers and header-token gates carry the same variable generic. Supply that generic for stored callback configurations; a callback's write access is checked just like normal middleware. Callback-free factories retain their simple signatures. The runtime middleware behavior is unchanged.

`app.router` is the existing local radix router, now typed. Direct mutations remain an advanced escape hatch that bypasses adapter snapshot checks; prefer `app.get` and the other route methods. The Hono router type-only subpaths do not describe this router.

`Bun.serve(app.serveConfig({ port: 3000 }))` typechecks without assertions. TCP and Unix options follow the installed Bun declarations. `fetch`, `routes` and `websocket` are owned by Photon and rejected as caller options. Fast routes still bypass middleware and the standard error handler; broader fast-path semantics belong to the HTTP-correctness story. `next()` exposes its existing runtime result as `Promise<Response | void>`.

A Photon `HttpException` does not automatically select the HTTP response status. The default error response remains 500. To map its status, use an explicit `onError` handler, for example `app.onError((error, c) => c.text(error.message, error instanceof HttpException ? error.status : 500))`.

## Historical framework coverage and verification

Framework-only material moved without deleting historical behavior tests:

- `packages/photon/src/adapter/{PhotonAdapter,index,photon-types}.ts` → `examples/photon-framework-regression/src/adapter/`.
- `packages/photon/src/middleware/circuit-breaker.ts` and its two test files → the same relative paths under `examples/photon-framework-regression/`.
- Original `native.ts` and `http-exception.ts` → the fixture's `src/`; historical exception identity and Beam assertions → its `tests/exports.test.ts`.

The fixture is private and not the future integration package. `bun run --cwd examples/photon-framework-regression test` retains the 19 moved tests. Passing them does not establish A7, a supported core pairing or framework Context integration. The later integration story owns those contracts.

`bun run test:source-isolation` copies the actual Photon package outside the repository without dist/node_modules, then installs, builds, typechecks and tests it. `bun run test:standalone` clean-builds and packs it, checks the dependency tree, links and declarations, verifies every public entry, asserts invalid types and runs socket HTTP contracts. Both require Bun 1.4.4. The consumer explicitly installs TypeScript 5.9.3, bun-types 1.3.10 and Deno types only for the Deno compatibility type check; root typing needs no Deno or OTel ambient declarations.

Rollback is limited to this story's API/fixture/relocation/dependency diff. Restore the preserved Story 06 checkpoint, not the whole worktree. Keep the unrelated Bun 1.4.4 pins and earlier changes.

## Story08 HTTP behavior contracts

`bun run test:contracts` builds and packs the current package, installs it outside the
repository with explicit TypeScript and Bun types, typechecks with `strict` and
`skipLibCheck=false`, and runs the same HTTP suite through `request`, `fetch`, and
real `Bun.serve(app.serveConfig({ port: 0 }))` sockets. Servers close in `finally`,
including assertion failures. This is a Bun 1.4.4 contract, not a new platform claim.

- Standard dispatch preserves Context headers on returned raw/mounted responses,
  default 404s and fallback 500s. Explicit response headers take precedence over
  pending headers with the same name; multiple pending `Set-Cookie` values are
  preserved individually without duplication; `c.header()` after `await next()` can overwrite
  them. A returned response takes precedence over an implicit `c.res`; middleware
  that returns nothing may replace `c.res`. Default 404 is available while middleware
  unwinds, with `text/plain` content type.
- Sync throws, async rejections and repeated `next()` calls reach `onError`.
  If it throws/rejects, the response is `500`, `text/plain`, `Internal Server Error`.
  Already-set Context headers remain. Code after a rejected `await next()` does not
  run; use `finally` for cleanup. Middleware must await/return its `next()` work. Concurrent repeated `next()`
  waits for already-started downstream work before error handling and pool release,
  including recovery by outer middleware. Each handler settles its own `next()` calls
  before control returns to its caller.
- Root mounts now match `/`; mount prefixes preserve query, method and body, and
  `/api` does not match `/apix`. Root wildcard matching follows the same fallback
  rules as other paths.
- Pooled Context state is valid only during the awaited request lifecycle. Capture
  needed values before asynchronous background/stream work. `native.request` now
  refers to the current request. Mutable request params no longer poison the router
  cache or another request; variables, params, query, headers and response state are
  isolated across concurrent requests and reuse.
- Fast paths match **exact method and literal pathname** and bypass that application's
  Context, middleware (including security middleware), and `onError`. Parent middleware
  still runs when a child application is mounted in a standard route. Native GET
  offload now checks method/path and falls back to Photon for other methods; paths
  containing `:` or `*` remain literal and use the fetch dispatcher.
- **Fast error behavior changes:** synchronous throws and rejected fast handlers now
  produce a sanitized `500`, `text/plain`, `Internal Server Error` consistently in
  `request`, `fetch` and `serveConfig` sockets. They no longer escape as rejected
  in-process requests or reach Bun's `error` callback. Handle errors inside the fast
  handler if a custom response is required. Use standard routes when Context-based
  error handling or security middleware is required.

Rollback is the Story08-only diff; preserve the independent engine/API migration
from Stories06–07 and the existing Bun pins. No intermediate release is authorized.
