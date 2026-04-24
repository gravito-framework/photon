/**
 * @fileoverview Streaming Middleware Performance Benchmarks
 *
 * Tests performance of streaming-related middleware:
 * - Server-Sent Events (SSE)
 * - Chunked response streaming
 * - JSON Lines streaming
 *
 * @module photon/perf/streaming-middleware
 */

import { Hono } from 'hono'
import { formatTime, generateReport, measure } from '../utils'

/**
 * 簡單的流式響應模擬
 */
async function* _simpleGenerator() {
  for (let i = 0; i < 10; i++) {
    yield `data: {"message": "chunk ${i}"}\n\n`
  }
}

/**
 * JSON Lines 生成器
 */
async function* _jsonLinesGenerator() {
  for (let i = 0; i < 100; i++) {
    yield `${JSON.stringify({ id: i, value: Math.random() })}\n`
  }
}

/**
 * 流式中間件性能測試
 */
async function runStreamingBenchmarks() {
  console.log('🚀 Starting Streaming Middleware Performance Benchmarks...\n')

  const results = []

  // 基線測試 - 簡單 GET
  console.log('📊 Baseline: Simple GET Response...')
  const baselineApp = new Hono()
  baselineApp.get('/', (c) => c.text('OK'))

  const baselineResult = await measure(
    'Baseline (simple GET)',
    () => {
      baselineApp.fetch(new Request('http://localhost/'))
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(baselineResult)
  console.log(
    `  ✓ Mean: ${formatTime(baselineResult.mean)}, p99: ${formatTime(baselineResult.p99)}`
  )

  // 1. 簡單流式響應
  console.log('📊 Testing Simple Streaming Response...')
  const simpleStreamApp = new Hono()
  simpleStreamApp.get('/stream', async (_c) => {
    return new Response(
      new ReadableStream({
        async start(controller) {
          for (let i = 0; i < 10; i++) {
            controller.enqueue(`data: chunk ${i}\n`)
          }
          controller.close()
        },
      }),
      {
        headers: { 'Content-Type': 'text/event-stream' },
      }
    )
  })

  const simpleStreamResult = await measure(
    'Simple Streaming (10 chunks)',
    () => {
      simpleStreamApp.fetch(new Request('http://localhost/stream'))
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(simpleStreamResult)
  console.log(
    `  ✓ Mean: ${formatTime(simpleStreamResult.mean)}, Overhead: ${formatTime(simpleStreamResult.mean - baselineResult.mean)}`
  )

  // 2. 大量塊流式響應
  console.log('📊 Testing Large Chunked Streaming (100 chunks)...')
  const largeStreamApp = new Hono()
  largeStreamApp.get('/stream', async (_c) => {
    return new Response(
      new ReadableStream({
        async start(controller) {
          for (let i = 0; i < 100; i++) {
            controller.enqueue(`${JSON.stringify({ id: i, value: Math.random() })}\n`)
          }
          controller.close()
        },
      }),
      {
        headers: { 'Content-Type': 'application/x-ndjson' },
      }
    )
  })

  const largeStreamResult = await measure(
    'Large Streaming (100 chunks)',
    () => {
      largeStreamApp.fetch(new Request('http://localhost/stream'))
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(largeStreamResult)
  console.log(
    `  ✓ Mean: ${formatTime(largeStreamResult.mean)}, Overhead: ${formatTime(largeStreamResult.mean - baselineResult.mean)}`
  )

  // 3. Server-Sent Events (SSE) 初始化
  console.log('📊 Testing SSE Initialization...')
  const sseApp = new Hono()
  sseApp.get('/sse', (c) => {
    return c.streaming(async (stream) => {
      await stream.write('data: connected\n\n')
    })
  })

  const sseInitResult = await measure(
    'SSE Initialization',
    () => {
      sseApp.fetch(new Request('http://localhost/sse'))
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(sseInitResult)
  console.log(
    `  ✓ Mean: ${formatTime(sseInitResult.mean)}, Overhead: ${formatTime(sseInitResult.mean - baselineResult.mean)}`
  )

  // 4. SSE 推送單個消息
  console.log('📊 Testing SSE Single Message Push...')
  const sseMessageApp = new Hono()
  sseMessageApp.get('/sse', (c) => {
    return c.streaming(async (stream) => {
      for (let i = 0; i < 10; i++) {
        await stream.write(`data: ${JSON.stringify({ id: i })}\n\n`)
      }
    })
  })

  const sseMessageResult = await measure(
    'SSE 10 Messages',
    () => {
      sseMessageApp.fetch(new Request('http://localhost/sse'))
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(sseMessageResult)
  console.log(
    `  ✓ Mean: ${formatTime(sseMessageResult.mean)}, Overhead: ${formatTime(sseMessageResult.mean - baselineResult.mean)}`
  )

  // 5. 高頻率 SSE 消息
  console.log('📊 Testing High-Frequency SSE (100 messages)...')
  const highFreqSSEApp = new Hono()
  highFreqSSEApp.get('/sse', (c) => {
    return c.streaming(async (stream) => {
      for (let i = 0; i < 100; i++) {
        await stream.write(`data: event-${i}\n\n`)
      }
    })
  })

  const highFreqResult = await measure(
    'High-Freq SSE (100 messages)',
    () => {
      highFreqSSEApp.fetch(new Request('http://localhost/sse'))
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(highFreqResult)
  console.log(
    `  ✓ Mean: ${formatTime(highFreqResult.mean)}, Overhead: ${formatTime(highFreqResult.mean - baselineResult.mean)}`
  )

  // 6. 大型消息體流式
  console.log('📊 Testing Large Message Body Streaming...')
  const largeBodyApp = new Hono()
  largeBodyApp.get('/stream', (c) => {
    return c.streaming(async (stream) => {
      for (let i = 0; i < 10; i++) {
        const largeData = JSON.stringify({
          id: i,
          data: 'x'.repeat(10000), // 10KB 每條消息
        })
        await stream.write(`${largeData}\n`)
      }
    })
  })

  const largeBodyResult = await measure(
    'Streaming Large Bodies (10x 10KB)',
    () => {
      largeBodyApp.fetch(new Request('http://localhost/stream'))
    },
    { iterations: 500, warmup: 5 }
  )
  results.push(largeBodyResult)
  console.log(
    `  ✓ Mean: ${formatTime(largeBodyResult.mean)}, Overhead: ${formatTime(largeBodyResult.mean - baselineResult.mean)}`
  )

  // 7. 背壓處理
  console.log('📊 Testing Backpressure Handling...')
  const backpressureApp = new Hono()
  backpressureApp.get('/stream', (c) => {
    return c.streaming(async (stream) => {
      for (let i = 0; i < 100; i++) {
        const written = await stream.write(`data: chunk-${i}\n`)
        if (!written) {
          // 模擬背壓
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    })
  })

  const backpressureResult = await measure(
    'Backpressure Handling',
    () => {
      backpressureApp.fetch(new Request('http://localhost/stream'))
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(backpressureResult)
  console.log(
    `  ✓ Mean: ${formatTime(backpressureResult.mean)}, Overhead: ${formatTime(backpressureResult.mean - baselineResult.mean)}`
  )

  // 8. JSON Lines 格式流式
  console.log('📊 Testing JSON Lines Streaming...')
  const jsonLinesApp = new Hono()
  jsonLinesApp.get('/jsonlines', (c) => {
    return c.streaming(async (stream) => {
      for (let i = 0; i < 100; i++) {
        await stream.write(`${JSON.stringify({ id: i, value: Math.random() })}\n`)
      }
    })
  })

  const jsonLinesResult = await measure(
    'JSON Lines (100 objects)',
    () => {
      jsonLinesApp.fetch(new Request('http://localhost/jsonlines'))
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(jsonLinesResult)
  console.log(
    `  ✓ Mean: ${formatTime(jsonLinesResult.mean)}, Overhead: ${formatTime(jsonLinesResult.mean - baselineResult.mean)}`
  )

  // 9. CSV 格式流式
  console.log('📊 Testing CSV Streaming...')
  const csvApp = new Hono()
  csvApp.get('/csv', (c) => {
    return c.streaming(async (stream) => {
      // 頭部
      await stream.write('id,name,email,age\n')
      // 資料行
      for (let i = 0; i < 100; i++) {
        await stream.write(`${i},"User ${i}","user${i}@example.com",${20 + (i % 50)}\n`)
      }
    })
  })

  const csvResult = await measure(
    'CSV Streaming (100 rows)',
    () => {
      csvApp.fetch(new Request('http://localhost/csv'))
    },
    { iterations: 1000, warmup: 10 }
  )
  results.push(csvResult)
  console.log(
    `  ✓ Mean: ${formatTime(csvResult.mean)}, Overhead: ${formatTime(csvResult.mean - baselineResult.mean)}`
  )

  // 10. 條件流式（根據客戶端能力）
  console.log('📊 Testing Conditional Streaming...')
  const conditionalApp = new Hono()
  conditionalApp.get('/data', (c) => {
    const acceptStream = c.req.header('accept')?.includes('text/event-stream')

    if (acceptStream) {
      return c.streaming(async (stream) => {
        for (let i = 0; i < 50; i++) {
          await stream.write(`data: ${i}\n\n`)
        }
      })
    }

    return c.json(Array.from({ length: 50 }, (_, i) => ({ id: i })))
  })

  const conditionalResult = await measure(
    'Conditional Streaming (SSE path)',
    () => {
      conditionalApp.fetch(
        new Request('http://localhost/data', {
          headers: { Accept: 'text/event-stream' },
        })
      )
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(conditionalResult)
  console.log(
    `  ✓ Mean: ${formatTime(conditionalResult.mean)}, Overhead: ${formatTime(conditionalResult.mean - baselineResult.mean)}`
  )

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(60))

  const streamingResults = results.slice(1)
  const avgOverhead =
    streamingResults.reduce((sum, r) => sum + (r.mean - baselineResult.mean), 0) /
    streamingResults.length
  const maxOverhead = Math.max(...streamingResults.map((r) => r.mean - baselineResult.mean))
  const minOverhead = Math.min(...streamingResults.map((r) => r.mean - baselineResult.mean))

  console.log(`Baseline: ${formatTime(baselineResult.mean)}`)
  console.log(`Average Streaming Overhead: ${formatTime(avgOverhead)}`)
  console.log(`Min Overhead: ${formatTime(minOverhead)}`)
  console.log(`Max Overhead: ${formatTime(maxOverhead)}`)

  // 性能等級
  console.log('\n⚡ Performance Tier Analysis')
  console.log('─'.repeat(60))

  const tiers = {
    'Ultra-Fast (<100ns)': streamingResults.filter((r) => r.mean - baselineResult.mean < 100),
    'Fast (<1μs)': streamingResults.filter(
      (r) => r.mean - baselineResult.mean >= 100 && r.mean - baselineResult.mean < 1000
    ),
    'Good (<10μs)': streamingResults.filter(
      (r) => r.mean - baselineResult.mean >= 1000 && r.mean - baselineResult.mean < 10000
    ),
    'Acceptable (<100μs)': streamingResults.filter(
      (r) => r.mean - baselineResult.mean >= 10000 && r.mean - baselineResult.mean < 100000
    ),
    'Slow (>100μs)': streamingResults.filter((r) => r.mean - baselineResult.mean >= 100000),
  }

  Object.entries(tiers).forEach(([tier, benchmarks]) => {
    if (benchmarks.length > 0) {
      console.log(`${tier}: ${benchmarks.length} tests`)
      benchmarks.forEach((b) => {
        console.log(`  - ${b.name}: ${formatTime(b.mean - baselineResult.mean)}`)
      })
    }
  })

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(60))

  results.forEach((r) => {
    const overhead = r.mean - baselineResult.mean
    const status =
      overhead < 1000
        ? '✓ Excellent'
        : overhead < 10000
          ? '⚠ Good'
          : overhead < 100000
            ? '⚠ Acceptable'
            : '✗ Poor'
    console.log(`${r.name}: ${status}`)
  })

  // 建議
  console.log('\n💡 Recommendations')
  console.log('─'.repeat(60))
  console.log('1. SSE 適合低頻率推送（<100 msg/s）')
  console.log('2. JSON Lines 適合批量數據導出')
  console.log('3. 實現背壓以防止記憶體積壓')
  console.log('4. 大消息體需要特別注意網絡 I/O')
  console.log('5. 條件流式可根據客戶端能力最佳化')
}

runStreamingBenchmarks().catch(console.error)
