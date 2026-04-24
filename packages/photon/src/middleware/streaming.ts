/**
 * @fileoverview Streaming Middleware for Photon
 *
 * Provides streaming using native Web Streams API.
 * AsyncGenerator to HTTP stream conversion, NDJSON streaming support.
 *
 * @module @gravito/photon/middleware/streaming
 * @since 2.0.0
 */

export type { StreamHandler, StreamJSONLinesOptions } from './streaming-native'
// Re-export native streaming implementation (zero Hono dependency)
export {
  NativeStreamingApi as StreamingApi,
  streamFromGenerator,
  streamJSONLines,
  streamText,
  streamWithHandler,
} from './streaming-native'

// Backward compatibility: stream is an alias for streamWithHandler (Hono's stream API pattern)
import { streamWithHandler as _streamWithHandler } from './streaming-native'

/**
 * Alias for streamWithHandler (backward compatibility with Hono's stream API)
 * Provides handler-based streaming: stream(c, async (s) => { await s.write(...) })
 * @deprecated Use streamWithHandler instead
 */
export const stream = _streamWithHandler
