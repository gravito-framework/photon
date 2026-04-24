/**
 * @fileoverview Performance Testing Utilities
 *
 * Provides performance measurement, statistics calculation,
 * and report generation tools for Photon benchmarks.
 *
 * @module photon/perf/utils
 */

export interface BenchmarkResult {
  name: string
  iterations: number
  duration: number // 總執行時間（毫秒）
  min: number // 最小值（微秒）
  max: number // 最大值（微秒）
  mean: number // 平均值（微秒）
  median: number // 中位數（微秒）
  stdDev: number // 標準差（微秒）
  p95: number // 95 百分位數（微秒）
  p99: number // 99 百分位數（微秒）
  throughput: number // 每秒吞吐量（ops/sec）
}

interface TimeSample {
  duration: number // 微秒
}

/**
 * 執行基準測試並收集時間樣本
 *
 * @param name 基準測試名稱
 * @param fn 要執行的函數
 * @param options 配置選項
 * @returns 基準測試結果
 *
 * @example
 * ```typescript
 * const result = await measure('Router matching', () => {
 *   router.match('GET', '/api/users')
 * }, { iterations: 10000 })
 * ```
 */
export async function measure(
  name: string,
  fn: () => void,
  options: {
    iterations?: number
    warmup?: number
  } = {}
): Promise<BenchmarkResult> {
  const { iterations = 10000, warmup = 100 } = options

  // 預熱：消除 JIT 編譯影響
  for (let i = 0; i < warmup; i++) {
    fn()
  }

  // 執行測試並收集樣本
  const samples: TimeSample[] = []
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now()
    fn()
    const iterEnd = performance.now()
    samples.push({
      duration: (iterEnd - iterStart) * 1000, // 轉換為微秒
    })
  }

  const endTime = performance.now()
  const totalDuration = endTime - startTime

  // 計算統計數據
  const stats = calculateStats(samples.map((s) => s.duration))

  return {
    name,
    iterations,
    duration: totalDuration,
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    median: stats.median,
    stdDev: stats.stdDev,
    p95: stats.p95,
    p99: stats.p99,
    throughput: (iterations / totalDuration) * 1000, // ops/sec
  }
}

/**
 * 執行異步基準測試並收集時間樣本
 */
export async function measureAsync(
  name: string,
  fn: () => Promise<void>,
  options: {
    iterations?: number
    warmup?: number
  } = {}
): Promise<BenchmarkResult> {
  const { iterations = 1000, warmup = 10 } = options

  // 預熱
  for (let i = 0; i < warmup; i++) {
    await fn()
  }

  // 執行測試並收集樣本
  const samples: TimeSample[] = []
  const startTime = performance.now()

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now()
    await fn()
    const iterEnd = performance.now()
    samples.push({
      duration: (iterEnd - iterStart) * 1000, // 轉換為微秒
    })
  }

  const endTime = performance.now()
  const totalDuration = endTime - startTime

  // 計算統計數據
  const stats = calculateStats(samples.map((s) => s.duration))

  return {
    name,
    iterations,
    duration: totalDuration,
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    median: stats.median,
    stdDev: stats.stdDev,
    p95: stats.p95,
    p99: stats.p99,
    throughput: (iterations / totalDuration) * 1000,
  }
}

/**
 * 計算統計數據
 */
function calculateStats(values: number[]) {
  if (values.length === 0) {
    throw new Error('No values provided')
  }

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  // 計算平均值
  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / values.length

  // 計算中位數
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

  // 計算標準差
  const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)

  // 計算百分位數
  const p95Index = Math.ceil((sorted.length * 95) / 100) - 1
  const p99Index = Math.ceil((sorted.length * 99) / 100) - 1

  return {
    min,
    max,
    mean,
    median,
    stdDev,
    p95: sorted[p95Index],
    p99: sorted[p99Index],
  }
}

/**
 * 生成基準測試報告（Markdown 格式）
 */
export function generateReport(results: BenchmarkResult[]): string {
  const rows = results.map((r) => [
    r.name,
    `${r.mean.toFixed(2)}μs`,
    `${r.median.toFixed(2)}μs`,
    `${r.min.toFixed(2)}`,
    `${r.max.toFixed(2)}`,
    `${r.stdDev.toFixed(2)}`,
    `${r.p95.toFixed(2)}μs`,
    `${r.p99.toFixed(2)}μs`,
    `${r.throughput.toFixed(0)}`,
  ])

  const header = [
    '| Benchmark | Mean | Median | Min | Max | StdDev | p95 | p99 | Throughput |',
    '|-----------|------|--------|-----|-----|--------|-----|-----|-----------|',
  ]

  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')

  return `${header.join('\n')}\n${body}`
}

/**
 * 格式化時間值為可讀的字符串
 */
export function formatTime(microseconds: number): string {
  if (microseconds < 1) {
    return `${(microseconds * 1000).toFixed(2)}ns`
  }
  if (microseconds < 1000) {
    return `${microseconds.toFixed(2)}μs`
  }
  return `${(microseconds / 1000).toFixed(2)}ms`
}

/**
 * 比較兩個基準結果並輸出差異
 */
export function compareResults(
  baseline: BenchmarkResult,
  current: BenchmarkResult
): {
  meanDiff: number // 百分比
  medianDiff: number
  throughputDiff: number
} {
  const meanDiff = ((current.mean - baseline.mean) / baseline.mean) * 100
  const medianDiff = ((current.median - baseline.median) / baseline.median) * 100
  const throughputDiff = ((current.throughput - baseline.throughput) / baseline.throughput) * 100

  return { meanDiff, medianDiff, throughputDiff }
}

/**
 * 內存使用監控
 */
export function getMemoryUsage() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    }
  }
  return null
}

/**
 * 測試內存洩漏：運行函數並檢查內存增長
 */
export async function testMemoryLeak(
  fn: () => Promise<void>,
  iterations = 10000
): Promise<{
  initialHeap: number
  finalHeap: number
  leaked: number
  percentGrowth: number
}> {
  // 強制 GC（如果可用）
  if (globalThis.gc) {
    globalThis.gc()
  }

  const initialMem = getMemoryUsage()
  if (!initialMem) {
    throw new Error('Memory usage not available')
  }
  const initialHeap = initialMem.heapUsed

  // 運行測試
  for (let i = 0; i < iterations; i++) {
    await fn()
  }

  // 強制 GC
  if (globalThis.gc) {
    globalThis.gc()
  }

  const finalMem = getMemoryUsage()
  if (!finalMem) {
    throw new Error('Memory usage not available')
  }
  const finalHeap = finalMem.heapUsed

  const leaked = finalHeap - initialHeap
  const percentGrowth = (leaked / initialHeap) * 100

  return {
    initialHeap,
    finalHeap,
    leaked,
    percentGrowth,
  }
}
