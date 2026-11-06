# @gravito/photon

Independent HTTP routing, middleware and typed request contexts for Bun.
This is the **unpublished 3.0.0-beta.1 migration candidate**. Registry version 2.0.1
is the older Gravito wrapper and does not provide this engine. Gravito integration
is maintained in the Gravito repository; the new beta pairing still requires verification.

## Start a local HTTP API

Use Bun **1.4.4**, the runtime exercised by this release rehearsal. From this package:

```sh
bun install --ignore-scripts
bun run build
bun pm pack --destination /tmp
```

Create an empty directory outside the repository. Replace the archive path with the
filename printed by `bun pm pack`:

```sh
mkdir photon-api
cd photon-api
bun init -y
bun add /tmp/gravito-photon-3.0.0-beta.1.tgz
bun add -d typescript@5.9.3 bun-types@1.3.10
```

Save this as `app.ts`:

```ts
import { Photon } from '@gravito/photon'
import { cors } from '@gravito/photon/middleware/cors'
import { HttpException } from '@gravito/photon/http-exception'

export const app = new Photon<{ user: string }>()
app.use(cors())
app.use(async (c, next) => {
  c.set('user', 'Ada')
  c.header('x-photon', 'yes')
  await next()
})
app.get('/hello', c => c.json({ message: 'Hello', user: c.get('user') }))
app.post('/echo', async c => c.json(await c.req.json()))
app.get('/error', () => { throw new HttpException(409, { message: 'Conflict' }) })
app.onError((error, c) => c.json(
  { error: error instanceof HttpException ? error.message : 'Internal error' },
  error instanceof HttpException ? error.status : 500
))

if (import.meta.main) Bun.serve(app.serveConfig({ port: 3000 }))
```

```sh
bun app.ts
curl http://localhost:3000/hello
curl -X POST -H 'content-type: application/json' -d '{"value":42}' http://localhost:3000/echo
```

`/hello` returns `{"message":"Hello","user":"Ada"}` with `x-photon: yes`.
`/error` returns HTTP 409; unknown paths return 404. Stop the server with Ctrl-C.
Initialize required context variables in middleware before reading them. Contexts are
request-scoped; copy values needed by background work before returning.

For a strict consumer check, save `tsconfig.json`:

```json
{"compilerOptions":{"strict":true,"noEmit":true,"skipLibCheck":false,"target":"ESNext","module":"ESNext","moduleResolution":"bundler","types":["bun-types"]},"include":["app.ts"]}
```

Run `bun x --no-install tsc -p tsconfig.json`.

## Modules and behavior

JWT, logger, binary/CBOR, HTMX, streaming, rate limiting and security middleware use
explicit subpaths listed in the [migration guide](doc/INDEPENDENCE_MIGRATION.md).
The package declares its required dependencies; core and resilience are not required.
OTel is optional: install `@opentelemetry/api` to enable tracing; without it the
middleware is a no-op. Redis rate limiting needs a caller-supplied compatible client.

`app.fast.get` and other fast handlers bypass Context, middleware **including security
middleware**, and `onError`. Use standard routes for the API above. Fast-handler
errors produce a sanitized 500. Hono client/router/Cloudflare/Deno/Vercel compatibility
entries retain Hono contracts; they do not establish native Photon platform support.
Deno types require Deno ambient declarations, and its adapter import fails under Bun.
No Cloudflare, Deno or Vercel deployment has been verified.

## Verify and migrate

`bun run verify:release` runs independent source and tarball fixtures, strict public
entrypoint and README checks, HTTP contracts, publint and a package dry-run. It prints
an evidence directory containing logs, exit codes, package inventory and tarball.
It never publishes. See [release verification](doc/RELEASE.md) and
[benchmark methodology](doc/BENCHMARK.md).

The [migration guide](doc/INDEPENDENCE_MIGRATION.md) maps every old export, removed
framework feature and HTTP behavior change. Historical Gravito tests live in
`examples/photon-framework-regression`; they do not certify A7 integration.
