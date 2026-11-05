/** Independent streaming, SSE and WebSocket helpers. NativePhoton moved to integration. */
export type {
  GravitoContext,
  GravitoMiddleware,
  GravitoNext,
} from './engine/http-types'
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
