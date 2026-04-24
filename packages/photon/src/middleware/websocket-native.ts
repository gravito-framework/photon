/**
 * @fileoverview Native WebSocket Implementation for Photon
 *
 * Provides generic WebSocket types that work with any runtime
 * (Bun, Node.js, browsers, etc.) without Hono dependency.
 * Fully backward compatible with existing WebSocket API.
 *
 * @module @gravito/photon/middleware/websocket-native
 * @since 2.0.0
 */

const sharedDecoder = new TextDecoder()

// ─────────────────────────────────────────────────────────────────────────────
// Generic WebSocket Types (100% compatible with Hono's API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic WebSocket context type supporting any runtime
 * @public
 */
export interface NativeWSContext {
  /**
   * Send a message through WebSocket
   */
  send(data: string): void

  /**
   * Close the WebSocket connection
   */
  close(code?: number, reason?: string): void

  /**
   * WebSocket connection state
   * 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
   */
  readonly readyState: 0 | 1 | 2 | 3

  /**
   * Connection URL
   */
  readonly url: URL | null
}

/**
 * WebSocket message event
 * @public
 */
export interface NativeWSMessageEvent {
  /**
   * Message data (string or binary)
   */
  data: string | ArrayBuffer | Uint8Array

  /**
   * Whether this is the last message (for streaming)
   */
  lastMessageInBatch?: boolean
}

/**
 * WebSocket close event
 * @public
 */
export interface NativeWSCloseEvent {
  /**
   * Close code
   */
  code?: number

  /**
   * Close reason
   */
  reason?: string
}

/**
 * WebSocket event handlers
 * @public
 */
export interface NativeWSEvents {
  /**
   * Called when WebSocket connection opens
   */
  onOpen?(event: Event, ws: NativeWSContext): void | Promise<void>

  /**
   * Called when a message is received
   */
  onMessage?(event: NativeWSMessageEvent, ws: NativeWSContext): void | Promise<void>

  /**
   * Called when WebSocket connection closes
   */
  onClose?(event: NativeWSCloseEvent, ws: NativeWSContext): void | Promise<void>

