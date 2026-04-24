/**
 * @fileoverview NativePhoton - Gravito Native Engine Exports
 *
 * Provides access to Photon middleware with Gravito's native engine
 * instead of Hono, enabling dual-engine support.
 *
 * @module @gravito/photon/native
 * @since 2.0.0
 */

// Export Gravito's native engine adapter as NativePhoton
export { GravitoEngineAdapter as NativePhoton } from '@gravito/core/adapters'

// Export type-safe context and middleware types for Gravito engine
export type {
  GravitoContext,
  GravitoMiddleware,
  GravitoNext,
} from '@gravito/core/http'
export type { SSEConfig, SSEEvent, SSEHandler, SSEMessage } from './middleware/sse-native'
// Re-export all native SSE implementations
export {
  createSSEResponse,
  NativeSSEStreamingApi as SSEStreamingApi,
} from './middleware/sse-native'
export type { StreamHandler, StreamJSONLinesOptions } from './middleware/streaming-native'
// Re-export all native streaming implementations
export {
  NativeStreamingApi as StreamingApi,
  streamFromGenerator,
  streamJSONLines,
  streamText,
  streamWithHandler,
} from './middleware/streaming-native'

// Re-export all native WebSocket implementations
export {
  defineWSHandler,
  type NativeWSCloseEvent,
  type NativeWSContext,
  type NativeWSEvents,
  type NativeWSMessageEvent,
  type TypedWSContext,
  type TypedWSHandler,
  type WSHandlerConfig,
} from './middleware/websocket'
