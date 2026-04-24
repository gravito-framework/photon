/**
 * @fileoverview Rate Limit Middleware Performance Benchmarks
 *
 * Tests performance of rate limiting middleware:
 * - Memory-based rate limiter
 * - Redis-based rate limiter (simulated)
 * - Various rate limit configurations
 *
 * @module photon/perf/rate-limit-middleware
 */

import { Hono } from 'hono'
import { rateLimit } from '../../src/middleware/ratelimit'
import { formatTime, generateReport, measure } from '../utils'

/**
 * 模擬 Redis 客戶端（用於性能測試）
 */
class MockRedisClient {
  private store = new Map<string, { count: number; expiredAt: number }>()

  async incr(key: string): Promise<number> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (entry && entry.expiredAt > now) {
      entry.count++
      return entry.count
    }

    this.store.set(key, {
      count: 1,
      expiredAt: now + 60000,
    })
    return 1
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

/**
 * Rate Limit 中間件性能測試
 */
async function runRateLimitBenchmarks() {
  console.log('🚀 Starting Rate Limit Middleware Performance Benchmarks...\n')

  const results = []

  // 基線測試
  console.log('📊 Baseline: No Rate Limit...')
  const baselineApp = new Hono()
  baselineApp.get('/', (c) => c.text('OK'))

  const baselineResult = await measure(
    'Baseline (no rate limit)',
    () => {
      baselineApp.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(baselineResult)
  console.log(
    `  ✓ Mean: ${formatTime(baselineResult.mean)}, p99: ${formatTime(baselineResult.p99)}`
  )

  // 1. 記憶體 Rate Limit - 寬鬆限制（1000 req/min）
  console.log('📊 Testing Memory Rate Limit (loose - 1000 req/min)...')
  const memLooseApp = new Hono()
  memLooseApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 1000,
      store: 'memory',
    })
  )
  memLooseApp.get('/', (c) => c.text('OK'))