  /**
   * Called when an error occurs
   */
  onError?(event: Event, ws: NativeWSContext): void | Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Type-Safe WebSocket Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type-safe WebSocket message handler
 *
 * @template TIn - Type of messages received from client
 * @template TOut - Type of messages sent to client
 * @public
 */
export interface TypedWSHandler<TIn = unknown, TOut = unknown> {
  /**
   * Called when connection opens
   */
  onOpen?: (ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * Called when message is received (auto-parsed based on parseMode)
   */
  onMessage?: (data: TIn, ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * Called when connection closes
   */
  onClose?: (code: number, reason: string, ws: TypedWSContext<TOut>) => void | Promise<void>

  /**
   * Called when error occurs
   */
  onError?: (event: Event, ws: TypedWSContext<TOut>) => void | Promise<void>
}

/**
 * Type-safe WebSocket context wrapper
 * @public
 */
export interface TypedWSContext<TOut = unknown> {
  /**
   * Send a message (auto-serializes to JSON if not string)
   */
  send(data: TOut): void

  /**
   * Close the connection
   */
  close(code?: number, reason?: string): void

  /**
   * Connection state (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)
   */
  readonly readyState: 0 | 1 | 2 | 3

  /**
   * Connection URL
   */
  readonly url: URL | null

  /**
   * Access underlying native WebSocket context
   */
  readonly raw: NativeWSContext
}

/**
 * WebSocket handler configuration
 * @public
 */
export interface WSHandlerConfig {
  /**
   * Message parsing mode
   * - 'json': Try JSON parsing, fallback to raw string
   * - 'text': Always return string
   * - 'raw': Return raw message data as-is
   * @default 'json'
   */
  parseMode?: 'json' | 'text' | 'raw'

  /**
   * Behavior when JSON parsing fails
   * - 'fallback': Return raw string (default)
   * - 'throw': Throw error
   * @default 'fallback'
   */
  parseErrorBehavior?: 'fallback' | 'throw'
}

// ─────────────────────────────────────────────────────────────────────────────
// defineWSHandler - Type-Safe Handler Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a type-safe WebSocket handler factory
 *
 * @template TIn - Type of messages received from client
 * @template TOut - Type of messages sent to client
 *
 * @example
 * ```typescript
 * interface ChatMessage { text: string; user: string }
 * interface ServerMessage { event: string; payload: unknown }
 *
 * const handler = defineWSHandler<ChatMessage, ServerMessage>({
 *   onOpen(ws) {
 *     ws.send({ event: 'connected', payload: { status: 'ok' } })
 *   },
 *   onMessage(msg, ws) {
 *     console.log(`${msg.user}: ${msg.text}`)
 *     ws.send({ event: 'echo', payload: msg })
 *   },
 *   onClose(code, reason, ws) {
 *     console.log(`Closed: ${code} ${reason}`)
 *   },
 * })
 * ```
 *
 * @param handler - WebSocket event handlers
 * @param config - Configuration options
 * @returns Handler function that returns native WebSocket events
 * @public
 */
export function defineWSHandler<TIn = unknown, TOut = unknown>(
  handler: TypedWSHandler<TIn, TOut>,
  config: WSHandlerConfig = {}
): (c?: unknown) => NativeWSEvents {
  const { parseMode = 'json', parseErrorBehavior = 'fallback' } = config

  return () => {
    const wsEvents: NativeWSEvents = {
      async onOpen(_event, rawWs) {
        if (!handler.onOpen) {
          return
        }

        const typedWs = createTypedWSContext<TOut>(rawWs)
        try {
          await handler.onOpen(typedWs)
        } catch (err) {
          console.error('[WebSocket] onOpen handler error:', err)
        }
      },

      async onMessage(event, rawWs) {
        if (!handler.onMessage) {
          return
        }

        const typedWs = createTypedWSContext<TOut>(rawWs)
        const rawData = event.data

        let parsedData: TIn

        if (parseMode === 'raw') {
          parsedData = rawData as TIn
        } else if (parseMode === 'text') {
          const textData =
            typeof rawData === 'string' ? rawData : sharedDecoder.decode(rawData as Uint8Array)
          parsedData = textData as TIn
        } else {
          // parseMode === 'json'
          let stringData: string

          if (typeof rawData === 'string') {
            stringData = rawData
          } else if (rawData instanceof ArrayBuffer) {
            stringData = sharedDecoder.decode(rawData)
          } else if (rawData instanceof Uint8Array) {
            stringData = sharedDecoder.decode(rawData)
          } else {
            stringData = String(rawData)
          }

          try {
            parsedData = JSON.parse(stringData) as TIn
          } catch {
            if (parseErrorBehavior === 'throw') {
              throw new Error(`WebSocket JSON parse error: ${stringData}`)
            }
            parsedData = stringData as unknown as TIn
          }
        }

        try {
          await handler.onMessage(parsedData, typedWs)
        } catch (err) {
          console.error('[WebSocket] onMessage handler error:', err)
        }
      },

      async onClose(event, rawWs) {
        if (!handler.onClose) {
          return
        }

        const typedWs = createTypedWSContext<TOut>(rawWs)
        try {
          await handler.onClose(event.code ?? 1000, event.reason ?? '', typedWs)
        } catch (err) {
          console.error('[WebSocket] onClose handler error:', err)
        }
      },

      async onError(event, rawWs) {
        if (!handler.onError) {
          return
        }

        const typedWs = createTypedWSContext<TOut>(rawWs)
        try {
          await handler.onError(event, typedWs)
        } catch (err) {
          console.error('[WebSocket] onError handler error:', err)
        }
      },
    }

    return wsEvents
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a type-safe wrapper around native WebSocket context
 */
function createTypedWSContext<TOut>(rawWs: NativeWSContext): TypedWSContext<TOut> {
  return {
    send(data: TOut): void {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data)
      rawWs.send(serialized)
    },

    close(code?: number, reason?: string): void {
      rawWs.close(code, reason)
    },

    get readyState() {
      return rawWs.readyState
    },

    get url() {
      return rawWs.url
    },

    get raw() {
      return rawWs
    },
  }
}
