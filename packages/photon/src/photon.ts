/**
 * @fileoverview Photon - Gravito 原生 HTTP 引擎
 *
 * 使用 Bun 原生 HTTP Adapter，提供高效能、型別安全的路由系統。
 * 完全基於 @gravito/core 的 BunNativeAdapter，無 Hono 依賴。
 *
 * @module @gravito/photon/photon
 * @public
 */

import type {
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
} from '@gravito/core'
import { BunNativeAdapter, type BunRouteOptions } from '@gravito/core'

type MountablePhotonApp = Photon | BunNativeAdapter

/**
 * Native handler type for fast-path routes.
 * Receives a raw Request and must return a Response — no GravitoContext involved.
 * @public
 */
export type NativeFastHandler = (req: Request) => Response | Promise<Response>

/**
 * Fast-path routing proxy providing shorthand HTTP method accessors.
 * All handlers bypass GravitoContext, DI container, and middleware chains.
 * @public
 */
export interface FastPathProxy {
  /** Register a fast-path handler for any method. */
  (method: string, path: string, handler: NativeFastHandler): Photon
  /** Register a fast GET handler (no context, no DI). */
  get(path: string, handler: NativeFastHandler): Photon
  /** Register a fast POST handler (no context, no DI). */
  post(path: string, handler: NativeFastHandler): Photon
  /** Register a fast PUT handler (no context, no DI). */
  put(path: string, handler: NativeFastHandler): Photon
  /** Register a fast DELETE handler (no context, no DI). */
  delete(path: string, handler: NativeFastHandler): Photon
  /** Register a fast PATCH handler (no context, no DI). */
  patch(path: string, handler: NativeFastHandler): Photon
  /** Register a fast HEAD handler (no context, no DI). */
  head(path: string, handler: NativeFastHandler): Photon
  /** Register a fast OPTIONS handler (no context, no DI). */
  options(path: string, handler: NativeFastHandler): Photon
}

/**
 * Photon 應用類別 - 高效能 Gravito HTTP 引擎
 *
 * 包裝 BunNativeAdapter，提供便利的 API
 *
 * @public
 */
export class Photon {
  private adapter = new BunNativeAdapter()

  /**
   * Fast-path routing proxy.
   *
   * Registers ultra-low latency routes that bypass the Gravito engine lifecycle,
   * DI context construction, and middleware chains. Ideal for health checks and
   * high-frequency static endpoints.
   *
   * @example
   * ```ts
   * app.fast.get('/health', () => new Response('OK'))
   * app.fast('GET', '/ping', (req) => new Response('pong'))
   * ```
   *
   * @since 2.2.0
   */
  readonly fast: FastPathProxy = this._buildFastProxy()

  get(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('get', path, ...handlers)
    return this
  }

  post(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('post', path, ...handlers)
    return this
  }

  put(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('put', path, ...handlers)
    return this
  }

  delete(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('delete', path, ...handlers)
    return this
  }

  patch(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('patch', path, ...handlers)
    return this
  }

  head(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('head', path, ...handlers)
    return this
  }

  options(path: string, ...handlers: (GravitoHandler | GravitoMiddleware | BunRouteOptions)[]): this {
    this.adapter.route('options', path, ...handlers)
    return this
  }

  use(pathOrMiddleware: string | GravitoMiddleware, ...middleware: GravitoMiddleware[]): this {
    if (typeof pathOrMiddleware === 'string') {
      this.adapter.use(pathOrMiddleware, ...middleware)
      return this
    }

    this.adapter.useGlobal(pathOrMiddleware, ...middleware)
    return this
  }

  useGlobal(...middleware: GravitoMiddleware[]): this {
    this.adapter.useGlobal(...middleware)
    return this
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): this {
    this.adapter.useScoped(scope, path, ...middleware)
    return this
  }

  route(basePath: string, app: Photon): this {
    this.mount(basePath, app)
    return this
  }

  mount(path: string, app: MountablePhotonApp): this {
    const subAdapter = app instanceof Photon ? app.adapter : app
    this.adapter.mount(path, subAdapter)
    return this
  }

  onError(handler: GravitoErrorHandler): this {
    this.adapter.onError(handler)
    return this
  }

  onNotFound(handler: GravitoNotFoundHandler): this {
    this.adapter.onNotFound(handler)
    return this
  }

  async fetch(request: Request, server?: unknown): Promise<Response> {
    return this.adapter.fetch(request, server)
  }

  async request(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input.startsWith('http')
          ? input
          : `http://localhost${input}`
        : input instanceof URL
          ? input.toString()
          : (input as Request).url
    const request = input instanceof Request ? input : new Request(url, init)
    return this.fetch(request)
  }

  get websocket() {
    return this.adapter.websocket
  }

  get native(): BunNativeAdapter {
    return this.adapter
  }

  get router() {
    return (this.adapter as any).router
  }

  /**
   * Generate a Bun.serve-compatible configuration object.
   *
   * Offloads registered fast-path GET routes to Bun's native `routes` map
   * for maximum throughput, with the standard `fetch` handler as fallback.
   *
   * @param baseConfig - Optional base configuration to merge
   * @returns Configuration suitable for `Bun.serve()`
   * @since 2.2.0
   *
   * @example
   * ```ts
   * Bun.serve(app.serveConfig({ port: 3000 }))
   * ```
   */
  serveConfig(baseConfig?: Record<string, unknown>): Record<string, unknown> {
    return this.adapter.serveConfig!(baseConfig)
  }

  /**
   * Build the fast-path proxy callable.
   * Returns a function with HTTP-method shorthand properties attached.
   */
  private _buildFastProxy(): FastPathProxy {
    const register = (method: string, path: string, handler: NativeFastHandler): Photon => {
      this.adapter.registerFastPath!(method, path, handler)
      return this
    }

    const proxy = (method: string, path: string, handler: NativeFastHandler): Photon =>
      register(method, path, handler)

    proxy.get = (path: string, handler: NativeFastHandler) => register('GET', path, handler)
    proxy.post = (path: string, handler: NativeFastHandler) => register('POST', path, handler)
    proxy.put = (path: string, handler: NativeFastHandler) => register('PUT', path, handler)
    proxy.delete = (path: string, handler: NativeFastHandler) => register('DELETE', path, handler)
    proxy.patch = (path: string, handler: NativeFastHandler) => register('PATCH', path, handler)
    proxy.head = (path: string, handler: NativeFastHandler) => register('HEAD', path, handler)
    proxy.options = (path: string, handler: NativeFastHandler) =>
      register('OPTIONS', path, handler)

    return proxy as FastPathProxy
  }
}
