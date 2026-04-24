/**
 * @fileoverview Middleware Chain Performance Benchmarks
 *
 * Tests the performance of middleware execution chains
 * without actual business logic, focusing on the overhead
 * of middleware composition and execution.
 *
 * @module photon/perf/middleware-chain
 */

import type { Context } from 'hono'
import { Hono } from 'hono'
import { formatTime, generateReport, measure } from '../utils'

/**
 * 構建 Hono 應用並測試中間件鏈性能
 */
async function runMiddlewareChainBenchmarks() {
  console.log('🚀 Starting Middleware Chain Performance Benchmarks...\n')

  const results = []

  // 簡單中間件（無操作）
  const noop = async (_c: Context, next: () => Promise<void>) => {
    await next()
  }

  // 帶簡單邏輯的中間件（頭檢查）
  const headerCheck = async (c: Context, next: () => Promise<void>) => {
    const auth = c.req.header('Authorization')
    if (!auth) {
      return c.text('Unauthorized', 401)
    }
    await next()
  }

  // 1. 無中間件基線
  console.log('📊 Testing Baseline (no middleware)...')
  const baselineApp = new Hono()
  baselineApp.get('/', (c) => c.text('OK'))

  const baselineResult = await measure(
    'Baseline - No Middleware',
    () => {
      baselineApp.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(baselineResult)
  console.log(
    `  ✓ Mean: ${formatTime(baselineResult.mean)}, p99: ${formatTime(baselineResult.p99)}`
  )

  // 2. 單個中間件
  console.log('📊 Testing Single Middleware...')
  const app1 = new Hono()
  app1.use(noop)
  app1.get('/', (c) => c.text('OK'))

  const single1Result = await measure(
    'Single Middleware (no-op)',
    () => {
      app1.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(single1Result)
  console.log(`  ✓ Mean: ${formatTime(single1Result.mean)}, p99: ${formatTime(single1Result.p99)}`)

  // 3. 三個中間件
  console.log('📊 Testing 3-Layer Middleware Chain...')
  const app3 = new Hono()
  app3.use(noop)
  app3.use(noop)
  app3.use(noop)
  app3.get('/', (c) => c.text('OK'))

  const result3 = await measure(
    '3-Layer Middleware Chain',
    () => {
      app3.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(result3)
  console.log(`  ✓ Mean: ${formatTime(result3.mean)}, p99: ${formatTime(result3.p99)}`)

  // 4. 5 層中間件
  console.log('📊 Testing 5-Layer Middleware Chain...')
  const app5 = new Hono()
  app5.use(noop)
  app5.use(noop)
  app5.use(noop)
  app5.use(noop)
  app5.use(noop)
  app5.get('/', (c) => c.text('OK'))

  const result5 = await measure(
    '5-Layer Middleware Chain',
    () => {
      app5.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(result5)
  console.log(`  ✓ Mean: ${formatTime(result5.mean)}, p99: ${formatTime(result5.p99)}`)

  // 5. 10 層中間件
  console.log('📊 Testing 10-Layer Middleware Chain...')
  const app10 = new Hono()
  for (let i = 0; i < 10; i++) {
    app10.use(noop)
  }
  app10.get('/', (c) => c.text('OK'))

  const result10 = await measure(
    '10-Layer Middleware Chain',
    () => {
      app10.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(result10)
  console.log(`  ✓ Mean: ${formatTime(result10.mean)}, p99: ${formatTime(result10.p99)}`)

  // 6. 20 層中間件
  console.log('📊 Testing 20-Layer Middleware Chain...')
  const app20 = new Hono()
  for (let i = 0; i < 20; i++) {
    app20.use(noop)
  }
  app20.get('/', (c) => c.text('OK'))

  const result20 = await measure(
    '20-Layer Middleware Chain',
    () => {
      app20.fetch(new Request('http://localhost/'))
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(result20)
  console.log(`  ✓ Mean: ${formatTime(result20.mean)}, p99: ${formatTime(result20.p99)}`)

  // 7. 路由特定中間件
  console.log('📊 Testing Route-Specific Middleware...')
  const appRouteMW = new Hono()
  appRouteMW.get('/', noop, (c) => c.text('OK'))

  const routeMWResult = await measure(
    'Route-Specific Middleware (1 layer)',
    () => {
      appRouteMW.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(routeMWResult)
  console.log(`  ✓ Mean: ${formatTime(routeMWResult.mean)}, p99: ${formatTime(routeMWResult.p99)}`)

  // 8. 全局 + 路由中間件混合
  console.log('📊 Testing Global + Route Middleware Mix...')
  const appMix = new Hono()
  appMix.use(noop)
  appMix.use(noop)
  appMix.get('/', noop, noop, (c) => c.text('OK'))

  const mixResult = await measure(
    'Global (2) + Route (2) Middleware',
    () => {
      appMix.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(mixResult)
  console.log(`  ✓ Mean: ${formatTime(mixResult.mean)}, p99: ${formatTime(mixResult.p99)}`)

  // 9. 帶條件邏輯的中間件（模擬實際場景）
  console.log('📊 Testing Middleware with Conditional Logic...')
  const appLogic = new Hono()
  appLogic.use(headerCheck)
  appLogic.get('/', (c) => c.text('OK'))

  const logicResult = await measure(
    'Middleware with Header Check (pass)',
    () => {
      appLogic.fetch(
        new Request('http://localhost/', {
          headers: { Authorization: 'Bearer token' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(logicResult)
  console.log(`  ✓ Mean: ${formatTime(logicResult.mean)}, p99: ${formatTime(logicResult.p99)}`)

  // 10. 多層路由組織
  console.log('📊 Testing Nested Route Groups...')
  const appNested = new Hono()
  appNested.use(noop)

  const apiGroup = new Hono()
  apiGroup.use(noop)
  apiGroup.get('/users', (c) => c.text('OK'))

  appNested.route('/api', apiGroup)

  const nestedResult = await measure(
    'Nested Route Groups',
    () => {
      appNested.fetch(new Request('http://localhost/api/users'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(nestedResult)
  console.log(`  ✓ Mean: ${formatTime(nestedResult.mean)}, p99: ${formatTime(nestedResult.p99)}`)

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 輸出統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(50))

  const avgMean = results.reduce((sum, r) => sum + r.mean, 0) / results.length
  const maxMean = Math.max(...results.map((r) => r.mean))
  const minMean = Math.min(...results.map((r) => r.mean))

  console.log(`Average Mean: ${formatTime(avgMean)}`)
  console.log(`Fastest: ${formatTime(minMean)}`)
  console.log(`Slowest: ${formatTime(maxMean)}`)

  // 中間件開銷分析
  console.log('\n⚡ Middleware Overhead Analysis')
  console.log('─'.repeat(50))

  const baseline = results[0].mean
  const perLayerOverhead = (result10.mean - baseline) / 10

  console.log(`Baseline (no middleware): ${formatTime(baseline)}`)
  console.log(`Per-middleware overhead: ${formatTime(perLayerOverhead)}`)
  console.log(`10-layer total overhead: ${formatTime(result10.mean - baseline)}`)

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(50))

  results.forEach((r) => {
    const overhead = r.mean - baseline
    const percentOverhead = ((overhead / baseline) * 100).toFixed(1)
    const status = overhead < 5000 ? '✓ Excellent' : overhead < 20000 ? '⚠ Good' : '✗ Poor'
    console.log(`${r.name}: ${status} (+${percentOverhead}% over baseline)`)
  })
}

runMiddlewareChainBenchmarks().catch(console.error)
