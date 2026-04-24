/**
 * @fileoverview Native SSE (Server-Sent Events) Implementation for Photon
 *
 * Provides Server-Sent Events using Web Streams API (TransformStream, ReadableStream)
 * without Hono dependency. Fully backward compatible with existing SSEEvent/SSEHandler types.
 *
 * @module @gravito/photon/middleware/sse-native
 * @since 2.0.0
 */

const sharedDecoder = new TextDecoder()

// Generic context type supporting both Hono and Gravito
type SSEContext = {
  header(key: string, value: string): void
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (100% compatible with existing API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSE Event message format
 * @public
 */
export type SSEMessage = {
  event?: string
  data: string
  id?: string
  retry?: number
}

/**
 * Type-safe SSE event
 * @template TData - Event data type
 * @public
 */
export interface SSEEvent<TData = string> {
  /**
   * Event name (optional)
   * @example 'message', 'update', 'error'
   */
  event?: string

  /**
   * Event data
   */
  data: TData

  /**
   * Event unique ID (optional, for reconnection)
   */
  id?: string

  /**
   * Retry interval in milliseconds (optional)
   */
  retry?: number
}

/**
 * SSE configuration options
 * @public
 */
export interface SSEConfig {
  /**
   * Custom headers to merge with standard SSE headers
   */
  headers?: Record<string, string>

  /**
   * Error callback
   */
  onError?: (error: Error) => void

  /**
   * Whether to skip initial keep-alive ping
   * @default false
   */
  skipInitialPing?: boolean
}

/**
 * SSE handler callback type
 * @template TData - Event data type
 * @public
 */
export type SSEHandler<TData = string> = (
  stream: NativeSSEStreamingApi,
  send: (event: SSEEvent<TData>) => Promise<void>
) => Promise<void>

// ─────────────────────────────────────────────────────────────────────────────
// NativeSSEStreamingApi - Core Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Native SSE streaming API using Web Streams
 * Replaces Hono's SSEStreamingApi with identical interface
 *
 * @public
 */
export class NativeSSEStreamingApi {
  private writeQueue: string[] = []
  private isWriting = false
  private isClosed = false

  constructor(private writable: WritableStream<string>) {}

  /**
   * Write SSE-formatted message
   *
   * Format:
   *   event: <name>\n
   *   data: <payload>\n
   *   id: <id>\n
   *   retry: <ms>\n
   *   \n
   */
  async writeSSE(message: {
    event?: string
    data: string
    id?: string
    retry?: number
  }): Promise<void> {
    if (this.isClosed) {
      throw new Error('SSE stream is closed')
    }

    let sseStr = ''

    if (message.event) {
      sseStr += `event: ${message.event}\n`
    }

    sseStr += `data: ${message.data}\n`

    if (message.id) {
      sseStr += `id: ${message.id}\n`
    }

    if (message.retry) {
      sseStr += `retry: ${message.retry}\n`
    }

    sseStr += '\n' // SSE message separator

    // Queue write to avoid concurrent write conflicts
    this.writeQueue.push(sseStr)
    await this.flushQueue()
  }

  /**
   * Write raw text (used for keep-alive ping)
   */
  async write(data: string | Uint8Array): Promise<void> {
    if (this.isClosed) {
      throw new Error('SSE stream is closed')
    }

    const text = typeof data === 'string' ? data : sharedDecoder.decode(data)
    const writer = this.writable.getWriter()

    try {
      await writer.write(text)
    } catch (err) {
      this.isClosed = true
      throw err
    } finally {
      // Always release lock to prevent stream deadlock (critical!)
      writer.releaseLock()
    }
  }

  /**
   * Close the stream
   */
  async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true
      await this.flushQueue()
      const writer = this.writable.getWriter()
      try {
        await writer.close()
      } catch {
        // Already closed or errored
      } finally {
        // Release lock even on error to prevent deadlock
        try {
          writer.releaseLock()
        } catch {
          // Already released or invalid
        }
      }
    }
  }

  /**
   * Check if stream is aborted
   * In Web Streams, we track via isClosed flag
   */
  get aborted(): boolean {
    return this.isClosed
  }

  /**
   * Sleep utility (preserves Hono API compatibility)
   */
  async sleep(ms: number): Promise<void> {
    if (typeof Bun !== 'undefined') return Bun.sleep(ms)
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Flush queued writes to stream
   */
  private async flushQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return
    }

    this.isWriting = true
    const writer = this.writable.getWriter()

    try {
      while (this.writeQueue.length > 0) {
        const msg = this.writeQueue.shift()!
        try {
          await writer.write(msg)
        } catch (err) {
          // Client disconnected
          console.debug('SSE write failed, client may have disconnected:', err)
          this.writeQueue.length = 0
          this.isClosed = true
          break
        }
      }
    } finally {
      // Always release lock to prevent stream deadlock (critical!)
      try {
        writer.releaseLock()
      } catch {
        // Already released or invalid
      }
      this.isWriting = false
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createSSEResponse - Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a native SSE response using Web Streams API
 *
 * Automatically sets required SSE headers and provides type-safe event sending.
 * Works with both Hono and Gravito contexts.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { createSSEResponse } from '@gravito/photon/middleware/sse'
 *
 * const app = new Photon()
 *
 * // Basic usage
 * app.get('/events', (c) => {
 *   return createSSEResponse(c, async (stream, send) => {
 *     for (let i = 0; i < 5; i++) {
 *       await send({ event: 'update', data: `Event ${i}` })
 *       await stream.sleep(1000)
 *     }
 *   })
 * })
 *
 * // Type-safe structured data
 * interface Update { count: number; status: string }
 *
 * app.get('/typed-events', (c) => {
 *   return createSSEResponse<Update>(c, async (stream, send) => {
 *     await send({ event: 'update', data: { count: 1, status: 'ok' } })
 *   })
 * })
 * ```
 *
 * @param c - Context object (Hono or Gravito)
 * @param handler - SSE handler function
 * @param config - Configuration options
 * @returns Response object with SSE stream
 * @public
 */
export function createSSEResponse<TData = string>(
  c: SSEContext,
  handler: SSEHandler<TData>,
  config: SSEConfig = {}
): Response {
  const { headers = {}, onError, skipInitialPing = false } = config

  // Track all headers set (both standard and custom)
  const responseHeaders = new Headers()

  // Create a header tracking wrapper
  const headerTracker = {
    header(key: string, value: string): void {
      responseHeaders.set(key, value)
      c.header(key, value) // Also call original for context's purposes
    },
  }

  // Set standard SSE headers
  headerTracker.header('Content-Type', 'text/event-stream')
  headerTracker.header('Cache-Control', 'no-cache, no-transform')
  headerTracker.header('Connection', 'keep-alive')
  headerTracker.header('X-Accel-Buffering', 'no')

  // Merge custom headers
  for (const [key, value] of Object.entries(headers)) {
    headerTracker.header(key, value)
  }

  // Create ReadableStream with SSE logic
  const readable = new ReadableStream<string>({
    async start(controller) {
      // Create SSE streaming API backed by controller
      const stream = new NativeSSEStreamingApi(
        new WritableStream<string>({
          write(chunk) {
            controller.enqueue(chunk)
          },
          close() {
            controller.close()
          },
          abort(reason) {
            controller.error(reason)
          },
        })
      )

      // Send initial keep-alive ping if configured
      if (!skipInitialPing) {
        try {
          await stream.writeSSE({ data: '' })
        } catch (err) {
          if (onError) {
            onError(err as Error)
          }
          controller.close()
          return
        }
      }

      // Type-safe event sending helper
      const send = async (event: SSEEvent<TData>): Promise<void> => {
        const dataStr = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)

        try {
          await stream.writeSSE({
            event: event.event,
            data: dataStr,
            id: event.id,
            retry: event.retry,
          })
        } catch (err) {
          if (onError) {
            onError(err as Error)
          }
          throw err
        }
      }

      // Execute user's handler
      try {
        await handler(stream, send)
      } catch (err) {
        if (onError) {
          onError(err as Error)
        } else {
          console.error('SSE handler error:', err)
        }
      } finally {
        await stream.close()
      }
    },
  })

  // Transform text stream to UTF-8 bytes
  const textStream = readable.pipeThrough(new TextEncoderStream())

  return new Response(textStream, {
    status: 200,
    headers: responseHeaders,
  })
}
