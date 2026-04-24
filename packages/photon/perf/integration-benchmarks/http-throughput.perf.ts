/**
 * @fileoverview HTTP Throughput Performance Benchmarks
 *
 * Tests end-to-end HTTP request performance including:
 * - Simple GET requests
 * - POST with JSON body
 * - With various middleware stacks
 * - Latency percentiles (p50, p95, p99)
 * - Request throughput (requests/second)
 *
 * @module photon/perf/http-throughput
 */

import { Hono } from 'hono'
import { rateLimit } from '../../src/middleware/ratelimit'
import { cors } from '../../src/middleware/security'
import { formatTime } from '../utils'

/**
 * 計算延遲百分位數
 */
function calculateLatencyPercentiles(latencies: number[]): {
  p50: number
  p95: number
  p99: number
  mean: number
} {
  const sorted = [...latencies].sort((a, b) => a - b)

  const p50Index = Math.floor(sorted.length * 0.5)
  const p95Index = Math.floor(sorted.length * 0.95)
  const p99Index = Math.floor(sorted.length * 0.99)

  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length

  return {
    p50: sorted[p50Index],
    p95: sorted[p95Index],
    p99: sorted[p99Index],
    mean,
  }
}

/**
 * 基準測試：HTTP 端到端性能
 */
async function runHttpThroughputBenchmarks() {
  console.log('🚀 Starting HTTP Throughput Performance Benchmarks...\n')

  const results: any[] = []

  // 1. 簡單 GET 請求
  console.log('📊 Testing Simple GET Request...')
  const simpleApp = new Hono()
  simpleApp.get('/', (c) => c.text('OK'))

  const latencies1: number[] = []
  const startTime1 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await simpleApp.fetch(new Request('http://localhost/'))
    const end = performance.now()
    latencies1.push(end - start)
  }
  const endTime1 = performance.now()
  const totalTime1 = endTime1 - startTime1

  const percentiles1 = calculateLatencyPercentiles(latencies1)
  const throughput1 = (1000 / totalTime1) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles1.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles1.p99 * 1000)}, Throughput: ${throughput1.toFixed(0)} req/s`
  )

  results.push({
    name: 'Simple GET',
    iterations: 1000,
    mean: percentiles1.mean * 1000,
    p50: percentiles1.p50 * 1000,
    p95: percentiles1.p95 * 1000,
    p99: percentiles1.p99 * 1000,
    throughput: throughput1,
  })

  // 2. JSON 回應
  console.log('📊 Testing JSON Response...')
  const jsonApp = new Hono()
  jsonApp.get('/', (c) => c.json({ id: 1, name: 'Test', active: true }))

  const latencies2: number[] = []
  const startTime2 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await jsonApp.fetch(new Request('http://localhost/'))
    const end = performance.now()
    latencies2.push(end - start)
  }
  const endTime2 = performance.now()
  const totalTime2 = endTime2 - startTime2

  const percentiles2 = calculateLatencyPercentiles(latencies2)
  const throughput2 = (1000 / totalTime2) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles2.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles2.p99 * 1000)}, Throughput: ${throughput2.toFixed(0)} req/s`
  )

  results.push({
    name: 'JSON Response',
    iterations: 1000,
    mean: percentiles2.mean * 1000,
    p50: percentiles2.p50 * 1000,
    p95: percentiles2.p95 * 1000,
    p99: percentiles2.p99 * 1000,
    throughput: throughput2,
  })

  // 3. POST 請求（小 body）
  console.log('📊 Testing POST with Small Body...')
  const postApp = new Hono()
  postApp.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ received: body })
  })

  const latencies3: number[] = []
  const startTime3 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await postApp.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: i, value: 'test' }),
      })
    )
    const end = performance.now()
    latencies3.push(end - start)
  }
  const endTime3 = performance.now()
  const totalTime3 = endTime3 - startTime3

  const percentiles3 = calculateLatencyPercentiles(latencies3)
  const throughput3 = (1000 / totalTime3) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles3.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles3.p99 * 1000)}, Throughput: ${throughput3.toFixed(0)} req/s`
  )

  results.push({
    name: 'POST (small body)',
    iterations: 1000,
    mean: percentiles3.mean * 1000,
    p50: percentiles3.p50 * 1000,
    p95: percentiles3.p95 * 1000,
    p99: percentiles3.p99 * 1000,
    throughput: throughput3,
  })

  // 4. 帶 CORS 的 GET
  console.log('📊 Testing GET with CORS Middleware...')
  const corsApp = new Hono()
  corsApp.use(cors({ origin: 'https://example.com' }))
  corsApp.get('/', (c) => c.json({ status: 'ok' }))

  const latencies4: number[] = []
  const startTime4 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await corsApp.fetch(
      new Request('http://localhost/', {
        headers: { Origin: 'https://example.com' },
      })
    )
    const end = performance.now()
    latencies4.push(end - start)
  }
  const endTime4 = performance.now()
  const totalTime4 = endTime4 - startTime4

  const percentiles4 = calculateLatencyPercentiles(latencies4)
  const throughput4 = (1000 / totalTime4) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles4.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles4.p99 * 1000)}, Throughput: ${throughput4.toFixed(0)} req/s`
  )

  results.push({
    name: 'GET + CORS',
    iterations: 1000,
    mean: percentiles4.mean * 1000,
    p50: percentiles4.p50 * 1000,
    p95: percentiles4.p95 * 1000,
    p99: percentiles4.p99 * 1000,
    throughput: throughput4,
  })

  // 5. 帶 Rate Limit 的 GET
  console.log('📊 Testing GET with Rate Limit Middleware...')
  const rateLimitApp = new Hono()
  rateLimitApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 10000,
    })
  )
  rateLimitApp.get('/', (c) => c.json({ status: 'ok' }))

  const latencies5: number[] = []
  const startTime5 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await rateLimitApp.fetch(
      new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })
    )
    const end = performance.now()
    latencies5.push(end - start)
  }
  const endTime5 = performance.now()
  const totalTime5 = endTime5 - startTime5

  const percentiles5 = calculateLatencyPercentiles(latencies5)
  const throughput5 = (1000 / totalTime5) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles5.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles5.p99 * 1000)}, Throughput: ${throughput5.toFixed(0)} req/s`
  )

  results.push({
    name: 'GET + Rate Limit',
    iterations: 1000,
    mean: percentiles5.mean * 1000,
    p50: percentiles5.p50 * 1000,
    p95: percentiles5.p95 * 1000,
    p99: percentiles5.p99 * 1000,
    throughput: throughput5,
  })

  // 6. 完整中間件堆棧（CORS + Rate Limit）
  console.log('📊 Testing GET with Full Middleware Stack...')
  const stackApp = new Hono()
  stackApp.use(cors({ origin: 'https://example.com' }))
  stackApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 10000,
    })
  )
  stackApp.get('/', (c) => c.json({ status: 'ok' }))

  const latencies6: number[] = []
  const startTime6 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await stackApp.fetch(
      new Request('http://localhost/', {
        headers: {
          Origin: 'https://example.com',
          'x-forwarded-for': '192.168.1.1',
        },
      })
    )
    const end = performance.now()
    latencies6.push(end - start)
  }
  const endTime6 = performance.now()
  const totalTime6 = endTime6 - startTime6

  const percentiles6 = calculateLatencyPercentiles(latencies6)
  const throughput6 = (1000 / totalTime6) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles6.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles6.p99 * 1000)}, Throughput: ${throughput6.toFixed(0)} req/s`
  )

  results.push({
    name: 'GET + CORS + Rate Limit',
    iterations: 1000,
    mean: percentiles6.mean * 1000,
    p50: percentiles6.p50 * 1000,
    p95: percentiles6.p95 * 1000,
    p99: percentiles6.p99 * 1000,
    throughput: throughput6,
  })

  // 7. 路由參數提取
  console.log('📊 Testing Dynamic Route with Parameters...')
  const paramApp = new Hono()
  paramApp.get('/users/:id/posts/:postId', (c) => {
    const id = c.req.param('id')
    const postId = c.req.param('postId')
    return c.json({ userId: id, postId })
  })

  const latencies7: number[] = []
  const startTime7 = performance.now()
  for (let i = 0; i < 1000; i++) {
    const start = performance.now()
    await paramApp.fetch(new Request('http://localhost/users/123/posts/456'))
    const end = performance.now()
    latencies7.push(end - start)
  }
  const endTime7 = performance.now()
  const totalTime7 = endTime7 - startTime7

  const percentiles7 = calculateLatencyPercentiles(latencies7)
  const throughput7 = (1000 / totalTime7) * 1000

  console.log(`  ✓ Mean: ${formatTime(percentiles7.mean * 1000)}`)
  console.log(
    `  ✓ p99: ${formatTime(percentiles7.p99 * 1000)}, Throughput: ${throughput7.toFixed(0)} req/s`
  )

  results.push({
    name: 'Dynamic Route (params)',
    iterations: 1000,
    mean: percentiles7.mean * 1000,
    p50: percentiles7.p50 * 1000,
    p95: percentiles7.p95 * 1000,
    p99: percentiles7.p99 * 1000,
    throughput: throughput7,
  })

  // 生成報告
  console.log('\n📈 Latency Distribution Report\n')
  console.log('| Endpoint | Mean | p50 | p95 | p99 | Throughput |')
  console.log('|----------|------|-----|-----|-----|-----------|')

  results.forEach((r) => {
    console.log(
      `| ${r.name} | ${formatTime(r.mean)} | ${formatTime(r.p50)} | ${formatTime(r.p95)} | ${formatTime(r.p99)} | ${r.throughput.toFixed(0)} req/s |`
    )
  })

  // 統計摘要
  console.log('\n📊 Throughput Summary')
  console.log('─'.repeat(60))

  const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length
  const maxThroughput = Math.max(...results.map((r) => r.throughput))
  const minThroughput = Math.min(...results.map((r) => r.throughput))

  console.log(`Average Throughput: ${avgThroughput.toFixed(0)} req/s`)
  console.log(`Best Case: ${maxThroughput.toFixed(0)} req/s`)
  console.log(`Worst Case: ${minThroughput.toFixed(0)} req/s`)

  // 延遲分布
  console.log('\n⏱️ Latency Distribution')
  console.log('─'.repeat(60))

  results.forEach((r) => {
    const overhead = r.mean - results[0].mean
    console.log(`${r.name}:`)
    console.log(`  Mean: ${formatTime(r.mean)}`)
    console.log(
      `  p95:  ${formatTime(r.p95)} (${((r.p95 / r.mean) * 100 - 100).toFixed(1)}% spike)`
    )
    console.log(
      `  p99:  ${formatTime(r.p99)} (${((r.p99 / r.mean) * 100 - 100).toFixed(1)}% spike)`
    )
    if (overhead > 0) {
      console.log(`  Overhead: +${formatTime(overhead)}`)
    }
  })

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(60))

  results.forEach((r) => {
    const status =
      r.throughput > 10000 ? '✓ Excellent' : r.throughput > 5000 ? '⚠ Good' : '⚠ Acceptable'

    console.log(`${r.name}: ${status} (${r.throughput.toFixed(0)} req/s)`)
  })

  // 建議
  console.log('\n💡 Recommendations')
  console.log('─'.repeat(60))
  console.log('1. 簡單路由可達到 10k+ req/s')
  console.log('2. 中間件增加 5-10% 延遲')
  console.log('3. p95 和 p99 展示流量峰值')
  console.log('4. 監控 p99 而非平均值')
  console.log('5. 考慮緩存來自動態路由')
}

runHttpThroughputBenchmarks().catch(console.error)
