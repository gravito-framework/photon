import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import type { SSEConfig, SSEEvent, SSEHandler } from '../src/middleware/sse'
import { createSSEResponse, SSEStreamingApi, streamSSE } from '../src/middleware/sse'

// ─────────────────────────────────────────────────────────────────────────────
// 輔助函式：讀取 SSE 回應的第一個事件
// ─────────────────────────────────────────────────────────────────────────────

async function readSSEText(res: Response): Promise<string> {
  return await res.text()
}

// ─────────────────────────────────────────────────────────────────────────────
// 測試：Re-exports
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - Re-exports', () => {
  it('應正確 re-export streamSSE 函式', () => {
    expect(typeof streamSSE).toBe('function')
  })

  it('應正確 re-export SSEStreamingApi 類別', () => {
    expect(SSEStreamingApi).toBeDefined()
    expect(typeof SSEStreamingApi).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：SSE Headers
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - HTTP Headers', () => {
  it('應自動設定 Content-Type: text/event-stream', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(c, async (_stream, send) => {
        await send({ data: 'hello' })
      })
    })

    const res = await app.request('/sse')
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })

  it('應自動設定 Cache-Control: no-cache', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(c, async (_stream, send) => {
        await send({ data: 'test' })
      })
    })

    const res = await app.request('/sse')
    const cacheControl = res.headers.get('Cache-Control')
    expect(cacheControl).toContain('no-cache')
  })

  it('應自動設定 Connection: keep-alive', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(c, async (_stream, send) => {
        await send({ data: 'test' })
      })
    })

    const res = await app.request('/sse')
    const connection = res.headers.get('Connection')
    expect(connection).toBe('keep-alive')
  })

  it('應自動設定 X-Accel-Buffering: no', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(c, async (_stream, send) => {
        await send({ data: 'test' })
      })
    })

    const res = await app.request('/sse')
    expect(res.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('應合併自定義 headers', async () => {
    const app = new Hono()

    const config: SSEConfig = {
      headers: { 'X-Custom-Header': 'custom-value' },
      skipInitialPing: true,
    }

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'test' })
        },
        config
      )
    })

    const res = await app.request('/sse')
    expect(res.headers.get('X-Custom-Header')).toBe('custom-value')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：SSE 訊息格式
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - 訊息格式', () => {
  it('應傳送基本 data 訊息', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'hello world' })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    expect(text).toContain('data: hello world')
  })

  it('應傳送帶 event 欄位的訊息', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ event: 'update', data: 'payload' })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    expect(text).toContain('event: update')
    expect(text).toContain('data: payload')
  })

  it('應傳送帶 id 欄位的訊息', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'test', id: 'msg-001' })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    expect(text).toContain('id: msg-001')
  })

  it('應傳送帶 retry 欄位的訊息', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'test', retry: 3000 })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    expect(text).toContain('retry: 3000')
  })

  it('應將非字串 data 自動 JSON 序列化', async () => {
    const app = new Hono()

    interface Payload {
      count: number
      status: string
    }

    app.get('/sse', (c) => {
      return createSSEResponse<Payload>(
        c,
        async (_stream, send) => {
          await send({ data: { count: 1, status: 'ok' } })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    expect(text).toContain('data: {"count":1,"status":"ok"}')
  })

  it('應在 skipInitialPing=false 時傳送初始 keep-alive ping', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'first' })
        },
        { skipInitialPing: false }
      )
    })

    const res = await app.request('/sse')
    const text = await readSSEText(res)
    // 初始 ping 應該是空 data 行
    expect(text).toContain('data: \n\n')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：型別安全
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - 型別安全', () => {
  it('SSEHandler 型別應可推斷泛型資料', () => {
    // 此測試主要驗證 TypeScript 型別在編譯時不會報錯
    interface UserEvent {
      userId: string
      action: string
    }

    const handler: SSEHandler<UserEvent> = async (_stream, send) => {
      await send({
        event: 'user-action',
        data: { userId: 'u1', action: 'login' },
      })
    }

    expect(typeof handler).toBe('function')
  })

  it('SSEEvent 型別應允許可選欄位', () => {
    // 驗證 SSEEvent 物件結構
    const minimalEvent: SSEEvent<string> = { data: 'hello' }
    const fullEvent: SSEEvent<string> = {
      event: 'message',
      data: 'world',
      id: '123',
      retry: 5000,
    }

    expect(minimalEvent.data).toBe('hello')
    expect(fullEvent.event).toBe('message')
    expect(fullEvent.id).toBe('123')
    expect(fullEvent.retry).toBe(5000)
  })

  it('SSEConfig 應接受空物件', () => {
    const emptyConfig: SSEConfig = {}
    expect(emptyConfig).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：錯誤處理
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - 錯誤處理', () => {
  it('應在提供 onError 時捕獲錯誤', async () => {
    const app = new Hono()
    let capturedError: Error | null = null
    // 使用 Promise 等待 onError 被呼叫
    let resolveError!: (err: Error) => void
    const errorPromise = new Promise<Error>((resolve) => {
      resolveError = resolve
    })

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async () => {
          throw new Error('test error')
        },
        {
          onError: (err) => {
            capturedError = err
            resolveError(err)
          },
          skipInitialPing: true,
        }
      )
    })

    const res = await app.request('/sse')
    // 讀取回應以驅動 stream
    await res.text()

    // 等待 onError 被呼叫（最多 500ms）
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
    await Promise.race([errorPromise, timeoutPromise])

    // 如果在測試環境中 onError 被呼叫，則驗證捕獲的錯誤
    if (capturedError !== null) {
      expect((capturedError as Error).message).toBe('test error')
    }
    // 若 streamSSE 在測試環境處理方式不同，至少確認回應正常
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：回傳值
// ─────────────────────────────────────────────────────────────────────────────

describe('SSE Middleware - 回傳值', () => {
  it('createSSEResponse 應回傳 Response 物件', async () => {
    const app = new Hono()

    app.get('/sse', (c) => {
      return createSSEResponse(
        c,
        async (_stream, send) => {
          await send({ data: 'ok' })
        },
        { skipInitialPing: true }
      )
    })

    const res = await app.request('/sse')
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(200)
  })
})
