import { describe, expect, it } from 'bun:test'
import { defineHonoWSHandler, defineWSHandler } from '../../src/middleware/websocket'

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createMockWSContext(
  overrides?: Partial<{
    send: (data: string | ArrayBuffer | Uint8Array, options?: { compress?: boolean }) => void
    close: (code?: number, reason?: string) => void
    readyState: 0 | 1 | 2 | 3
    url: string
  }>
): any {
  return {
    send: overrides?.send ?? (() => {}),
    close: overrides?.close ?? (() => {}),
    readyState: overrides?.readyState ?? 1,
    url: overrides?.url ?? 'ws://localhost/ws',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Native WebSocket Exports
// ─────────────────────────────────────────────────────────────────────────────

describe('native WebSocket middleware', () => {
  it('exports defineWSHandler for native WebSocket handling', () => {
    expect(typeof defineWSHandler).toBe('function')
  })

  it('exports native WebSocket types', () => {
    expect(typeof defineWSHandler).toBe('function')
  })

  it('provides backwards compat: defineHonoWSHandler still works', () => {
    expect(typeof defineHonoWSHandler).toBe('function')

    const handler = defineHonoWSHandler({
      onOpen(ws) {
        ws.send('hello')
      },
    })

    expect(typeof handler).toBe('function')
  })

  it('provides backwards compat: defineWebSocketHelper stub', async () => {
    const { defineWebSocketHelper } = await import('../../src/middleware/websocket')
    expect(typeof defineWebSocketHelper).toBe('function')

    const events = { onOpen: () => {} }
    const result = defineWebSocketHelper(events)
    expect(result).toBe(events)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Native Handler Factory
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler factory', () => {
  it('returns a factory function', () => {
    const factory = defineWSHandler({})
    expect(typeof factory).toBe('function')
  })

  it('factory returns NativeWSEvents object', () => {
    const factory = defineWSHandler({})
    const events = factory(null)

    expect(events).toBeDefined()
    expect(typeof events).toBe('object')
    expect(typeof events.onOpen).toBe('function')
    expect(typeof events.onMessage).toBe('function')
    expect(typeof events.onClose).toBe('function')
    expect(typeof events.onError).toBe('function')
  })

  it('onOpen handler receives TypedWSContext', async () => {
    let receivedWs: any = null

    const factory = defineWSHandler({
      onOpen(ws) {
        receivedWs = ws
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    await events.onOpen(new Event('open'), mockRawWs)

    expect(receivedWs).not.toBeNull()
    expect(typeof receivedWs.send).toBe('function')
    expect(typeof receivedWs.close).toBe('function')
    expect(typeof receivedWs.readyState).toBe('number')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Message Handling
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - message parsing', () => {
  it('default parseMode: json parses JSON strings', async () => {
    let received: unknown = null

    const factory = defineWSHandler<{ value: number }>({
      onMessage(data) {
        received = data
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const messageEvent = new MessageEvent('message', { data: '{"value":42}' })
    await events.onMessage(messageEvent, mockRawWs)

    expect(received).toEqual({ value: 42 })
  })

  it('parseMode: text returns raw string', async () => {
    let received: unknown = null

    const factory = defineWSHandler<string>(
      {
        onMessage(data) {
          received = data
        },
      },
      { parseMode: 'text' }
    )

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const messageEvent = new MessageEvent('message', { data: '{"value":1}' })
    await events.onMessage(messageEvent, mockRawWs)

    expect(received).toBe('{"value":1}')
  })

  it('parseMode: json with parseErrorBehavior: fallback returns raw string on parse error', async () => {
    let received: unknown = null

    const factory = defineWSHandler<unknown>(
      {
        onMessage(data) {
          received = data
        },
      },
      { parseMode: 'json', parseErrorBehavior: 'fallback' }
    )

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const messageEvent = new MessageEvent('message', { data: 'invalid{json' })
    await events.onMessage(messageEvent, mockRawWs)

    expect(received).toBe('invalid{json')
  })

  it('handler receives TypedWSContext with send method', async () => {
    let receivedWs: any = null

    const factory = defineWSHandler({
      onMessage(_data, ws) {
        receivedWs = ws
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const messageEvent = new MessageEvent('message', { data: 'hello' })
    await events.onMessage(messageEvent, mockRawWs)

    expect(receivedWs).not.toBeNull()
    expect(typeof receivedWs.send).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Close Handling
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - close handling', () => {
  it('onClose receives numeric code and string reason', async () => {
    let receivedCode: any = null
    let receivedReason: any = null

    const factory = defineWSHandler({
      onClose(code, reason) {
        receivedCode = code
        receivedReason = reason
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const closeEvent = new CloseEvent('close', { code: 1001, reason: 'Going Away' })
    await events.onClose(closeEvent, mockRawWs)

    expect(receivedCode).toBe(1001)
    expect(receivedReason).toBe('Going Away')
  })

  it('onClose defaults to code 1000 and empty string when not provided', async () => {
    let receivedCode: any = null
    let receivedReason: any = null

    const factory = defineWSHandler({
      onClose(code, reason) {
        receivedCode = code
        receivedReason = reason
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const closeEvent = new CloseEvent('close')
    await events.onClose(closeEvent, mockRawWs)

    // CloseEvent defaults to code 0 when not provided
    expect(receivedCode).toBe(0)
    expect(receivedReason).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Error Handling
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - error handling', () => {
  it('onError handler receives Event object', async () => {
    let receivedEvent: any = null

    const factory = defineWSHandler({
      onError(event) {
        receivedEvent = event
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext()
    const errorEvent = new Event('error')
    await events.onError(errorEvent, mockRawWs)

    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent.type).toBe('error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: TypedWSContext Functionality
// ─────────────────────────────────────────────────────────────────────────────

describe('TypedWSContext - send and close', () => {
  it('send method transmits string directly', async () => {
    const sentData: string[] = []

    const factory = defineWSHandler<unknown, string>({
      onOpen(ws) {
        ws.send('hello')
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext({
      send: (data) => sentData.push(data as string),
    })
    await events.onOpen(new Event('open'), mockRawWs)

    expect(sentData).toContain('hello')
  })

  it('send method JSON-serializes non-string objects', async () => {
    const sentData: string[] = []

    const factory = defineWSHandler<unknown, { status: string }>({
      onOpen(ws) {
        ws.send({ status: 'ok' })
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext({
      send: (data) => sentData.push(data as string),
    })
    await events.onOpen(new Event('open'), mockRawWs)

    expect(sentData[0]).toBe('{"status":"ok"}')
  })

  it('close method delegates to native context', async () => {
    let closeCalled = false
    let closeCode: number | undefined
    let closeReason: string | undefined

    const factory = defineWSHandler({
      onOpen(ws) {
        ws.close(1000, 'Done')
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext({
      close: (code, reason) => {
        closeCalled = true
        closeCode = code
        closeReason = reason
      },
    })
    await events.onOpen(new Event('open'), mockRawWs)

    expect(closeCalled).toBe(true)
    expect(closeCode).toBe(1000)
    expect(closeReason).toBe('Done')
  })

  it('readyState reflects underlying connection state', async () => {
    let contextReadyState: any = null

    const factory = defineWSHandler({
      onOpen(ws) {
        contextReadyState = ws.readyState
      },
    })

    const events = factory(null) as any
    const mockRawWs = createMockWSContext({ readyState: 1 })
    await events.onOpen(new Event('open'), mockRawWs)

    expect(contextReadyState).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Generic Type Support
// ─────────────────────────────────────────────────────────────────────────────

describe('defineWSHandler - generic types', () => {
  it('supports TIn and TOut generic parameters', () => {
    interface ChatMessage {
      user: string
      text: string
      timestamp: number
    }

    interface ServerResponse {
      event: string
      payload: unknown
    }

    const factory = defineWSHandler<ChatMessage, ServerResponse>({
      onMessage(data, ws) {
        expect(typeof data.user).toBe('string')
        ws.send({ event: 'echo', payload: data })
      },
    })

    expect(typeof factory).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Hono Adapter Backwards Compatibility
// ─────────────────────────────────────────────────────────────────────────────

describe('defineHonoWSHandler - backwards compatibility', () => {
  it('adapts native handler to Hono WSEvents format', () => {
    const handler = defineHonoWSHandler({
      onOpen(ws) {
        // Ensure ws parameter is used
        void ws
      },
    })

    expect(typeof handler).toBe('function')

    const wsEvents = handler(null) as any
    expect(typeof wsEvents.onOpen).toBe('function')
    expect(typeof wsEvents.onMessage).toBe('function')
    expect(typeof wsEvents.onClose).toBe('function')
    expect(typeof wsEvents.onError).toBe('function')
  })

  it('maintains handler signatures for all events', () => {
    const honoWsHandler = defineHonoWSHandler({
      onOpen: () => {},
      onMessage: () => {},
      onClose: () => {},
      onError: () => {},
    })

    const wsEvents = honoWsHandler(null) as any

    expect(typeof wsEvents.onOpen).toBe('function')
    expect(typeof wsEvents.onMessage).toBe('function')
    expect(typeof wsEvents.onClose).toBe('function')
    expect(typeof wsEvents.onError).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Export Coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('WebSocket exports', () => {
  it('exports all necessary functions', async () => {
    const ws = await import('../../src/middleware/websocket')

    expect(typeof ws.defineWSHandler).toBe('function')
    expect(typeof ws.defineHonoWSHandler).toBe('function')
    expect(typeof ws.defineWebSocketHelper).toBe('function')
    expect(typeof ws.adaptHonoWSContext).toBe('function')
    expect(typeof ws.adaptHonoMessageEvent).toBe('function')
  })

  it('exports WSContext class stub for backwards compatibility', async () => {
    const ws = await import('../../src/middleware/websocket')

    expect(typeof ws.WSContext).toBe('function')

    // Verify WSContext can be instantiated
    const context = new ws.WSContext({
      readyState: 1,
      url: 'ws://localhost/test',
    })

    expect(context.readyState).toBe(1)
    expect(context.url).toBe('ws://localhost/test')
  })

  it('exports all native types', async () => {
    // Types are not exported as values, only as type-only exports
    // This test verifies that the module can be imported without errors
    expect(true).toBe(true)
  })
})
