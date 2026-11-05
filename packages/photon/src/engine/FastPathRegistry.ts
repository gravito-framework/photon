/**
 * FastPathRegistry.ts
 *
 * Lightweight registry for ultra-low latency routes that bypass the Gravito engine.
 * Matches routes using exact string comparison for maximum speed.
 *
 * @module @gravito/core/adapters/bun
 * @since 2.2.0
 */

export class FastPathRegistry {
  private routes = new Map<string, Map<string, (req: Request) => Response | Promise<Response>>>()

  /**
   * Register a fast-path handler.
   * @param method HTTP method (GET, POST, etc.)
   * @param path Exact path string (e.g., '/health')
   * @param handler Handler that takes raw Request and returns Response
   */
  register(
    method: string,
    path: string,
    handler: (req: Request) => Response | Promise<Response>
  ): void {
    const upperMethod = method.toUpperCase()
    let methodRoutes = this.routes.get(upperMethod)
    if (!methodRoutes) {
      methodRoutes = new Map()
      this.routes.set(upperMethod, methodRoutes)
    }
    methodRoutes.set(path, handler)
  }

  /**
   * Match a request to a registered fast-path handler.
   * @param method HTTP method
   * @param path Pathname
   * @returns The handler if found, otherwise undefined
   */
  match(
    method: string,
    path: string
  ): ((req: Request) => Response | Promise<Response>) | undefined {
    const methodRoutes = this.routes.get(method.toUpperCase())
    if (!methodRoutes) {
      return undefined
    }
    return methodRoutes.get(path)
  }

  /**
   * Get all registered fast-path routes.
   * Useful for Bun.serve routes integration.
   */
  getAll(): Map<string, Map<string, (req: Request) => Response | Promise<Response>>> {
    return this.routes
  }
}
