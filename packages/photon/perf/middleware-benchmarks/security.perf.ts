/**
 * @fileoverview Security Middleware Performance Benchmarks
 *
 * Tests performance of security-related middleware:
 * - CORS origin checking and header setting
 * - CSRF token validation
 * - Security headers generation
 * - Body size limit checking
 * - Header token gate verification
 *
 * @module photon/perf/security-middleware
 */

import { Hono } from 'hono'
import {
  bodySizeLimit,
  cors,
  csrfProtection,
  requireHeaderToken,
  securityHeaders,
} from '../../src/middleware/security'
import { formatTime, generateReport, measure } from '../utils'

/**
 * 安全中間件性能測試
 */
async function runSecurityMiddlewareBenchmarks() {
  console.log('🚀 Starting Security Middleware Performance Benchmarks...\n')

  const results = []

  // 基線測試（無中間件）
  console.log('📊 Baseline: No Security Middleware...')
  const baselineApp = new Hono()
  baselineApp.get('/', (c) => c.text('OK'))

  const baselineResult = await measure(
    'Baseline (no middleware)',
    () => {
      baselineApp.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(baselineResult)
  console.log(
    `  ✓ Mean: ${formatTime(baselineResult.mean)}, p99: ${formatTime(baselineResult.p99)}`
  )

  // 1. CORS 中間件 - 允許的來源
  console.log('📊 Testing CORS Middleware (allowed origin)...')
  const corsApp = new Hono()
  corsApp.use(cors({ origin: 'https://example.com' }))
  corsApp.get('/', (c) => c.text('OK'))

  const corsResult = await measure(
    'CORS (allowed origin)',
    () => {
      corsApp.fetch(
        new Request('http://localhost/', {
          headers: { Origin: 'https://example.com' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(corsResult)
  console.log(
    `  ✓ Mean: ${formatTime(corsResult.mean)}, Overhead: ${formatTime(corsResult.mean - baselineResult.mean)}`
  )

  // 2. CORS - 拒絕的來源
  console.log('📊 Testing CORS Middleware (rejected origin)...')
  const corsRejectResult = await measure(
    'CORS (rejected origin)',
    () => {
      corsApp.fetch(
        new Request('http://localhost/', {
          headers: { Origin: 'https://malicious.com' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(corsRejectResult)
  console.log(
    `  ✓ Mean: ${formatTime(corsRejectResult.mean)}, Overhead: ${formatTime(corsRejectResult.mean - baselineResult.mean)}`
  )

  // 3. CORS - 動態來源檢查
  console.log('📊 Testing CORS Middleware (dynamic origin check)...')
  const corsDynamicApp = new Hono()
  corsDynamicApp.use(
    cors({
      origin: (origin) => (origin?.endsWith('.example.com') ? origin : false),
    })
  )
  corsDynamicApp.get('/', (c) => c.text('OK'))

  const corsDynamicResult = await measure(
    'CORS (dynamic origin check)',
    () => {
      corsDynamicApp.fetch(
        new Request('http://localhost/', {
          headers: { Origin: 'https://api.example.com' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(corsDynamicResult)
  console.log(
    `  ✓ Mean: ${formatTime(corsDynamicResult.mean)}, Overhead: ${formatTime(corsDynamicResult.mean - baselineResult.mean)}`
  )

  // 4. Security Headers
  console.log('📊 Testing Security Headers Middleware...')
  const headersApp = new Hono()
  headersApp.use(
    securityHeaders({
      hsts: true,
      contentSecurityPolicy: true,
      frameOptions: 'DENY',
    })
  )
  headersApp.get('/', (c) => c.text('OK'))

  const headersResult = await measure(
    'Security Headers (full)',
    () => {
      headersApp.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(headersResult)
  console.log(
    `  ✓ Mean: ${formatTime(headersResult.mean)}, Overhead: ${formatTime(headersResult.mean - baselineResult.mean)}`
  )

  // 5. Body Size Limit - 小請求
  console.log('📊 Testing Body Size Limit (small request)...')
  const bodySizeLimitApp = new Hono()
  bodySizeLimitApp.use(bodySizeLimit(1024 * 1024)) // 1MB limit
  bodySizeLimitApp.post('/', async (c) => c.text('OK'))

  const bodyLimitSmallResult = await measure(
    'Body Size Limit (small request)',
    () => {
      bodySizeLimitApp.fetch(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Length': '100' },
          body: 'x'.repeat(100),
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(bodyLimitSmallResult)
  console.log(
    `  ✓ Mean: ${formatTime(bodyLimitSmallResult.mean)}, Overhead: ${formatTime(bodyLimitSmallResult.mean - baselineResult.mean)}`
  )

  // 6. Body Size Limit - 邊界情況（恰好在限制）
  console.log('📊 Testing Body Size Limit (at limit)...')
  const bodyLimitAtResult = await measure(
    'Body Size Limit (at limit)',
    () => {
      bodySizeLimitApp.fetch(
        new Request('http://localhost/', {
          method: 'POST',
          headers: { 'Content-Length': '1048576' },
          body: Buffer.alloc(1048576),
        })
      )
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(bodyLimitAtResult)
  console.log(
    `  ✓ Mean: ${formatTime(bodyLimitAtResult.mean)}, Overhead: ${formatTime(bodyLimitAtResult.mean - baselineResult.mean)}`
  )

  // 7. CSRF 保護
  console.log('📊 Testing CSRF Protection Middleware...')
  const csrfApp = new Hono()
  csrfApp.use(csrfProtection())
  csrfApp.post('/', (c) => c.text('OK'))

  // CSRF 需要有效的 token
  const csrfToken = 'valid-csrf-token'
  const csrfResult = await measure(
    'CSRF Protection (valid token)',
    () => {
      csrfApp.fetch(
        new Request('http://localhost/', {
          method: 'POST',
          headers: {
            'X-CSRF-Token': csrfToken,
            Cookie: `csrf-token=${csrfToken}`,
          },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(csrfResult)
  console.log(
    `  ✓ Mean: ${formatTime(csrfResult.mean)}, Overhead: ${formatTime(csrfResult.mean - baselineResult.mean)}`
  )

  // 8. Header Token Gate
  console.log('📊 Testing Header Token Gate...')
  const tokenGateApp = new Hono()
  tokenGateApp.use(requireHeaderToken({ token: 'secret-token' }))
  tokenGateApp.get('/', (c) => c.text('OK'))

  const tokenGateResult = await measure(
    'Header Token Gate (valid)',
    () => {
      tokenGateApp.fetch(
        new Request('http://localhost/', {
          headers: { 'X-API-Token': 'secret-token' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(tokenGateResult)
  console.log(
    `  ✓ Mean: ${formatTime(tokenGateResult.mean)}, Overhead: ${formatTime(tokenGateResult.mean - baselineResult.mean)}`
  )

  // 9. 多個安全中間件組合
  console.log('📊 Testing Combined Security Middleware Stack...')
  const securityStackApp = new Hono()
  securityStackApp.use(cors({ origin: 'https://example.com' }))
  securityStackApp.use(
    securityHeaders({
      hsts: true,
      contentSecurityPolicy: true,
    })
  )
  securityStackApp.use(bodySizeLimit(1024 * 1024))
  securityStackApp.use(requireHeaderToken({ token: 'secret' }))
  securityStackApp.get('/', (c) => c.text('OK'))

  const stackResult = await measure(
    'Combined Security Stack (4 middlewares)',
    () => {
      securityStackApp.fetch(
        new Request('http://localhost/', {
          headers: {
            Origin: 'https://example.com',
            'X-API-Token': 'secret',
          },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(stackResult)
  console.log(
    `  ✓ Mean: ${formatTime(stackResult.mean)}, Overhead: ${formatTime(stackResult.mean - baselineResult.mean)}`
  )

  // 10. CORS OPTIONS 預檢請求
  console.log('📊 Testing CORS Preflight (OPTIONS) Request...')
  const corsPreflightApp = new Hono()
  corsPreflightApp.use(cors({ origin: 'https://example.com' }))
  corsPreflightApp.get('/', (c) => c.text('OK'))

  const preflightResult = await measure(
    'CORS Preflight (OPTIONS)',
    () => {
      corsPreflightApp.fetch(
        new Request('http://localhost/', {
          method: 'OPTIONS',
          headers: { Origin: 'https://example.com' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(preflightResult)
  console.log(
    `  ✓ Mean: ${formatTime(preflightResult.mean)}, Overhead: ${formatTime(preflightResult.mean - baselineResult.mean)}`
  )

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(60))

  const securityResults = results.slice(1) // 排除基線
  const avgOverhead =
    securityResults.reduce((sum, r) => sum + (r.mean - baselineResult.mean), 0) /
    securityResults.length
  const maxOverhead = Math.max(...securityResults.map((r) => r.mean - baselineResult.mean))
  const minOverhead = Math.min(...securityResults.map((r) => r.mean - baselineResult.mean))

  console.log(`Baseline: ${formatTime(baselineResult.mean)}`)
  console.log(`Average Middleware Overhead: ${formatTime(avgOverhead)}`)
  console.log(`Min Overhead: ${formatTime(minOverhead)}`)
  console.log(`Max Overhead: ${formatTime(maxOverhead)}`)

  // 中間件開銷排名
  console.log('\n⚡ Middleware Overhead Ranking')
  console.log('─'.repeat(60))

  const ranking = securityResults
    .map((r) => ({
      name: r.name,
      overhead: r.mean - baselineResult.mean,
    }))
    .sort((a, b) => a.overhead - b.overhead)

  ranking.forEach((r, i) => {
    const percentOverhead = ((r.overhead / baselineResult.mean) * 100).toFixed(1)
    console.log(`${i + 1}. ${r.name}: ${formatTime(r.overhead)} (+${percentOverhead}%)`)
  })

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(60))

  results.forEach((r) => {
    const overhead = r.mean - baselineResult.mean
    const status = overhead < 1000 ? '✓ Excellent' : overhead < 5000 ? '⚠ Good' : '✗ Poor'
    console.log(`${r.name}: ${status}`)
  })
}

runSecurityMiddlewareBenchmarks().catch(console.error)
