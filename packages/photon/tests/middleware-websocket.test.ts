import { describe, expect, it } from 'bun:test'
import type {
  NativeWSContext,
  TypedWSContext,
  TypedWSHandler,
  WSEvents,
  WSHandlerConfig,
} from '../src/middleware/websocket'
import { defineWebSocketHelper, defineWSHandler } from '../src/middleware/websocket'

// ─────────────────────────────────────────────────────────────────────────────
// 測試輔助：建立 mock WSContext
// ─────────────────────────────────────────────────────────────────────────────

function createMockWSContext(
  overrides?: Partial<{
    send: (data: string | ArrayBuffer | Uint8Array, options?: { compress?: boolean }) => void
    close: (code?: number, reason?: string) => void
    readyState: 0 | 1 | 2 | 3
    url: string
  }>
): NativeWSContext {
  return {
    send: overrides?.send ?? (() => {}),
    close: overrides?.close ?? (() => {}),
    readyState: overrides?.readyState ?? 1,
    url: overrides?.url ? new URL(overrides.url) : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 測試：Re-exports
// ─────────────────────────────────────────────────────────────────────────────

describe('WebSocket Middleware - Re-exports', () => {
  it('應正確 re-export defineWebSocketHelper 函式', () => {
    expect(typeof defineWebSocketHelper).toBe('function')
  })

  it('應正確 export defineWSHandler 函式', () => {
    expect(typeof defineWSHandler).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：defineWSHandler 工廠
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - 工廠函式', () => {
  it('應回傳一個 factory 函式', () => {
    const factory = defineWSHandler({})
    expect(typeof factory).toBe('function')
  })

  it('factory 函式呼叫後應回傳 WSEvents 物件', () => {
    const factory = defineWSHandler({})
    const events = factory(null)

    expect(events).toBeDefined()
    expect(typeof events).toBe('object')
  })

  it('WSEvents 應包含四個事件處理器', () => {
    const factory = defineWSHandler({
      onOpen: () => {},
      onMessage: () => {},
      onClose: () => {},
      onError: () => {},
    })
    const events = factory(null)

    expect(typeof events.onOpen).toBe('function')
    expect(typeof events.onMessage).toBe('function')
    expect(typeof events.onClose).toBe('function')
    expect(typeof events.onError).toBe('function')
  })

  it('未提供 handler 時事件處理器仍存在（noops）', () => {
    const factory = defineWSHandler({})
    const events = factory(null)

    // 即使沒提供 handler，events 也應有這些 key
    expect(events).toHaveProperty('onOpen')
    expect(events).toHaveProperty('onMessage')
    expect(events).toHaveProperty('onClose')
    expect(events).toHaveProperty('onError')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：onOpen 事件
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - onOpen', () => {
  it('應觸發 onOpen 並傳入 TypedWSContext', () => {
    let receivedWs: any = null

    const factory = defineWSHandler({
      onOpen(ws) {
        receivedWs = ws
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext() as any
    events.onOpen(new Event('open'), mockRawWs)

    expect(receivedWs).not.toBeNull()
    expect(typeof (receivedWs as TypedWSContext).send).toBe('function')
    expect(typeof (receivedWs as TypedWSContext).close).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：onMessage 事件
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - onMessage', () => {
  it('應自動解析 JSON 字串（parseMode: json）', () => {
    let received: unknown = null

    const factory = defineWSHandler<{ value: number }>({
      onMessage(data) {
        received = data
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const event = new MessageEvent('message', { data: '{"value":42}' })
    events.onMessage(event, mockRawWs as any)

    expect(received).toEqual({ value: 42 })
  })

  it('JSON 解析失敗時應 fallback 為原始字串', () => {
    let received: unknown = null

    const factory = defineWSHandler<string>(
      {
        onMessage(data) {
          received = data
        },
      },
      { parseMode: 'json', parseErrorBehavior: 'fallback' }
    )

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const event = new MessageEvent('message', { data: 'not-json' })
    events.onMessage(event, mockRawWs as any)

    expect(received).toBe('not-json')
  })

  it('parseMode: text 應回傳原始字串', () => {
    let received: unknown = null

    const factory = defineWSHandler<string>(
      {
        onMessage(data) {
          received = data
        },
      },
      { parseMode: 'text' }
    )

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const event = new MessageEvent('message', { data: '{"value":1}' })
    events.onMessage(event, mockRawWs as any)

    // 即使是 JSON 字串，text 模式也不解析
    expect(received).toBe('{"value":1}')
  })

  it('parseMode: json, parseErrorBehavior: throw 應拋出錯誤', () => {
    const factory = defineWSHandler<unknown>(
      {
        onMessage() {},
      },
      { parseMode: 'json', parseErrorBehavior: 'throw' }
    )

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const event = new MessageEvent('message', { data: 'invalid{json' })

    expect(() => events.onMessage(event, mockRawWs as any)).toThrow()
  })

  it('應傳入 TypedWSContext 給 onMessage', () => {
    let receivedWs: any = null

    const factory = defineWSHandler({
      onMessage(_data, ws) {
        receivedWs = ws
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    events.onMessage(new MessageEvent('message', { data: 'hello' }), mockRawWs as any)

    expect(receivedWs).not.toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：onClose 事件
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - onClose', () => {
  it('應觸發 onClose 並傳入 code 和 reason', () => {
    let receivedCode: any = null
    let receivedReason: any = null

    const factory = defineWSHandler({
      onClose(code, reason) {
        receivedCode = code
        receivedReason = reason
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const event = new CloseEvent('close', { code: 1001, reason: 'Going Away' })
    events.onClose(event, mockRawWs as any)

    expect(receivedCode).toBe(1001)
    expect(receivedReason).toBe('Going Away')
  })

  it('應提供 CloseEvent 預設 code 0 和空 reason', () => {
    let receivedCode: any = null
    let receivedReason: any = null

    const factory = defineWSHandler({
      onClose(code, reason) {
        receivedCode = code
        receivedReason = reason
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    // CloseEvent 不傳 code 和 reason，CloseEvent.code 預設為 0
    const event = new CloseEvent('close')
    events.onClose(event, mockRawWs as any)

    // CloseEvent 不帶 code 時預設為 0
    expect(receivedCode).toBe(0)
    expect(receivedReason).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：onError 事件
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - onError', () => {
  it('應觸發 onError 並傳入 Event 物件', () => {
    let receivedEvent: any = null

    const factory = defineWSHandler({
      onError(event) {
        receivedEvent = event
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext()
    const errorEvent = new Event('error')
    events.onError(errorEvent, mockRawWs as any)

    expect(receivedEvent).not.toBeNull()
    expect((receivedEvent as Event).type).toBe('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：TypedWSContext
// ─────────────────────────────────────────────────────────────────────────────

describe('TypedWSContext - send 方法', () => {
  it('應將字串直接傳送', () => {
    const sentData: string[] = []

    const factory = defineWSHandler<unknown, string>({
      onOpen(ws) {
        ws.send('hello')
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext({
      send: (data) => sentData.push(data as string),
    })
    events.onOpen(new Event('open'), mockRawWs as any)

    expect(sentData).toContain('hello')
  })

  it('應將非字串資料 JSON 序列化後傳送', () => {
    const sentData: string[] = []

    const factory = defineWSHandler<unknown, { status: string }>({
      onOpen(ws) {
        ws.send({ status: 'ok' })
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext({
      send: (data) => sentData.push(data as string),
    })
    events.onOpen(new Event('open'), mockRawWs as any)

    expect(sentData[0]).toBe('{"status":"ok"}')
  })

  it('readyState 應反映底層 WSContext 的狀態', () => {
    let contextReadyState: any = null

    const factory = defineWSHandler({
      onOpen(ws) {
        contextReadyState = ws.readyState
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext({ readyState: 1 })
    events.onOpen(new Event('open'), mockRawWs as any)

    expect(contextReadyState).toBe(1)
  })

  it('close 應呼叫底層 WSContext 的 close 方法', () => {
    let closeCalled = false
    let closeCode: number | undefined
    let closeReason: string | undefined

    const factory = defineWSHandler({
      onOpen(ws) {
        ws.close(1000, 'Normal closure')
      },
    })

    const events = factory(null) as Required<WSEvents>
    const mockRawWs = createMockWSContext({
      close: (code, reason) => {
        closeCalled = true
        closeCode = code
        closeReason = reason
      },
    })
    events.onOpen(new Event('open'), mockRawWs as any)

    expect(closeCalled).toBe(true)
    expect(closeCode).toBe(1000)
    expect(closeReason).toBe('Normal closure')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 測試：泛型型別支援
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - 泛型型別支援', () => {
  it('應支援複雜的 TIn/TOut 型別', () => {
    interface ChatMessage {
      user: string
      text: string
      timestamp: number
    }

    interface ServerResponse {
      event: string
      payload: unknown
    }

    // 驗證型別編譯正確（如果型別錯誤，TypeScript 會在此處報錯）
    const handler: TypedWSHandler<ChatMessage, ServerResponse> = {
      onMessage(data, ws) {
        expect(typeof data.user).toBe('string')
        ws.send({ event: 'echo', payload: data })
      },
    }

    const factory = defineWSHandler<ChatMessage, ServerResponse>(handler)
    expect(typeof factory).toBe('function')
  })

  it('WSHandlerConfig 應接受所有 parseMode 選項', () => {
    const jsonConfig: WSHandlerConfig = { parseMode: 'json' }
    const textConfig: WSHandlerConfig = { parseMode: 'text' }
    const rawConfig: WSHandlerConfig = { parseMode: 'raw' }

    expect(jsonConfig.parseMode).toBe('json')
    expect(textConfig.parseMode).toBe('text')
    expect(rawConfig.parseMode).toBe('raw')
  })
})
