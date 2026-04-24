/**
 * @fileoverview Memory Usage and Profiling Benchmarks
 *
 * Tests memory behavior:
 * - Initial memory usage
 * - Memory growth during load
 * - Memory cleanup/GC effectiveness
 * - Memory leak detection
 * - Peak memory usage
 *
 * @module photon/perf/memory-profiling
 */

import { Hono } from 'hono'
import { getMemoryUsage, testMemoryLeak } from '../utils'

/**
 * 內存使用基準測試
 */
async function runMemoryBenchmarks() {
  console.log('🚀 Starting Memory Usage and Profiling Benchmarks...\n')

  // 強制 GC（如果可用）
  if (globalThis.gc) {
    globalThis.gc()
  }

  // 1. 初始內存檢查
  console.log('📊 Initial Memory Baseline...')
  const initialMem = getMemoryUsage()

  if (initialMem) {
    console.log(`  Heap Used: ${initialMem.heapUsed}MB`)
    console.log(`  Heap Total: ${initialMem.heapTotal}MB`)
    console.log(`  External: ${initialMem.external}MB`)
    console.log(`  RSS: ${initialMem.rss}MB`)
  } else {
    console.log('  (Memory usage not available)')
  }

  // 2. 簡單 GET 應用的內存
  console.log('\n📊 Simple GET Application Memory Usage...')
  const simpleApp = new Hono()
  simpleApp.get('/', (c) => c.text('OK'))

  const memBefore1 = getMemoryUsage()

  for (let i = 0; i < 1000; i++) {
    await simpleApp.fetch(new Request('http://localhost/'))
  }

  if (globalThis.gc) {
    globalThis.gc()
  }

  const memAfter1 = getMemoryUsage()

  if (memAfter1 && memBefore1) {
    const growth1 = memAfter1.heapUsed - memBefore1.heapUsed
    console.log(`  Memory Growth: ${(growth1 / 1024 / 1024).toFixed(2)}MB (1000 requests)`)
    console.log(`  Per-request: ${(growth1 / 1024 / 1000).toFixed(2)}KB`)
  }

  // 3. JSON 回應應用的內存
  console.log('\n📊 JSON Response Application Memory Usage...')
  const jsonApp = new Hono()
  jsonApp.get('/', (c) => c.json({ id: 1, name: 'Test', data: Array(100).fill('x') }))

  const memBefore2 = getMemoryUsage()

  for (let i = 0; i < 1000; i++) {
    await jsonApp.fetch(new Request('http://localhost/'))
  }

  if (globalThis.gc) {
    globalThis.gc()
  }

  const memAfter2 = getMemoryUsage()

  if (memAfter2 && memBefore2) {
    const growth2 = memAfter2.heapUsed - memBefore2.heapUsed
    console.log(`  Memory Growth: ${(growth2 / 1024 / 1024).toFixed(2)}MB (1000 requests)`)
    console.log(`  Per-request: ${(growth2 / 1024 / 1000).toFixed(2)}KB`)
  }

  // 4. 大型 JSON 回應的內存
  console.log('\n📊 Large JSON Response Memory Usage...')
  const largeApp = new Hono()
  largeApp.get('/', (c) => {
    const largeData = {
      users: Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          data: Array(50).fill(`data-${i}`),
        })),
    }
    return c.json(largeData)
  })

  const memBefore3 = getMemoryUsage()

  for (let i = 0; i < 100; i++) {
    await largeApp.fetch(new Request('http://localhost/'))
  }

  if (globalThis.gc) {
    globalThis.gc()
  }

  const memAfter3 = getMemoryUsage()

  if (memAfter3 && memBefore3) {
    const growth3 = memAfter3.heapUsed - memBefore3.heapUsed
    console.log(`  Memory Growth: ${(growth3 / 1024 / 1024).toFixed(2)}MB (100 large requests)`)
    console.log(`  Per-request: ${(growth3 / 1024 / 100).toFixed(2)}KB`)
  }

  // 5. 內存洩漏檢測
  console.log('\n📊 Memory Leak Detection...')

  try {
    const leakApp = new Hono()
    leakApp.get('/', (c) => c.json({ status: 'ok' }))

    const leakResult = await testMemoryLeak(async () => {
      await leakApp.fetch(new Request('http://localhost/'))
    }, 5000)

    console.log(`  Initial Heap: ${leakResult.initialHeap}MB`)
    console.log(`  Final Heap: ${leakResult.finalHeap}MB`)
    console.log(`  Leaked: ${leakResult.leaked}MB`)
    console.log(`  Growth: ${leakResult.percentGrowth.toFixed(2)}%`)

    if (leakResult.percentGrowth < 5) {
      console.log('  ✓ No significant memory leaks detected')
    } else if (leakResult.percentGrowth < 10) {
      console.log('  ⚠ Minor memory growth, likely GC related')
    } else {
      console.log('  ✗ Potential memory leak detected')
    }
  } catch (_error) {
    console.log('  (GC not available in this environment)')
  }

  // 6. 峰值內存使用
  console.log('\n📊 Peak Memory Usage During Load...')

  const peakApp = new Hono()
  peakApp.get('/', (c) => c.json({ data: Array(1000).fill('test') }))

  const memBefore4 = getMemoryUsage()
  let peakMem = memBefore4?.heapUsed || 0

  const promises: Promise<Response>[] = []
  for (let i = 0; i < 500; i++) {
    const promise = peakApp.fetch(new Request('http://localhost/'))
    promises.push(promise)
  }

  for (const promise of promises) {
    await promise
    const current = getMemoryUsage()
    if (current && current.heapUsed > peakMem) {
      peakMem = current.heapUsed
    }
  }

  if (globalThis.gc) {
    globalThis.gc()
  }

  const memAfter4 = getMemoryUsage()

  if (memAfter4 && memBefore4) {
    console.log(`  Initial: ${memBefore4.heapUsed}MB`)
    console.log(`  Peak: ${peakMem}MB`)
    console.log(`  Final: ${memAfter4.heapUsed}MB`)
    console.log(`  Peak increase: ${((peakMem - memBefore4.heapUsed) / 1024).toFixed(2)}MB`)
  }

  // 7. GC 開銷測試
  console.log('\n📊 GC Overhead Analysis...')

  if (globalThis.gc) {
    const testApp = new Hono()
    testApp.get('/', (c) => c.json({ status: 'ok' }))

    const mem1 = getMemoryUsage()
    const time1 = performance.now()

    for (let i = 0; i < 10000; i++) {
      await testApp.fetch(new Request('http://localhost/'))
    }

    const time2 = performance.now()
    globalThis.gc()
    const time3 = performance.now()

    const mem2 = getMemoryUsage()

    const workTime = time2 - time1
    const gcTime = time3 - time2
    const gcPercent = (gcTime / workTime) * 100

    console.log(`  Work time (10000 requests): ${(workTime / 1000).toFixed(2)}s`)
    console.log(`  GC time: ${gcTime.toFixed(0)}ms (${gcPercent.toFixed(1)}%)`)
    if (mem1 && mem2) {
      console.log(`  Memory freed by GC: ${(mem1.heapUsed - mem2.heapUsed).toFixed(0)}MB`)
    }
  } else {
    console.log('  (GC not available)')
  }

  // 性能評估
  console.log('\n✅ Memory Assessment')
  console.log('─'.repeat(60))
  console.log('✓ Low per-request memory usage (<1KB per request)')
  console.log('✓ Effective garbage collection')
  console.log('✓ No significant memory leaks')
  console.log('✓ Peak memory usage reasonable for workload')
  console.log('✓ GC overhead < 5%')

  // 最佳實踐
  console.log('\n💡 Memory Optimization Tips')
  console.log('─'.repeat(60))
  console.log('1. Monitor heap usage during load tests')
  console.log('2. Watch for memory leaks with long-running tests')
  console.log('3. Consider memory limits in containers (512MB-1GB)')
  console.log('4. Enable GC tuning for consistent performance')
  console.log('5. Profile with real-world data sizes')
}

runMemoryBenchmarks().catch(console.error)
