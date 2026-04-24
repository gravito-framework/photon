/**
 * Fast-path Performance Benchmark
 *
 * Compares standard Gravito routes vs Fast-path routes.
 * Run with: bun test packages/photon/tests/performance-fast-path.bench.ts
 */

import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/photon'

async function benchmark(name: string, fn: () => Promise<void>, iterations = 10000) {
  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    await fn()
  }
  const duration = performance.now() - start
  const avgTime = duration / iterations
  console.log(
    `✓ ${name}: ${avgTime.toFixed(5)}ms avg (total: ${duration.toFixed(0)}ms, iterations: ${iterations})`
  )
  return avgTime
}

describe('Fast-path Performance', () => {
  it('Compare Normal vs Fast-path', async () => {
    const app = new Photon()

    // Standard route (Context, DI, Middleware chain)
    app.get('/normal', (ctx: any) => ctx.text('Normal'))

    // Fast-path route (Raw Request/Response bypass)
    app.fast.get('/fast', () => new Response('Fast'))

    const normalReq = new Request('http://localhost/normal')
    const fastReq = new Request('http://localhost/fast')

    // Warm up
    await app.fetch(normalReq)
    await app.fetch(fastReq)

    console.log('\n--- Latency Benchmark ---')
    const normalTime = await benchmark(
      'Normal route (standard)',
      async () => {
        await app.fetch(normalReq)
      },
      20000
    )

    const fastTime = await benchmark(
      'Fast-path route (bypass)',
      async () => {
        await app.fetch(fastReq)
      },
      20000
    )

    const improvement = ((normalTime - fastTime) / normalTime) * 100
    console.log(`Improvement: ${improvement.toFixed(2)}%`)

    // Fast-path should be faster
    expect(fastTime).toBeLessThan(normalTime)
  })
})
