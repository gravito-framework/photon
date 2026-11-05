/** Identical workload copied into each source tree by benchmark.ts. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Photon } from '../src/photon'

const [scenario, transport, roundText] = process.argv.slice(2)
assert(['standard', 'middleware', 'fast'].includes(scenario ?? ''))
assert(['in-process', 'socket'].includes(transport ?? ''))
const warmup = transport === 'in-process' ? 20000 : 2000
const iterations = transport === 'in-process' ? 100000 : 10000
const app = new Photon()
let middlewareCalls = 0
if (scenario === 'middleware') {
  app.useGlobal(async (context, next) => {
    middlewareCalls++
    await next()
    context.header('x-benchmark', 'middleware')
  })
}
if (scenario === 'fast') {
  app.fast.get('/health', () => new Response('OK'))
} else {
  app.get('/health', (context) => context.text('OK'))
}

const server =
  transport === 'socket'
    ? Bun.serve(app.serveConfig({ hostname: '127.0.0.1', port: 0 }))
    : undefined
const url = server ? `http://127.0.0.1:${server.port}/health` : 'http://localhost/health'
const request = () => (server ? fetch(url) : app.fetch(new Request(url)))
async function checkedRequest() {
  const response = await request()
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'OK')
  if (scenario === 'middleware') {
    assert.equal(response.headers.get('x-benchmark'), 'middleware')
  }
}
try {
  // Fail before timing if the selected engine/path does not implement the workload.
  await checkedRequest()
  if (scenario === 'middleware') {
    assert.equal(middlewareCalls, 1)
  }
  for (let i = 0; i < warmup; i++) {
    await checkedRequest()
  }
  const latencies: number[] = []
  let errors = 0
  const started = performance.now()
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await checkedRequest()
    } catch {
      errors++
    }
    latencies.push(performance.now() - start)
  }
  const elapsedMs = performance.now() - started
  latencies.sort((a, b) => a - b)
  const percentile = (p: number) => latencies[Math.ceil(iterations * p) - 1]
  console.log(
    JSON.stringify({
      scenario,
      transport,
      round: Number(roundText),
      warmup,
      iterations,
      concurrency: 1,
      elapsedMs,
      requestsPerSecond: (iterations / elapsedMs) * 1000,
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
      errors,
      middlewareCalls,
      adapter: app.native.constructor.name,
      fetchImplementationSha256: createHash('sha256')
        .update(app.native.fetch.toString())
        .digest('hex'),
    })
  )
  if (errors) {
    process.exitCode = 1
  }
} finally {
  await server?.stop(true)
}
