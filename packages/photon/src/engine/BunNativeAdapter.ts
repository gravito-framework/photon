import type { HttpAdapter, RouteDefinition } from './adapter-types'
import { BunContext } from './BunContext'
import type { BunRequest } from './BunRequest'
import type { WebSocketRouteHandlers } from './BunWebSocketHandler'
import { BunWebSocketHandler } from './BunWebSocketHandler'
import { FastPathRegistry } from './FastPathRegistry'
import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  GravitoVariables,
  HttpMethod,
} from './http-types'
import { RadixRouter } from './RadixRouter'
import type { PhotonServeConfig, PhotonServeOptions } from './serve-types'
import type { BunRouteOptions, RouteHandler } from './types'

class MiddlewareDriftException extends Error {}

/**
 * Native Bun-optimized HTTP Adapter for Gravito.
 * Uses Bun's standard Request/Response classes and efficient router.
 * @public
 */
export class BunNativeAdapter<V extends object = GravitoVariables> implements HttpAdapter {
  public readonly name = 'bun-native'
  public readonly version = '0.0.1'

  public get native(): unknown {
    return this
  }

  private isSnapshotLocked = false
  readonly router = new RadixRouter<V>()
  private fastPathRegistry = new FastPathRegistry()
  private middlewares: Array<{ path: string; handlers: GravitoMiddleware<V>[] }> = []
  private errorHandler: GravitoErrorHandler<V> | null = null
  private notFoundHandler: GravitoNotFoundHandler<V> | null = null

  // Context pooling for P0 fix (state pollution)
  private contextPool: BunContext<V>[] = []
  private readonly maxPoolSize = 100

  // P2 optimization: Pre-compiled middleware chains
  private middlewareChainCache = new Map<string, GravitoMiddleware<V>[]>()

  // WebSocket support
  private wsHandler = new BunWebSocketHandler()

