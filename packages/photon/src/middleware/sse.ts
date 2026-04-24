/**
 * @fileoverview SSE (Server-Sent Events) 中間件 for Photon
 *
 * 提供 Server-Sent Events 的類型安全封裝，使用原生 Web Streams API。
 * 自動設定正確的 SSE headers（Cache-Control、Connection、Content-Type）。
 *
 * @module @gravito/photon/middleware/sse
 * @since 2.0.0
 */

export type { SSEConfig, SSEEvent, SSEHandler, SSEMessage } from './sse-native'
// Re-export native SSE implementation (zero Hono dependency)
export {
  createSSEResponse,
  NativeSSEStreamingApi as SSEStreamingApi,
} from './sse-native'

// Re-export for backward compatibility
import { createSSEResponse as _createSSEResponse } from './sse-native'

/**
 * Alias for createSSEResponse (backward compatibility with Hono's streamSSE API)
 * @deprecated Use createSSEResponse instead
 */
export const streamSSE = _createSSEResponse
