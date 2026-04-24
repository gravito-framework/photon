/**
 * @deprecated v2.0 - Hono compatibility layer, will be removed
 *
 * This module re-exports Hono utilities for backwards compatibility.
 * For v2.0+, please use:
 * - Native Bun APIs for server functionality
 * - Gravito native implementations where available
 * - Custom implementations for app-specific needs
 *
 * Removal timeline: v2.0 (2026 Q3)
 * Migration guide: See MIGRATION.md
 *
 * ---
 *
 * @fileoverview WebSocket Middleware for Photon
 *
 * Provides native WebSocket support for Photon applications, leveraging
 * Bun's high-performance WebSocket implementation with Hono-compatible API.
 *
 * @module @gravito/photon/middleware/websocket
 * @since 2.0.0
 */

import type { WSContext as HonoWSContext, WSEvents, WSMessageReceive, WSReadyState } from 'hono/ws'

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Native WebSocket (Primary API - Zero Hono Runtime Dependency)
// ─────────────────────────────────────────────────────────────────────────────

// Re-export native WebSocket implementation (zero Hono type dependency for handler logic)
export {
  defineWSHandler,
  type NativeWSCloseEvent,
  type NativeWSContext,
  type NativeWSEvents,
  type NativeWSMessageEvent,
  type TypedWSContext,
  type TypedWSHandler,
  type WSHandlerConfig,
} from './websocket-native'

// Import for adapter function
import { defineWSHandler } from './websocket-native'

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Hono Compatibility Layer (Deprecated - Type-Only + Stub Classes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated v2.0 - Use native WebSocket types instead
 * Stub implementation for backwards compatibility with Hono's defineWebSocketHelper
 */
export function defineWebSocketHelper<T extends Record<string, unknown> = Record<string, unknown>>(
  events: T
): T {
  // Return events object as-is (no-op stub)
  return events
}

/**
 * @deprecated v2.0 - Use NativeWSContext instead
 * Stub class for backwards compatibility with Hono's WSContext
 * This allows existing code that imports WSContext to continue working
 */
export class WSContext {
  /**
   * Constructor stub for backwards compatibility
   * @deprecated v2.0 - This is a compatibility shim only
   */
  constructor(
    config: Partial<{
      send?: (data: string | ArrayBuffer | Uint8Array, options?: { compress?: boolean }) => void
      close?: (code?: number, reason?: string) => void
      readyState?: 0 | 1 | 2 | 3
      url?: string
    }>
  ) {
    this.send = config.send ?? (() => {})
    this.close = config.close ?? (() => {})
    this.readyState = config.readyState ?? 1
    this.url = config.url ?? 'ws://localhost/ws'
  }

  /**
   * Send method stub
   * @deprecated v2.0
   */
  send!: (data: string | ArrayBuffer | Uint8Array, options?: { compress?: boolean }) => void

  /**
   * Close method stub
   * @deprecated v2.0
   */
  close!: (code?: number, reason?: string) => void

  /**
   * Ready state stub
   * @deprecated v2.0
   */
  readyState!: 0 | 1 | 2 | 3

  /**
   * URL stub
   * @deprecated v2.0
   */
  url!: string
}

/**
 * @deprecated v2.0 - Use NativeWSContext instead
 * Re-exported Hono types for backwards compatibility
 */
export type { WSEvents, WSMessageReceive, WSReadyState }

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Hono Adapter (Deprecated - Backwards Compatibility Only)
// ─────────────────────────────────────────────────────────────────────────────

import type { NativeWSContext } from './websocket-native'

/**
 * Adapt Hono's WSContext to our generic NativeWSContext interface
 *
 * @deprecated v2.0 - Use NativeWSContext directly instead
 * @internal
 */
export function adaptHonoWSContext(honoWs: HonoWSContext): NativeWSContext {
  return {
    send(data: string): void {
      honoWs.send(data as any)
    },

    close(code?: number, reason?: string): void {
      honoWs.close(code, reason)
    },

    get readyState() {
      return honoWs.readyState as 0 | 1 | 2 | 3
    },

    get url() {
      return null
    },
  }
}

/**
 * Adapt Hono's message event to NativeWSMessageEvent
 *
 * @deprecated v2.0 - Use NativeWSMessageEvent directly instead
 * @internal
 */
type HonoWSMessageEvent = {
  data: WSMessageReceive
}

async function normalizeHonoMessageData(
  data: WSMessageReceive
): Promise<string | ArrayBuffer | Uint8Array> {
  if (typeof data === 'string' || data instanceof ArrayBuffer || data instanceof Uint8Array) {
    return data
  }

  if (data instanceof SharedArrayBuffer) {
    return new Uint8Array(data)
  }

  if (data instanceof Blob) {
    return await data.arrayBuffer()
  }

  throw new TypeError('Unsupported WebSocket message payload type')
}

/**
 * Adapt Hono's message event structure
 *
 * @deprecated v2.0 - Use NativeWSMessageEvent instead
 */
export async function adaptHonoMessageEvent(honoEvent: HonoWSMessageEvent): Promise<{
  data: string | ArrayBuffer | Uint8Array
  lastMessageInBatch?: boolean
}> {
  return {
    data: await normalizeHonoMessageData(honoEvent.data),
  }
}

/**
 * Wrap defineWSHandler to work with Hono's WSEvents
 *
 * @deprecated v2.0 - Use defineWSHandler instead
 *
 * Provides backward compatibility by adapting our native handler
 * to Hono's WSContext and WSEvents types.
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * // For Bun runtime, use Bun.serve() directly or @gravito/core BunNativeAdapter
 * import { defineWSHandler } from '@gravito/photon/middleware/websocket'
 *
 * interface ChatMessage { text: string; user: string }
 * interface ServerMessage { event: string; payload: unknown }
 *
 * const app = new Photon()
 *
 * app.get('/ws/chat', upgradeWebSocket(
 *   defineWSHandler<ChatMessage, ServerMessage>({
 *     onOpen(ws) {
 *       ws.send({ event: 'connected', payload: { status: 'ok' } })
 *     },
 *     onMessage(msg, ws) {
 *       console.log(`${msg.user}: ${msg.text}`)
 *       ws.send({ event: 'echo', payload: msg })
 *     },
 *     onClose(code, reason, ws) {
 *       console.log(`Closed: ${code} ${reason}`)
 *     },
 *   })
 * ))
 * ```
 *
 * @param handler - WebSocket handler definition
 * @param config - Handler configuration
 * @returns Hono WSEvents handler
 * @public
 */
export function defineHonoWSHandler<TIn = unknown, TOut = unknown>(
  handler: Parameters<typeof defineWSHandler<TIn, TOut>>[0],
  config?: Parameters<typeof defineWSHandler<TIn, TOut>>[1]
): (c: unknown) => WSEvents {
  const nativeHandlerFactory = defineWSHandler(handler, config)

  return (c: unknown) => {
    const nativeEvents = nativeHandlerFactory(c)

    // Adapt native events to Hono's WSEvents
    const honoEvents: WSEvents = {
      onOpen(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onOpen?.(event, nativeWs)
      },

      async onMessage(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = await adaptHonoMessageEvent(event)
        return nativeEvents.onMessage?.(nativeEvent, nativeWs)
      },

      onClose(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        const nativeEvent = { code: event.code, reason: event.reason }
        return nativeEvents.onClose?.(nativeEvent, nativeWs)
      },

      onError(event, honoWs) {
        const nativeWs = adaptHonoWSContext(honoWs)
        return nativeEvents.onError?.(event, nativeWs)
      },
    }

    return honoEvents
  }
}