  const memLooseResult = await measure(
    'Memory Rate Limit (1000 req/min)',
    () => {
      memLooseApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.1' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(memLooseResult)
  console.log(
    `  ✓ Mean: ${formatTime(memLooseResult.mean)}, Overhead: ${formatTime(memLooseResult.mean - baselineResult.mean)}`
  )

  // 2. 記憶體 Rate Limit - 中等限制（100 req/min）
  console.log('📊 Testing Memory Rate Limit (medium - 100 req/min)...')
  const memMediumApp = new Hono()
  memMediumApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      store: 'memory',
    })
  )
  memMediumApp.get('/', (c) => c.text('OK'))

  const memMediumResult = await measure(
    'Memory Rate Limit (100 req/min)',
    () => {
      memMediumApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.2' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(memMediumResult)
  console.log(
    `  ✓ Mean: ${formatTime(memMediumResult.mean)}, Overhead: ${formatTime(memMediumResult.mean - baselineResult.mean)}`
  )

  // 3. 記憶體 Rate Limit - 嚴格限制（10 req/min）
  console.log('📊 Testing Memory Rate Limit (strict - 10 req/min)...')
  const memStrictApp = new Hono()
  memStrictApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 10,
      store: 'memory',
    })
  )
  memStrictApp.get('/', (c) => c.text('OK'))

  const memStrictResult = await measure(
    'Memory Rate Limit (10 req/min)',
    () => {
      memStrictApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.3' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(memStrictResult)
  console.log(
    `  ✓ Mean: ${formatTime(memStrictResult.mean)}, Overhead: ${formatTime(memStrictResult.mean - baselineResult.mean)}`
  )

  // 4. 在限制內 - 通過
  console.log('📊 Testing Rate Limit (under limit - pass)...')
  const passApp = new Hono()
  passApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      store: 'memory',
    })
  )
  passApp.get('/', (c) => c.text('OK'))

  const passResult = await measure(
    'Rate Limit (under limit - pass)',
    () => {
      passApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.4' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(passResult)
  console.log(
    `  ✓ Mean: ${formatTime(passResult.mean)}, Overhead: ${formatTime(passResult.mean - baselineResult.mean)}`
  )

  // 5. 超過限制 - 拒絕
  console.log('📊 Testing Rate Limit (over limit - reject)...')
  const overLimitApp = new Hono()
  overLimitApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 5,
      store: 'memory',
    })
  )
  overLimitApp.get('/', (c) => c.text('OK'))

  // 先消耗配額
  for (let i = 0; i < 5; i++) {
    await overLimitApp.fetch(
      new Request('http://localhost/', {
        headers: { 'x-forwarded-for': '192.168.1.5' },
      })
    )
  }

  const overLimitResult = await measure(
    'Rate Limit (over limit - reject)',
    () => {
      overLimitApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.5' },
        })
      )
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(overLimitResult)
  console.log(
    `  ✓ Mean: ${formatTime(overLimitResult.mean)}, Overhead: ${formatTime(overLimitResult.mean - baselineResult.mean)}`
  )

  // 6. 自定義 Key 生成器
  console.log('📊 Testing Rate Limit with Custom Key Generator...')
  const customKeyApp = new Hono()
  customKeyApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      store: 'memory',
      keyGenerator: (c) => `${c.req.header('user-id')}-${c.req.method}`,
    })
  )
  customKeyApp.get('/', (c) => c.text('OK'))

  const customKeyResult = await measure(
    'Rate Limit (custom key generator)',
    () => {
      customKeyApp.fetch(
        new Request('http://localhost/', {
          headers: { 'user-id': 'user-123' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(customKeyResult)
  console.log(
    `  ✓ Mean: ${formatTime(customKeyResult.mean)}, Overhead: ${formatTime(customKeyResult.mean - baselineResult.mean)}`
  )

  // 7. 跳過某些請求
  console.log('📊 Testing Rate Limit with Skip Condition...')
  const skipApp = new Hono()
  skipApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      store: 'memory',
      skip: (c) => c.req.header('x-skip-rate-limit') === 'true',
    })
  )
  skipApp.get('/', (c) => c.text('OK'))

  const skipResult = await measure(
    'Rate Limit (skip condition - skipped)',
    () => {
      skipApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-skip-rate-limit': 'true' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(skipResult)
  console.log(
    `  ✓ Mean: ${formatTime(skipResult.mean)}, Overhead: ${formatTime(skipResult.mean - baselineResult.mean)}`
  )

  // 8. Redis Rate Limit（模擬）
  console.log('📊 Testing Redis Rate Limit (simulated)...')
  const mockRedis = new MockRedisClient()
  const redisApp = new Hono()
  redisApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 100,
      store: 'redis',
      redisClient: mockRedis as any,
    })
  )
  redisApp.get('/', (c) => c.text('OK'))

  const redisResult = await measure(
    'Redis Rate Limit (simulated)',
    async () => {
      await redisApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.6' },
        })
      )
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(redisResult)
  console.log(
    `  ✓ Mean: ${formatTime(redisResult.mean)}, Overhead: ${formatTime(redisResult.mean - baselineResult.mean)}`
  )

  // 9. 多個時間窗口
  console.log('📊 Testing Rate Limit with Multiple Windows...')
  const multiWindowApp = new Hono()
  multiWindowApp.use(
    rateLimit({
      windowMs: 1000,
      maxRequests: 100,
      store: 'memory',
    })
  )
  multiWindowApp.use(
    rateLimit({
      windowMs: 60000,
      maxRequests: 10000,
      store: 'memory',
    })
  )
  multiWindowApp.get('/', (c) => c.text('OK'))

  const multiWindowResult = await measure(
    'Rate Limit (multiple windows)',
    () => {
      multiWindowApp.fetch(
        new Request('http://localhost/', {
          headers: { 'x-forwarded-for': '192.168.1.7' },
        })
      )
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(multiWindowResult)
  console.log(
    `  ✓ Mean: ${formatTime(multiWindowResult.mean)}, Overhead: ${formatTime(multiWindowResult.mean - baselineResult.mean)}`
  )

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(60))

  const rateLimitResults = results.slice(1)
  const avgOverhead =
    rateLimitResults.reduce((sum, r) => sum + (r.mean - baselineResult.mean), 0) /
    rateLimitResults.length
  const maxOverhead = Math.max(...rateLimitResults.map((r) => r.mean - baselineResult.mean))
  const minOverhead = Math.min(...rateLimitResults.map((r) => r.mean - baselineResult.mean))

  console.log(`Baseline: ${formatTime(baselineResult.mean)}`)
  console.log(`Average Rate Limit Overhead: ${formatTime(avgOverhead)}`)
  console.log(`Min Overhead: ${formatTime(minOverhead)}`)
  console.log(`Max Overhead: ${formatTime(maxOverhead)}`)

  // 配置對比
  console.log('\n⚙️ Configuration Comparison')
  console.log('─'.repeat(60))

  const memResults = results.slice(1, 4)
  console.log('Memory Rate Limiter (by strictness):')
  memResults.forEach((r) => {
    const overhead = r.mean - baselineResult.mean
    const percentOverhead = ((overhead / baselineResult.mean) * 100).toFixed(1)
    console.log(`  ${r.name}: ${formatTime(r.mean)} (+${percentOverhead}% overhead)`)
  })

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(60))

  results.forEach((r) => {
    const overhead = r.mean - baselineResult.mean
    const status =
      overhead < 1000
        ? '✓ Excellent'
        : overhead < 5000
          ? '⚠ Good'
          : overhead < 10000
            ? '⚠ Acceptable'
            : '✗ Poor'
    console.log(`${r.name}: ${status}`)
  })

  // 建議
  console.log('\n💡 Recommendations')
  console.log('─'.repeat(60))
  console.log('1. Memory rate limit 適合低流量應用 (<1000 req/s)')
  console.log('2. Redis rate limit 適合高流量應用和分佈式系統')
  console.log('3. 使用寬鬆限制（1000+ req/min）減少 CPU 開銷')
  console.log('4. 為高可信任 IP 使用 skip 條件')
  console.log('5. 多時間窗口的開銷為線性增長')
}

runRateLimitBenchmarks().catch(console.error)
