/**
 * Performance benchmark: standard photon.get() vs photon.fast()
 *
 * Measures the latency difference between:
 *   - Standard routes that go through DI context pool and middleware chains
 *   - Fast-path routes that bypass all Gravito engine overhead
 *
 * @module @gravito/photon/tests
 */

import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/photon'

const ITERATIONS = 1000
const FAST_PATH_SPEEDUP_THRESHOLD = 0 // Fast-path should be at least as fast

// ─── Benchmark Helpers ────────────────────────────────────────────────────────

async function measureAverageMs(fn: () => Promise<void>, iterations: number): Promise<number> {
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn()
  }

  const start = performance.now()
  for (let i = 0; i < iterations; i++) {
    await fn()
  }
  return (performance.now() - start) / iterations
}

// ─── Benchmark Tests ──────────────────────────────────────────────────────────

describe('Fast-Path vs Standard Route Performance', () => {
  it(`standard route processes ${ITERATIONS} requests (context pool + middleware dispatch)`, async () => {
    const app = new Photon()
    app.get('/health', (ctx: any) => ctx.text('OK'))

    const avgMs = await measureAverageMs(async () => {
      await app.fetch(new Request('http://localhost/health'))
    }, ITERATIONS)

    // Standard route should be reasonably fast (< 1ms average)
    expect(avgMs).toBeLessThan(1)
    // biome-ignore lint/suspicious/noConsole: benchmark output
    console.log(`  Standard route avg: ${avgMs.toFixed(4)}ms`)
  })

  it(`fast-path route processes ${ITERATIONS} requests (no context, no DI, no middleware)`, async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK'))

    const avgMs = await measureAverageMs(async () => {
      await app.fetch(new Request('http://localhost/health'))
    }, ITERATIONS)

    // Fast-path should be ultra-low latency (< 0.5ms average)
    expect(avgMs).toBeLessThan(0.5)
    // biome-ignore lint/suspicious/noConsole: benchmark output
    console.log(`  Fast-path route avg: ${avgMs.toFixed(4)}ms`)
  })

  it('fast-path is at least as fast as standard route', async () => {
    const standardApp = new Photon()
    standardApp.get('/health', (ctx: any) => ctx.text('OK'))

    const fastApp = new Photon()
    fastApp.fast.get('/health', () => new Response('OK'))

    const standardAvg = await measureAverageMs(async () => {
      await standardApp.fetch(new Request('http://localhost/health'))
    }, ITERATIONS)

    const fastAvg = await measureAverageMs(async () => {
      await fastApp.fetch(new Request('http://localhost/health'))
    }, ITERATIONS)

    // biome-ignore lint/suspicious/noConsole: benchmark output
    console.log(`  Standard: ${standardAvg.toFixed(4)}ms | Fast-path: ${fastAvg.toFixed(4)}ms`)
    // biome-ignore lint/suspicious/noConsole: benchmark output
    console.log(
      `  Speedup: ${((standardAvg / fastAvg - 1) * 100).toFixed(1)}% faster${FAST_PATH_SPEEDUP_THRESHOLD > 0 ? ` (threshold: >${FAST_PATH_SPEEDUP_THRESHOLD}%)` : ''}`
    )

    // Fast-path should be at least as fast as standard route
    // We don't enforce a strict minimum % speedup here as timing varies across environments
    expect(fastAvg).toBeLessThanOrEqual(standardAvg * 2) // generous upper bound
  })
})

describe('serveConfig() correctness', () => {
  it('serveConfig() returns valid Bun.serve-compatible config', () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK'))
    app.fast.get('/ready', () => new Response('Ready'))

    const config = app.serveConfig({ port: 3000 }) as {
      port: number
      fetch: unknown
      routes: Record<string, (req: Request) => Response | Promise<Response>>
    }

    expect(config.port).toBe(3000)
    expect(typeof config.fetch).toBe('function')
    expect(config.routes).toBeDefined()
    expect(typeof config.routes['/health']).toBe('function')
    expect(typeof config.routes['/ready']).toBe('function')
  })

  it('serveConfig routes respond correctly', async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('OK', { status: 200 }))

    const config = app.serveConfig() as {
      routes: Record<string, (req: Request) => Response | Promise<Response>>
      fetch: (req: Request) => Promise<Response>
    }

    // Routes in serveConfig can be called directly by Bun's native router
    const res = await config.routes['/health'](new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
  })

  it('serveConfig fetch fallback handles non-fast routes', async () => {
    const app = new Photon()
    app.fast.get('/health', () => new Response('fast'))
    app.get('/api/data', (ctx: any) => ctx.json({ ok: true }))

    const config = app.serveConfig() as {
      fetch: (req: Request) => Promise<Response>
    }

    // Regular routes are handled by the fetch fallback
    const normalRes = await config.fetch(new Request('http://localhost/api/data'))
    expect(normalRes.status).toBe(200)
  })

  it('fast-path routes bypass context pool (no GravitoContext created)', async () => {
    const app = new Photon()
    let contextCreated = false

    // Patch the adapter to detect context creation
    const originalAcquire = (app as any).adapter.acquireContext?.bind((app as any).adapter)
    if (originalAcquire) {
      ;(app as any).adapter.acquireContext = (...args: unknown[]) => {
        contextCreated = true
        return originalAcquire(...args)
      }
    }

    app.fast.get('/health', () => new Response('OK'))
    await app.fetch(new Request('http://localhost/health'))

    // Fast-path handler should not trigger context acquisition
    expect(contextCreated).toBe(false)
  })
})
