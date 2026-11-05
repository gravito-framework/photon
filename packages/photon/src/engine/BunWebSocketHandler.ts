/**
 * WebSocket 路由管理器
 *
 * 負責註冊和分發 WebSocket 事件到相應的路由處理器
 */

export interface WebSocketRouteHandlers {
  open?: (ws: unknown) => void | Promise<void>
  message?: (ws: unknown, data: string | Buffer | Uint8Array) => void | Promise<void>
  close?: (ws: unknown, code: number, reason: string) => void | Promise<void>
  drain?: (ws: unknown) => void | Promise<void>
}

export class BunWebSocketHandler {
  private routes = new Map<string, WebSocketRouteHandlers>()

  /**
   * 註冊 WebSocket 路由
   */
  register(path: string, handlers: WebSocketRouteHandlers): void {
    this.routes.set(path, handlers)
  }

  /**
   * 檢查是否有該路由
   * 支援精確匹配和 wildcard 匹配
   */
  hasRoute(path: string): boolean {
    // 精確匹配
    if (this.routes.has(path)) {
      return true
    }

    // Wildcard 匹配 (e.g., /api/*)
    for (const registeredPath of this.routes.keys()) {
      if (this.matchesPath(registeredPath, path)) {
        return true
      }
    }

    return false
  }

  /**
   * 檢查是否有任何已註冊的路由
   */
  hasAnyRoute(): boolean {
    return this.routes.size > 0
  }

  /**
   * 將 handlers 轉換為 Bun.serve websocket config
   */
  toHandler(): {
    open?: (ws: unknown) => void | Promise<void>
    message: (ws: unknown, data: string | Buffer | Uint8Array) => void | Promise<void>
    close?: (ws: unknown, code: number, reason: string) => void | Promise<void>
    drain?: (ws: unknown) => void | Promise<void>
  } {
    return {
      open: async (ws: unknown) => {
        const path = (ws as { data?: { path?: string } })?.data?.path
        if (!path) {
          return
        }

        const handler = this.findHandler(path)
        if (handler?.open) {
          await handler.open(ws)
        }
      },

      message: async (ws: unknown, data: string | Buffer | Uint8Array) => {
        const path = (ws as { data?: { path?: string } })?.data?.path
        if (!path) {
          return
        }

        const handler = this.findHandler(path)
        if (handler?.message) {
          await handler.message(ws, data)
        }
      },

      close: async (ws: unknown, code: number, reason: string) => {
        const path = (ws as { data?: { path?: string } })?.data?.path
        if (!path) {
          return
        }

        const handler = this.findHandler(path)
        if (handler?.close) {
          await handler.close(ws, code, reason)
        }
      },

      drain: async (ws: unknown) => {
        const path = (ws as { data?: { path?: string } })?.data?.path
        if (!path) {
          return
        }

        const handler = this.findHandler(path)
        if (handler?.drain) {
          await handler.drain(ws)
        }
      },
    }
  }

  /**
   * 尋找符合路徑的 handler
   * 優先精確匹配，再 wildcard 匹配
   */
  private findHandler(path: string): WebSocketRouteHandlers | undefined {
    // 精確匹配
    if (this.routes.has(path)) {
      return this.routes.get(path)
    }

    // Wildcard 匹配
    for (const [registeredPath, handlers] of this.routes.entries()) {
      if (this.matchesPath(registeredPath, path)) {
        return handlers
      }
    }

    return undefined
  }

  /**
   * 路徑匹配邏輯
   * 支援：
   * - 精確匹配：/chat
   * - Wildcard：/api/*, /api*
   */
  private matchesPath(pattern: string, path: string): boolean {
    if (!pattern.includes('*')) {
      return path === pattern
    }

    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2)
      return path === basePattern || path.startsWith(`${basePattern}/`)
    }

    if (pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1)
      return path.startsWith(basePattern)
    }

    return false
  }
}
