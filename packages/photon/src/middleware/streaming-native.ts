/**
 * @fileoverview Native Streaming Implementation for Photon
 *
 * Provides streaming using Web Streams API (ReadableStream, TextEncoderStream)
 * without Hono dependency. Fully backward compatible with existing Streaming API.
 *
 * @module @gravito/photon/middleware/streaming-native
 * @since 2.0.0
 */

// Generic context type supporting both Hono and Gravito
type StreamingContext = {
  header(key: string, value: string): void
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (100% compatible with existing API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for streamJSONLines function
 * @public
 */
export interface StreamJSONLinesOptions {
  /**
   * Batch size for batch mode (line-by-line if undefined)
   *
   * When set to > 1, collects multiple items before writing to stream.
   * Reduces write() call overhead, suitable for high-throughput scenarios.
   *
   * @default undefined (line-by-line mode, backward compatible)
   */
  batchSize?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// NativeStreamingApi - Core Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Native streaming API using Web Streams
 * Replaces Hono's StreamingApi with identical interface
 *
 * @public
 */
const sharedEncoder = new TextEncoder()

export class NativeStreamingApi {
  private isClosed = false

  constructor(private writable: WritableStream<Uint8Array>) {}

  /**
   * Write text or binary data
   */
  async write(data: string | Uint8Array): Promise<void> {
    if (this.isClosed) {
      throw new Error('Stream is closed')
    }

    const bytes = typeof data === 'string' ? sharedEncoder.encode(data) : data
    const writer = this.writable.getWriter()

    try {
      await writer.write(bytes)
    } catch (err) {
      this.isClosed = true
      throw err
    } finally {
      // Always release lock to prevent stream deadlock (critical!)
      writer.releaseLock()
    }
  }

  /**
   * Write a line of text (appends \n automatically)
   */
  async writeln(data: string): Promise<void> {
    await this.write(`${data}\n`)
  }

  /**
   * Close the stream
   */
  async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true
      const writer = this.writable.getWriter()
      try {
        await writer.close()
      } catch {
        // Already closed or errored
      } finally {
        // Always release lock to prevent stream deadlock (critical!)
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
   * Synchronous write (best effort, returns false if cannot write)
   * Note: Web Streams are async-only, so this always returns false
   */
  writeSync(_data: string | Uint8Array): boolean {
    // Web Streams API is async-only
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// streamFromGenerator - AsyncGenerator to HTTP Stream
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an AsyncGenerator to an HTTP stream response
 *
 * Suitable for LLM response streaming, real-time data pushing, etc.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { streamFromGenerator } from '@gravito/photon/middleware/streaming'
 *
 * const app = new Photon()
 *
 * app.get('/llm', (c) => {
 *   async function* generate() {
 *     yield 'Hello '
 *     yield 'from '
 *     yield 'LLM!'
 *   }
 *   return streamFromGenerator(c, generate())
 * })
 * ```
 *
 * @param c - Context object (Hono or Gravito)
 * @param generator - AsyncGenerator yielding strings or Uint8Array
 * @param contentType - Response Content-Type (default: text/plain; charset=utf-8)
 * @returns Response object with streamed content
 * @public
 */
export function streamFromGenerator(
  c: StreamingContext,
  generator: AsyncGenerator<string | Uint8Array>,
  contentType = 'text/plain; charset=utf-8'
): Response {
  // Track all headers set via c.header() for Response
  const responseHeaders = new Headers()

  const headerTracker = {
    header(key: string, value: string): void {
      responseHeaders.set(key, value)
      c.header(key, value) // Also call original for context's purposes
    },
  }

  headerTracker.header('Content-Type', contentType)

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = new NativeStreamingApi(
        new WritableStream<Uint8Array>({
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

      try {
        for await (const chunk of generator) {
          if (stream.aborted) {
            break
          }
          await stream.write(chunk)
        }
      } catch (err) {
        controller.error(err)
      } finally {
        await stream.close()
      }
    },
  })

  return new Response(readable, { status: 200, headers: responseHeaders })
}

// ─────────────────────────────────────────────────────────────────────────────
// streamJSONLines - NDJSON Streaming
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stream AsyncGenerator as NDJSON (newline-delimited JSON)
 *
 * NDJSON format: each line is a standalone JSON object.
 * Suitable for LLM responses, large dataset streaming.
 * Content-Type is automatically set to application/x-ndjson.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { streamJSONLines } from '@gravito/photon/middleware/streaming'
 *
 * const app = new Photon()
 *
 * // Line-by-line mode (default, backward compatible)
 * app.get('/stream-data', (c) => {
 *   async function* generateItems() {
 *     yield { id: 1, message: 'First item' }
 *     yield { id: 2, message: 'Second item' }
 *     yield { id: 3, message: 'Third item' }
 *   }
 *   return streamJSONLines(c, generateItems())
 * })
 *
 * // Batch mode (high-throughput, 50 items per batch)
 * app.get('/stream-bulk', (c) => {
 *   async function* generateBulk() {
 *     for (let i = 0; i < 10000; i++) {
 *       yield { id: i, value: Math.random() }
 *     }
 *   }
 *   return streamJSONLines(c, generateBulk(), { batchSize: 50 })
 * })
 * ```
 *
 * @param c - Context object (Hono or Gravito)
 * @param generator - AsyncGenerator yielding objects
 * @param options - Configuration options (batchSize for batch mode)
 * @returns Response object with NDJSON stream
 * @public
 */
export function streamJSONLines<T>(
  c: StreamingContext,
  generator: AsyncGenerator<T>,
  options?: StreamJSONLinesOptions
): Response {
  // Track all headers set via c.header() for Response
  const responseHeaders = new Headers()

  const headerTracker = {
    header(key: string, value: string): void {
      responseHeaders.set(key, value)
      c.header(key, value) // Also call original for context's purposes
    },
  }

  headerTracker.header('Content-Type', 'application/x-ndjson')
  headerTracker.header('X-Content-Type-Options', 'nosniff')
  headerTracker.header('Transfer-Encoding', 'chunked')

  const batchSize = options?.batchSize
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = new NativeStreamingApi(
        new WritableStream<Uint8Array>({
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

      try {
        if (batchSize !== undefined && batchSize > 1) {
          // Batch mode: collect multiple items, serialize once, write in bulk
          const batch: T[] = []

          for await (const item of generator) {
            if (stream.aborted) {
              break
            }

            batch.push(item)

            if (batch.length >= batchSize) {
              // Batch reached limit, serialize and write all items at once
              const lines = `${batch.map((i) => JSON.stringify(i)).join('\n')}\n`
              await stream.write(lines)
              batch.length = 0
            }
          }

          // Flush remaining items (< batchSize)
          if (batch.length > 0 && !stream.aborted) {
            const lines = `${batch.map((i) => JSON.stringify(i)).join('\n')}\n`
            await stream.write(lines)
          }
        } else {
          // Line-by-line mode (default): serialize and write each item individually
          for await (const item of generator) {
            if (stream.aborted) {
              break
            }
            await stream.writeln(JSON.stringify(item))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        await stream.close()
      }
    },
  })

  return new Response(readable, { status: 200, headers: responseHeaders })
}

// ─────────────────────────────────────────────────────────────────────────────
// streamText - Text Streaming Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stream AsyncGenerator of text chunks
 *
 * Convenience function that automatically sets text/plain Content-Type
 * and handles text encoding.
 *
 * @param c - Context object (Hono or Gravito)
 * @param generator - AsyncGenerator yielding text strings
 * @returns Response object with text stream
 * @public
 */
export async function streamText(
  c: StreamingContext,
  generator: AsyncGenerator<string>
): Promise<Response> {
  c.header('Content-Type', 'text/plain; charset=utf-8')

  const readable = new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(chunk)
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  }).pipeThrough(new TextEncoderStream())

  return new Response(readable, { status: 200 })
}

// ─────────────────────────────────────────────────────────────────────────────
// streamWithHandler - Handler-based Streaming API (Hono backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stream handler callback type
 * @public
 */
export type StreamHandler = (stream: NativeStreamingApi) => Promise<void>

/**
 * Stream using handler callback function (Hono backward compatibility)
 *
 * Provides a handler-based streaming API for direct control over stream write operations.
 *
 * @example
 * ```typescript
 * app.get('/stream', (c) => {
 *   return streamWithHandler(c, async (s) => {
 *     await s.write('chunk 1')
 *     await s.writeln('chunk 2')
 *     await s.close()
 *   })
 * })
 * ```
 *
 * @param c - Context object (Hono or Gravito)
 * @param handler - Handler function receiving StreamingApi instance
 * @param contentType - Response Content-Type (default: text/plain; charset=utf-8)
 * @returns Response object with streamed content
 * @public
 */
export function streamWithHandler(
  c: StreamingContext,
  handler: StreamHandler,
  contentType = 'text/plain; charset=utf-8'
): Response {
  c.header('Content-Type', contentType)

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stream = new NativeStreamingApi(
        new WritableStream<Uint8Array>({
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

      try {
        await handler(stream)
      } catch (err) {
        controller.error(err)
      } finally {
        await stream.close()
      }
    },
  })

  return new Response(readable, { status: 200 })
}
