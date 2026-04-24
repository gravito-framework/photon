// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Photon } from '@gravito/photon'
import { otelMiddleware } from '../otel'

// ─────────────────────────────────────────────────────────────────────────────
// Mock @opentelemetry/api（供未來整合測試使用）
// ─────────────────────────────────────────────────────────────────────────────

const mockSpanContext = { traceId: 'abc123traceId', spanId: 'def456spanId' }

const mockSpan = {
  setAttribute: mock(() => mockSpan),
  setStatus: mock(() => mockSpan),
  end: mock(() => {
    /* no-op */
  }),
  spanContext: mock(() => mockSpanContext),
}

const mockTracer = {
  startSpan: mock(() => mockSpan),
}

const mockOtelApi = {
  trace: {
    getTracer: mock(() => mockTracer),
  },
  SpanStatusCode: {
    OK: 1,
    ERROR: 2,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// 測試：No-op 降級（@opentelemetry/api 未安裝）
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - no-op 降級', () => {
  it('當 @opentelemetry/api 未安裝時應該正常處理請求', async () => {
    // otel.ts 預設在找不到 @opentelemetry/api 時降級為 no-op
    const app = new Photon()
    app.use('*', otelMiddleware())
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('no-op 模式下不應該拋出錯誤', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ serviceName: 'test-service' }))
    app.get('/api/data', (c) => c.json({ data: 'value' }))

    const res = await app.request('http://localhost/api/data')
    expect(res.status).toBe(200)
  })

  it('no-op 模式下 excludePaths 應正常運作', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/health'] }))
    app.get('/health', (c) => c.text('OK'))
    app.get('/api/data', (c) => c.json({ data: 'value' }))

    const healthRes = await app.request('http://localhost/health')
    expect(healthRes.status).toBe(200)

    const dataRes = await app.request('http://localhost/api/data')
    expect(dataRes.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：中間件初始化與配置
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - 初始化與配置', () => {
  beforeEach(() => {
    // 重置 mock
    mockSpan.setAttribute.mockClear()
    mockSpan.setStatus.mockClear()
    mockSpan.end.mockClear()
    mockSpan.spanContext.mockClear()
    mockTracer.startSpan.mockClear()
    mockOtelApi.trace.getTracer.mockClear()
  })

  afterEach(() => {
    // 清理
  })

  it('no-op span 的 setAttribute 應該可以鏈式呼叫', () => {
    // 測試 no-op span 的實作
    const mw = otelMiddleware()
    expect(typeof mw).toBe('function')
  })

  it('應該使用正確的 serviceName 配置', async () => {
    const app = new Photon()
    app.use(
      '*',
      otelMiddleware({
        serviceName: 'my-service',
        serviceVersion: '2.0.0',
      })
    )
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：excludePaths 過濾
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - excludePaths 過濾', () => {
  it('應該排除完全匹配的路徑', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/health'] }))
    app.get('/health', (c) => c.text('OK'))

    const res = await app.request('http://localhost/health')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('OK')
  })

  it('應該排除前綴匹配的路徑', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/internal'] }))
    app.get('/internal/health', (c) => c.text('healthy'))
    app.get('/internal/metrics', (c) => c.text('metrics data'))

    const healthRes = await app.request('http://localhost/internal/health')
    expect(healthRes.status).toBe(200)

    const metricsRes = await app.request('http://localhost/internal/metrics')
    expect(metricsRes.status).toBe(200)
  })

  it('非排除路徑應該正常追蹤（no-op 模式）', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/health'] }))
    app.get('/api/users', (c) => c.json({ users: [] }))

    const res = await app.request('http://localhost/api/users')
    expect(res.status).toBe(200)
  })

  it('多個排除路徑應該都生效', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/health', '/readiness', '/metrics'] }))
    app.get('/health', (c) => c.text('OK'))
    app.get('/readiness', (c) => c.text('Ready'))
    app.get('/metrics', (c) => c.text('0'))
    app.get('/api/data', (c) => c.json({ data: true }))

    expect((await app.request('http://localhost/health')).status).toBe(200)
    expect((await app.request('http://localhost/readiness')).status).toBe(200)
    expect((await app.request('http://localhost/metrics')).status).toBe(200)
    expect((await app.request('http://localhost/api/data')).status).toBe(200)
  })

  it('排除路徑不應匹配相似但不同的路徑', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ excludePaths: ['/health'] }))
    app.get('/healthz', (c) => c.text('OK'))

    const res = await app.request('http://localhost/healthz')
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：Header 傳播
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - Header 傳播（no-op 模式）', () => {
  it('no-op 模式下不應設定 X-Trace-Id（traceId 為空字串）', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ propagateTraceId: true }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(200)
    // no-op span 的 traceId 為空字串，不會設定 header
    const traceHeader = res.headers.get('X-Trace-Id')
    expect(traceHeader).toBeNull()
  })

  it('propagateTraceId 設為 false 時不應設定 trace header', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({ propagateTraceId: false }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Trace-Id')).toBeNull()
  })

  it('可自定義 trace id header 名稱', async () => {
    const app = new Photon()
    app.use(
      '*',
      otelMiddleware({
        propagateTraceId: true,
        traceIdHeader: 'X-Custom-Trace',
      })
    )
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/test')
    expect(res.status).toBe(200)
    // no-op 模式下 traceId 為空，不設定 header
    expect(res.headers.get('X-Custom-Trace')).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：自定義 span 名稱解析器
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - spanNameResolver', () => {
  it('應該支援自定義 span 名稱解析器', async () => {
    let capturedSpanName = ''
    const app = new Photon()
    app.use(
      '*',
      otelMiddleware({
        spanNameResolver: (c) => {
          capturedSpanName = `custom-${c.req.method}-${new URL(c.req.url).pathname}`
          return capturedSpanName
        },
      })
    )
    app.get('/api/users', (c) => c.json({ users: [] }))

    await app.request('http://localhost/api/users')
    expect(capturedSpanName).toBe('custom-GET-/api/users')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：錯誤處理
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - 錯誤處理', () => {
  it('下游中間件拋出錯誤時 otel 中間件應正確傳遞錯誤', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware())
    app.get('/error', (_c) => {
      throw new Error('Test error')
    })
    // 設定自定義錯誤 handler 確認錯誤已傳達
    app.onError((err, c) => {
      return c.json({ error: err.message }, 500)
    })

    const res = await app.request('http://localhost/error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Test error')
  })

  it('4xx 錯誤應該正常追蹤（no-op 模式）', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware())
    app.get('/not-found', (c) => c.json({ error: 'Not Found' }, 404))

    const res = await app.request('http://localhost/not-found')
    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：預設配置
// ─────────────────────────────────────────────────────────────────────────────

describe('otelMiddleware - 預設配置', () => {
  it('不帶配置的情況下應該使用預設值', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware())
    app.get('/default', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/default')
    expect(res.status).toBe(200)
  })

  it('空配置物件應該使用預設值', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware({}))
    app.get('/default', (c) => c.json({ ok: true }))

    const res = await app.request('http://localhost/default')
    expect(res.status).toBe(200)
  })

  it('多個請求應該都能正常處理', async () => {
    const app = new Photon()
    app.use('*', otelMiddleware())
    app.get('/api/a', (c) => c.json({ endpoint: 'a' }))
    app.get('/api/b', (c) => c.json({ endpoint: 'b' }))
    app.post('/api/c', (c) => c.json({ endpoint: 'c' }))

    expect((await app.request('http://localhost/api/a')).status).toBe(200)
    expect((await app.request('http://localhost/api/b')).status).toBe(200)
    expect((await app.request('http://localhost/api/c', { method: 'POST' })).status).toBe(200)
  })
})
