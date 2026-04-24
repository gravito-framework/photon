/**
 * @fileoverview Router Performance Benchmarks
 *
 * Tests routing performance for various route patterns:
 * - Static routes (e.g., /api/users)
 * - Dynamic routes (e.g., /api/users/:id)
 * - Wildcard routes (e.g., /api/*)
 *
 * @module photon/perf/router
 */

import { Hono } from 'hono'
import { formatTime, generateReport, measure } from '../utils'

/**
 * 路由匹配性能測試
 *
 * 測試 Hono 的路由匹配性能，包括：
 * - 靜態路由：直接字符串匹配
 * - 動態路由：參數提取（/:id）
 * - 嵌套動態路由：多個參數（/:id/posts/:postId）
 */
async function runRouterBenchmarks() {
  console.log('🚀 Starting Router Performance Benchmarks...\n')

  const results = []

  // 1. 靜態路由匹配
  console.log('📊 Testing Static Route Matching...')
  const staticApp = new Hono()

  // 添加 100 個靜態路由來測試現實場景
  for (let i = 0; i < 100; i++) {
    staticApp.get(`/api/v1/endpoint${i}`, (c) => c.text('OK'))
  }

  const staticResult = await measure(
    'Static Route Matching (/api/v1/endpoint50)',
    () => {
      staticApp.fetch(new Request('http://localhost/api/v1/endpoint50'))
    },
    { iterations: 50000, warmup: 100 }
  )
  results.push(staticResult)
  console.log(`  ✓ Mean: ${formatTime(staticResult.mean)}, p99: ${formatTime(staticResult.p99)}`)

  // 2. 動態路由匹配（單個參數）
  console.log('📊 Testing Dynamic Route Matching (Single Param)...')
  const dynamicApp = new Hono()

  for (let i = 0; i < 100; i++) {
    dynamicApp.get(`/api/v1/endpoint${i}/:id`, (c) => c.text('OK'))
  }

  const dynamicResult = await measure(
    'Dynamic Route Matching (/api/v1/endpoint50/:id)',
    () => {
      dynamicApp.fetch(new Request('http://localhost/api/v1/endpoint50/12345'))
    },
    { iterations: 50000, warmup: 100 }
  )
  results.push(dynamicResult)
  console.log(`  ✓ Mean: ${formatTime(dynamicResult.mean)}, p99: ${formatTime(dynamicResult.p99)}`)

  // 3. 複雜動態路由匹配（多個參數）
  console.log('📊 Testing Complex Dynamic Route Matching (Multiple Params)...')
  const complexApp = new Hono()

  complexApp.get('/api/users/:userId/posts/:postId/comments/:commentId', (c) => c.text('OK'))

  const complexResult = await measure(
    'Complex Route (/api/users/:userId/posts/:postId/comments/:commentId)',
    () => {
      complexApp.fetch(new Request('http://localhost/api/users/123/posts/456/comments/789'))
    },
    { iterations: 50000, warmup: 100 }
  )
  results.push(complexResult)
  console.log(`  ✓ Mean: ${formatTime(complexResult.mean)}, p99: ${formatTime(complexResult.p99)}`)

  // 4. 正則表達式路由匹配
  console.log('📊 Testing Regex Route Matching...')
  const regexApp = new Hono()

  regexApp.get(/^\/api\/v\d+\/users\/\d+$/, (c) => c.text('OK'))

  const regexResult = await measure(
    'Regex Route Matching (/^/api/v\\d+/users/\\d+$/)',
    () => {
      regexApp.fetch(new Request('http://localhost/api/v1/users/12345'))
    },
    { iterations: 50000, warmup: 100 }
  )
  results.push(regexResult)
  console.log(`  ✓ Mean: ${formatTime(regexResult.mean)}, p99: ${formatTime(regexResult.p99)}`)

  // 5. 萬用字符路由匹配
  console.log('📊 Testing Wildcard Route Matching...')
  const wildcardApp = new Hono()

  wildcardApp.get('/api/*', (c) => c.text('OK'))

  const wildcardResult = await measure(
    'Wildcard Route Matching (/api/*)',
    () => {
      wildcardApp.fetch(new Request('http://localhost/api/some/nested/path'))
    },
    { iterations: 50000, warmup: 100 }
  )
  results.push(wildcardResult)
  console.log(
    `  ✓ Mean: ${formatTime(wildcardResult.mean)}, p99: ${formatTime(wildcardResult.p99)}`
  )

  // 6. 最差情況：未找到的路由
  console.log('📊 Testing Route Not Found (Worst Case)...')
  const largeApp = new Hono()

  // 添加 200 個不匹配的路由
  for (let i = 0; i < 200; i++) {
    largeApp.get(`/api/endpoint${i}`, (c) => c.text('OK'))
  }

  const notFoundResult = await measure(
    'Route Not Found (200 routes, no match)',
    () => {
      largeApp.fetch(new Request('http://localhost/api/nonexistent'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(notFoundResult)
  console.log(
    `  ✓ Mean: ${formatTime(notFoundResult.mean)}, p99: ${formatTime(notFoundResult.p99)}`
  )

  // 7. 路由添加性能
  console.log('📊 Testing Route Addition Performance...')
  const addResult = await measure(
    'Adding a new route to app',
    () => {
      const app = new Hono()
      app.get('/api/test', (c) => c.text('OK'))
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(addResult)
  console.log(`  ✓ Mean: ${formatTime(addResult.mean)}, p99: ${formatTime(addResult.p99)}`)

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
  console.log(`Range: ${formatTime(maxMean - minMean)}`)

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(50))

  results.forEach((r) => {
    const status = r.mean < 1 ? '✓ Excellent' : r.mean < 5 ? '⚠ Good' : '✗ Poor'
    console.log(`${r.name}: ${status} (${formatTime(r.mean)})`)
  })
}

runRouterBenchmarks().catch(console.error)