  private checkLock(): void {
    if (this.isSnapshotLocked && process.env.NODE_ENV !== 'production') {
      throw new MiddlewareDriftException(
        'FAST_PATH_MIDDLEWARE_DRIFT: Middleware or routes cannot be added after serveConfig() has been called. ' +
          'This ensures the snapshotted configuration remains consistent with the application state.'
      )
    }
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoMiddleware<V> | BunRouteOptions)[]
  ): void {
    this.checkLock()
    const last = handlers[handlers.length - 1]
    let options: BunRouteOptions | undefined

    if (
      last &&
      typeof last === 'object' &&
      !Array.isArray(last) &&
      'excludeMiddleware' in (last as Record<string, unknown>)
    ) {
      options = handlers.pop() as BunRouteOptions
    }

    this.router.add(method, path, handlers as RouteHandler<V>[], options)
  }

  routes(routes: RouteDefinition<V>[]): void {
    this.checkLock()
    for (const route of routes) {
      const options: BunRouteOptions = {}
      if ((route as any).excludeMiddleware) {
        options.excludeMiddleware = (route as any).excludeMiddleware
      }

      this.router.add(
        route.method,
        route.path,
        route.handlers as RouteHandler<V>[],
        Object.keys(options).length > 0 ? options : undefined
      )
    }
  }

  use(path: string, ...middleware: GravitoMiddleware<V>[]): void {
    this.checkLock()
    this.middlewares.push({ path, handlers: middleware })
    // P2 optimization: Clear middleware cache when new middleware added
    this.middlewareChainCache.clear()
  }

  useGlobal(...middleware: GravitoMiddleware<V>[]): void {
    this.checkLock()
    this.use('*', ...middleware)
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware<V>[]): void {
    this.checkLock()
    if (path === '*' || path === '*/*') {
      throw new Error(
        `useScoped(): Cannot use wildcard path '*' in Orbit-scoped middleware. ` +
          `Use regular use('*') for global middleware, or specify explicit paths like '${scope}/*'`
      )
    }

    const normalizedScope = scope.startsWith('/') ? scope : `/${scope}`
    const fullPath = normalizedScope + (path.startsWith('/') ? '' : `/${path}`)

    if (!fullPath.includes(normalizedScope)) {
      throw new Error(
        `useScoped(): Path '${path}' must include scope prefix '${scope}'. ` +
          `Expected path to be under '${scope}' (e.g., '${scope}${path}')`
      )
    }

    this.middlewares.push({ path: fullPath, handlers: middleware })
  }

  /**
   * P1 Fix: Accurate path pattern matching for middleware
   * Handles wildcards: *, /api/*, /api
   */
  private matchesPath(pattern: string, path: string): boolean {
    if (pattern === '*') {
      return true // Global wildcard
    }

    // HTTP convention: use('/') means "match all paths" (global middleware)
    if (pattern === '/') {
      return true
    }

    // Handle /api/* format
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2) // Remove /*
      return path === basePattern || path.startsWith(`${basePattern}/`)
    }

    // Handle /api* format (without slash)
    if (pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1)
      return path.startsWith(basePattern)
    }

    // Default: treat as prefix match if it matches exactly or as a parent directory
    // This allows .use('/api', ...) to match '/api/test'
    return path === pattern || path.startsWith(`${pattern}/`)
  }

  /**
   * P2 optimization: Pre-compile middleware chain for a path
   */
  private getCompiledMiddlewareChain(
    path: string,
    options?: BunRouteOptions
  ): GravitoMiddleware<V>[] {
    const exclude = options?.excludeMiddleware || []

    // Check cache first
    const cacheKey = exclude.length > 0 ? `${path}:exclude:${exclude.sort().join(',')}` : path

    if (this.middlewareChainCache.has(cacheKey)) {
      return this.middlewareChainCache.get(cacheKey)!
    }

    // Build chain
    const chain: GravitoMiddleware<V>[] = []

    for (const mw of this.middlewares) {
      if (this.matchesPath(mw.path, path)) {
        for (const handler of mw.handlers) {
          // Check if middleware should be excluded by name
          const name = handler.name || (handler as any).middlewareName
          if (name && exclude.includes(name)) {
            continue
          }
          chain.push(handler)
        }
      }
    }

    // Cache it
    this.middlewareChainCache.set(cacheKey, chain)

    return chain
  }

  /**
   * P0 Fix: Context object pooling to prevent state pollution
   */
  private acquireContext(request: Request): BunContext<V> {
    const ctx = this.contextPool.pop()
    if (ctx) {
      ctx.reset(request)
      return ctx
    }
    return BunContext.create<V>(request)
  }

  /**
   * P0 Fix: Release context back to pool
   */
  private releaseContext(ctx: BunContext<V>): void {
    if (this.contextPool.length < this.maxPoolSize) {
      // Reset before returning to pool (with dummy request)
      ctx.reset(new Request('http://localhost/'))
      this.contextPool.push(ctx)
    }
  }

  mount(path: string, subAdapter: HttpAdapter): void {
    const fullPath = path.endsWith('/') ? `${path}*` : `${path}/*`

    // Register a wildcard route for ALL methods
    this.route('all' as HttpMethod, fullPath, async (ctx: GravitoContext<V>) => {
      const url = new URL(ctx.req.url)
      // Strip the mounting path prefix (e.g., '/orbit') from the pathname
      const prefix = path.endsWith('/') ? path.slice(0, -1) : path

      if (url.pathname.startsWith(prefix)) {
        // Ensure we handle root correctly (e.g. /orbit needs to become / or similar based on router logic)
        const newPath = url.pathname.slice(prefix.length)
        url.pathname = newPath === '' ? '/' : newPath
      }

      // Create a clean request with minimal properties to avoid carrying over internal state
      const newReq = new Request(url.toString(), {
        method: ctx.req.method,
        headers: ctx.req.raw.headers,
        body: ctx.req.raw.body,
      })

      const res = await subAdapter.fetch(newReq)
      // Ensure response is stored in context for middleware chain
      if ('res' in ctx) {
        ctx.res = res
      }
      return res
    })
  }

  createContext(request: Request): GravitoContext<V> {
    return BunContext.create<V>(request)
  }

  onError(handler: GravitoErrorHandler<V>): void {
    this.checkLock()
    this.errorHandler = handler
  }

  onNotFound(handler: GravitoNotFoundHandler<V>): void {
    this.checkLock()
    this.notFoundHandler = handler
  }

  registerFastPath(
    method: string,
    path: string,
    handler: (req: Request) => Response | Promise<Response>
  ): void {
    this.checkLock()
    this.fastPathRegistry.register(method, path, handler)
  }

  /**
   * Generate configuration for Bun.serve().
   * Offloads fast-path GET routes to Bun's native router.
   */
  serveConfig(baseConfig: PhotonServeOptions = {}): PhotonServeConfig {
    this.isSnapshotLocked = true
    const routes: Record<string, (req: Request) => Response | Promise<Response>> = {}

    // Offload fast-path GET routes to Bun's native router for maximum performance
    for (const [method, pathMap] of this.fastPathRegistry.getAll()) {
      if (method === 'GET') {
        for (const [path, handler] of pathMap) {
          // Fast paths are literal; Bun interprets ':' and '*' as route patterns.
          if (path.includes(':') || path.includes('*')) {
            continue
          }
          routes[path] = (request) =>
            request.method === 'GET' && new URL(request.url).pathname === path
              ? this.executeFastHandler(handler, request)
              : this.fetch(request)
        }
      }
    }

    const config = { ...baseConfig, routes, fetch: this.fetch.bind(this) }
    const websocket = this.websocket
    return websocket ? { ...config, websocket } : config
  }

  /**
   * 註冊 WebSocket 路由
   */
  registerWebSocketRoute(path: string, handlers: WebSocketRouteHandlers): void {
    this.checkLock()
    this.wsHandler.register(path, handlers)
  }

  /**
   * 取得 WebSocket handler（供 Bun.serve 使用）
   */
  get websocket() {
    return this.wsHandler.hasAnyRoute() ? this.wsHandler.toHandler() : undefined
  }

  /**
   * Predictive Route Warming (JIT Optimization)
   */
  async warmup(paths: string[]): Promise<void> {
    const dummyReqOpts = { headers: { 'User-Agent': 'Gravito-Warmup/1.0' } }

    for (const path of paths) {
      const req = new Request(`http://localhost${path}`, dummyReqOpts)
      await this.fetch(req)
    }
  }

  async fetch(
    request: Request,
    _server?: unknown,
    onContext?: (context: GravitoContext<V>) => void | Promise<void>
  ): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // Fast-path bypass (Ultra-low latency, bypasses context pooling and DI)
    const fastHandler = this.fastPathRegistry.match(request.method, path)
    if (fastHandler) {
      return this.executeFastHandler(fastHandler, request)
    }

    // WebSocket upgrade check (before context acquisition)
    if (
      _server != null &&
      typeof (_server as { upgrade?: unknown }).upgrade === 'function' &&
      request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
      this.wsHandler.hasRoute(path)
    ) {
      const upgraded = (
        _server as { upgrade: (req: Request, opts: { data: unknown }) => boolean }
      ).upgrade(request, {
        data: {
          path: url.pathname,
          id: crypto.randomUUID(),
          channels: new Set<string>(),
        },
      })
      if (upgraded) {
        return new Response(null, { status: 101 })
      }
    }

    // P0 Fix: Use context pool to prevent state pollution
    const ctx = this.acquireContext(request)

    try {
      if (onContext) {
        await onContext(ctx)
      }
      const method = request.method

      const match = this.router.match(method, path)

      const handlers: RouteHandler<V>[] = []

      // P2 optimization: Use pre-compiled middleware chain
      const middlewareChain = this.getCompiledMiddlewareChain(path, match?.options)
      handlers.push(...middlewareChain)

      if (match) {
        if (match.params) {
          ;(ctx.req as BunRequest).setParams(match.params)
        }
        handlers.push(...match.handlers)
      } else if (this.notFoundHandler) {
        // P2 Fix: Add notFound handler only when needed
        handlers.push(this.notFoundHandler)
      }

      return await this.executeChain(ctx, handlers)
    } catch (err) {
      if (this.errorHandler) {
        try {
          const response = await this.errorHandler(err as Error, ctx)
          if (response) {
            ctx.res = response
            return ctx.res ?? response
          }
        } catch (e) {
          // biome-ignore lint/suspicious/noConsole: HTTP adapter error boundary — no Logger injected in BunNativeAdapter
          console.error('Error handler failed', e)
        }
      }
      // biome-ignore lint/suspicious/noConsole: HTTP adapter error boundary — no Logger injected in BunNativeAdapter
      console.error(err)
      return ctx.text('Internal Server Error', 500)
    } finally {
      // P0 Fix: Always release context back to pool
      this.releaseContext(ctx)
    }
  }

  private async executeFastHandler(
    handler: (request: Request) => Response | Promise<Response>,
    request: Request
  ): Promise<Response> {
    try {
      return await handler(request)
    } catch {
      // Fast routes deliberately bypass Context and the Context-based onError hook.
      return new Response('Internal Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      })
    }
  }

  private async executeChain(
    ctx: GravitoContext<V>,
    handlers: RouteHandler<V>[]
  ): Promise<Response> {
    let index = -1

    const dispatch = async (i: number): Promise<Response | undefined> => {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      const fn = handlers[i]
      if (!fn) {
        return ctx.res ?? ctx.text('Not Found', 404)
      }

      const pending: Promise<Response | undefined>[] = []
      let result: Response | undefined | void
      try {
        result = await fn(ctx, () => {
          const downstream = (async () => {
            const res = await dispatch(i + 1)
            if (res && ctx.res !== res) {
              ctx.res = res
            }
            return res
          })()
          pending.push(downstream)
          return downstream
        })
      } finally {
        // Settle this handler's next() calls before its caller can recover or reuse ctx.
        // Tracking direct children avoids waiting on an ancestor's own promise.
        await Promise.allSettled(pending)
      }

      if (result) {
        ctx.res = result
        return ctx.res
      }
      return ctx.res
    }

    const finalResponse = await dispatch(0)

    if (
      finalResponse &&
      (finalResponse instanceof Response || typeof (finalResponse as Response).status === 'number')
    ) {
      return finalResponse as Response
    }

    // Check if context has stored response (from middleware/handler calls to ctx.json() etc)
    if (ctx.res) {
      return ctx.res
    }

    // If no response returned and no notFoundHandler handled it:
    return ctx.text('Not Found', 404)
  }
}
