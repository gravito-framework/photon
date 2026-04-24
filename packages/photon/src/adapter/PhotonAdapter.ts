/**
 * @fileoverview Photon Adapter Implementation
 *
 * This adapter wraps Photon to implement the Gravito HttpAdapter interface.
 * It serves as the default adapter and reference implementation for others.
 *
 * @module @gravito/photon/adapter
 * @since 2.0.0
 */

import {
  type AdapterConfig,
  type GravitoContext,
  type GravitoErrorHandler,
  type GravitoHandler,
  type GravitoMiddleware,
  type GravitoNext,
  type GravitoNotFoundHandler,
  type GravitoRequest,
  type GravitoVariables,
  type HttpAdapter,
  type HttpMethod,
  type ProxyOptions,
  RequestScopeManager,
  type RouteDefinition,
  type StatusCode,
} from '@gravito/core'
import type { Photon } from '../photon'

// 內部型別別名：Photon 移除 Hono 後，底層引擎直接使用 GravitoContext
type Context = GravitoContext
type Next = GravitoNext
type Handler = GravitoHandler
type PhotonMiddlewareHandler = (
  c: Context,
  next: Next
) => Response | void | Promise<Response | void>
type PhotonNotFoundHandler = (c: Context) => Response | Promise<Response>
type PhotonRouteRegistrar = Photon[HttpMethod]
type RouteHandlerLike<V extends GravitoVariables> = GravitoHandler<V> | GravitoMiddleware<V>

import type {
  PhotonContextExtended,
  PhotonRequestExtended,
  ResponseWithFlash,
  SessionWithFlash,
} from './photon-types'

function isPhotonAdapter<V extends GravitoVariables>(
  adapter: HttpAdapter<V>
): adapter is HttpAdapter<V> & { native: Photon } {
  return adapter.name === 'photon'
}

// ─────────────────────────────────────────────────────────────────────────────
// Photon Request Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Photon's request object to implement GravitoRequest
 */
class PhotonRequestWrapper implements GravitoRequest {
  public photonCtx!: Context

  /**
   * Reset the wrapper for pooling
   */
  reset(photonCtx: Context): void {
    this.photonCtx = photonCtx
  }

  /**
   * Create a proxied instance to delegate to Photon's request
   */
  static create(photonCtx: Context): PhotonRequestWrapper {
    const instance = new PhotonRequestWrapper()
    instance.reset(photonCtx)
    return instance
  }

  get url(): string {
    return this.photonCtx.req.url
  }

  get method(): string {
    return this.photonCtx.req.method
  }

  get path(): string {
    return this.photonCtx.req.path
  }

  param(name: string): string | undefined {
    return this.photonCtx.req.param(name)
  }

  params(): Record<string, string> {
    const req = this.photonCtx.req as Context['req'] & PhotonRequestExtended
    return req.param()
  }

  query(name: string): string | undefined {
    return this.photonCtx.req.query(name)
  }

  queries(): Record<string, string | string[]> {
    return this.photonCtx.req.queries() as Record<string, string | string[]>
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string): string | undefined | Record<string, string> {
    if (name) {
      return this.photonCtx.req.header(name)
    }
    return this.photonCtx.req.header()
  }

  async json<T = unknown>(): Promise<T> {
    const ctx = this.photonCtx as PhotonContextExtended
    if (ctx._cachedJsonBody !== undefined) {
      return ctx._cachedJsonBody as T
    }
    const body = await this.photonCtx.req.json<T>()
    ctx._cachedJsonBody = body
    return body as T
  }

  async text(): Promise<string> {
    return this.photonCtx.req.text()
  }

  async formData(): Promise<FormData> {
    return this.photonCtx.req.formData()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.photonCtx.req.arrayBuffer()
  }

  async parseBody<T = unknown>(): Promise<T> {
    return this.photonCtx.req.parseBody() as Promise<T>
  }

  get raw(): Request {
    return this.photonCtx.req.raw
  }

  get routePattern(): string | undefined {
    const req = this.photonCtx.req as Context['req'] & Partial<PhotonRequestExtended>
    return req.routePattern
  }

  get routePath(): string | undefined {
    return this.routePattern
  }

  valid<T = unknown>(target: string): T {
    const extendedReq = this.photonCtx.req as Context['req'] & PhotonRequestExtended
    return extendedReq.valid<T>(target)
  }

  setValidated(target: string, data: unknown): void {
    const extendedReq = this.photonCtx.req as Context['req'] & PhotonRequestExtended
    if (typeof extendedReq.setValidated === 'function') {
      extendedReq.setValidated(target, data)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photon Context Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Photon's context to implement GravitoContext
 */
class PhotonContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private _req!: PhotonRequestWrapper
  private photonCtx!: Context
  private _requestScope!: RequestScopeManager

  public route!: (
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, string | number | boolean | null | undefined>
  ) => string

  /**
   * Reset the wrapper for pooling
   */
  reset(photonCtx: Context): void {
    this.photonCtx = photonCtx
    if (!this._req) {
      this._req = PhotonRequestWrapper.create(photonCtx)
    } else {
      this._req.reset(photonCtx)
    }
    this._requestScope = new RequestScopeManager()
  }

  /**
   * Create a proxied instance to enable object destructuring of context variables
   */
  static create<V extends GravitoVariables = GravitoVariables>(
    photonCtx: Context
  ): GravitoContext<V> {
    const instance = new PhotonContextWrapper<V>()
    instance.reset(photonCtx)
    return instance
  }

  get req(): GravitoRequest {
    return this._req
  }

  get res(): Response | undefined {
    return this.photonCtx.res
  }

  set res(response: Response | undefined) {
    this.photonCtx.res = response
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Common Variable Getters (Performance Optimized)
  // ─────────────────────────────────────────────────────────────────────────────

  get session(): unknown {
    return this.get('session' as keyof V)
  }

  get auth(): unknown {
    return this.get('auth' as keyof V)
  }

  get user(): unknown {
    return this.get('user' as keyof V)
  }

  get inertia(): unknown {
    return this.get('inertia' as keyof V)
  }

  get app(): unknown {
    return this.get('app' as keyof V)
  }

  get db(): unknown {
    return this.get('db' as keyof V)
  }

  get cache(): unknown {
    return this.get('cache' as keyof V)
  }

  get sqlite(): unknown {
    return this.get('sqlite' as keyof V)
  }

  get atlas(): unknown {
    return this.get('atlas' as keyof V)
  }

  get params(): Record<string, string> {
    return this._req.params()
  }

  get query(): Record<string, string | string[]> {
    return this._req.queries()
  }

  get data(): unknown {
    return this.get('data' as keyof V)
  }

  set data(value: unknown) {
    this.set('data' as keyof V, value as V[keyof V])
  }

  back(status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    const referer = this.header('Referer') || '/'
    return this.redirect(referer, status)
  }

  json<T>(data: T, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.json(data as object, status as 200)
    }
    return this.photonCtx.json(data as object)
  }

  text(text: string, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.text(text, status as 200)
    }
    return this.photonCtx.text(text)
  }

  html(html: string, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.html(html, status as 200)
    }
    return this.photonCtx.html(html)
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    const response = this.photonCtx.redirect(url, status)
    // Add .with() helper for flash messages and compatibility
    // We cast to unknown first, then to the extended type to avoid type errors
    const extendedRes = response as unknown as ResponseWithFlash
    extendedRes.with = (key: string, value: unknown) => {
      const session = this.get('session' as keyof V) as SessionWithFlash | undefined
      if (session && typeof session.flash === 'function') {
        session.flash(key, value)
      }
      return extendedRes
    }
    return response
  }

  body(data: BodyInit | null, status?: number): Response {
    if (data === null) {
      return this.photonCtx.body(null, status as 200)
    }
    // For non-null body, create Response directly
    return new Response(data, {
      status: status ?? 200,
      headers: new Headers(),
    })
  }

  stream(stream: ReadableStream, status?: number): Response {
    return new Response(stream, {
      status: status ?? 200,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  notFound(message?: string): Response {
    return this.photonCtx.text(message ?? 'Not Found', 404)
  }

  forbidden(message?: string): Response {
    return this.photonCtx.text(message ?? 'Forbidden', 403)
  }

  unauthorized(message?: string): Response {
    return this.photonCtx.text(message ?? 'Unauthorized', 401)
  }

  badRequest(message?: string): Response {
    return this.photonCtx.text(message ?? 'Bad Request', 400)
  }

  // Implement header as separate methods internally
  header(name: string): string | undefined
  header(name: string, value: string, options?: { append?: boolean }): void
  header(
    name: string,
    value?: string,
    options?: { append?: boolean }
  ): string | undefined | undefined {
    if (value !== undefined) {
      if (options?.append) {
        this.photonCtx.header(name, value, { append: true })
      } else {
        this.photonCtx.header(name, value)
      }
      return undefined // Return undefined for setter to match type
    }
    return this.photonCtx.req.header(name)
  }

  status(code: StatusCode): void {
    this.photonCtx.status(code as 200)
  }

  get<K extends keyof V>(key: K): V[K] {
    return this.photonCtx.get(key as string) as V[K]
  }

  set<K extends keyof V>(key: K, value: V[K]): void {
    this.photonCtx.set(key as string, value)
  }

  get executionCtx(): Context['executionCtx'] {
    return this.photonCtx.executionCtx
  }

  get env(): Record<string, unknown> | undefined {
    return this.photonCtx.env as Record<string, unknown> | undefined
  }

  get native(): Context {
    return this.photonCtx
  }

  async forward(target: string, options: ProxyOptions = {}): Promise<Response> {
    const url = new URL(this.req.url)
    let targetUrl: URL

    if (target.startsWith('http')) {
      targetUrl = new URL(target)
      // If target is just a base URL (e.g. http://localhost:4000), append current path
      // but only if path is not specifically overridden by rewritePath
      if (targetUrl.pathname === '/' && !target.endsWith('/')) {
        const newPath = options.rewritePath ? options.rewritePath(this.req.path) : this.req.path
        targetUrl.pathname = newPath
      }
    } else {
      // Treat as a hostname
      targetUrl = new URL(
        `${url.protocol}//${target}${options.rewritePath ? options.rewritePath(this.req.path) : this.req.path}`
      )
    }

    // Merge search params
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value)
    })

    const headers = new Headers(this.req.header())

    // Standard Proxy Header Cleaning (Hop-by-hop)
    const hopByHop = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ]
    hopByHop.forEach((h) => {
      headers.delete(h)
    })

    if (!options.preserveHost) {
      headers.set('host', targetUrl.host)
    }

    if (options.addForwardedHeaders !== false) {
      const clientIp = this.photonCtx.req.header('x-forwarded-for') || '127.0.0.1'
      headers.set('x-forwarded-for', clientIp)
      headers.set('x-forwarded-proto', url.protocol.replace(':', ''))
      headers.set('x-forwarded-host', url.host)
    }

    // Overwrite with custom headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([k, v]) => {
        headers.set(k, String(v))
      })
    }

    return fetch(targetUrl.toString(), {
      method: this.req.method,
      headers,
      body: this.req.method !== 'GET' && this.req.method !== 'HEAD' ? this.req.raw.body : null,
      duplex: 'half',
    } as RequestInit & { duplex?: string })
  }

  requestScope(): RequestScopeManager {
    return this._requestScope
  }

  scoped<T>(key: string | symbol, factory: () => T): T {
    return this._requestScope.resolve(key, factory)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Pooling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Object pool for Photon Context Wrappers
 */
type ResettableContext<V extends GravitoVariables = GravitoVariables> = GravitoContext<V> & {
  reset(photonCtx: Context): void
}

class PhotonAdapterContextPool {
  private pool: ResettableContext[] = []
  private maxSize = 256

  acquire<V extends GravitoVariables>(photonCtx: Context): GravitoContext<V> {
    const wrapper = this.pool.pop()
    if (wrapper) {
      wrapper.reset(photonCtx)
      return wrapper as unknown as GravitoContext<V>
    }
    return PhotonContextWrapper.create<V>(photonCtx)
  }

  release<V extends GravitoVariables>(wrapper: GravitoContext<V>): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(wrapper as ResettableContext<V>)
    }
  }
}

const contextPool = new PhotonAdapterContextPool()

// ─────────────────────────────────────────────────────────────────────────────
// Handler Conversion Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a GravitoHandler to a Photon Handler
 */
export function toPhotonHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler {
  return async (c: Context): Promise<Response> => {
    const ctx = contextPool.acquire<V>(c)
    try {
      return await handler(ctx)
    } finally {
      contextPool.release(ctx)
    }
  }
}

/**
 * Convert a GravitoMiddleware to a Photon MiddlewareHandler
 */
export function toPhotonMiddleware<V extends GravitoVariables>(
  middleware: GravitoMiddleware<V>
): PhotonMiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const ctx = contextPool.acquire<V>(c)
    try {
      const gravitoNext: GravitoNext = async () => {
        await next()
      }
      const result = await middleware(ctx, gravitoNext)
      return result as Response | void
    } finally {
      contextPool.release(ctx)
    }
  }
}

/**
 * Convert a GravitoErrorHandler to Photon's error handler signature
 */
export function toPhotonErrorHandler<V extends GravitoVariables>(
  handler: GravitoErrorHandler<V>
): (err: Error, c: Context) => Response | Promise<Response> {
  return async (err: Error, c: Context): Promise<Response> => {
    const ctx = contextPool.acquire<V>(c)
    try {
      return await handler(err, ctx)
    } finally {
      contextPool.release(ctx)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photon Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default HTTP adapter using the optimized Gravito Core Engine.
 *
 * This adapter provides a consistent interface that can be
 * swapped out for other implementations without changing application code.
 *
 * @example
 * ```typescript
 * import { PhotonAdapter } from '@gravito/photon/adapter'
 *
 * const adapter = new PhotonAdapter()
 *
 * // Register routes
 * adapter.route('get', '/hello', async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * })
 * ```
 */
export class PhotonAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  readonly name = 'photon'
  readonly version = '1.0.0'

  private app: Photon

  constructor(
    private config: AdapterConfig = {},
    photonInstance?: unknown
  ) {
    // Allow injecting an existing Photon instance for backwards compatibility
    if (photonInstance) {
      // Cast to Photon - the caller is responsible for providing a valid instance
      this.app = photonInstance as Photon
    } else {
      // Lazy import to avoid circular dependency issues
      // In practice, PlanetCore will provide the Photon instance
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Photon: PhotonClass } = require('@gravito/photon')
      this.app = new PhotonClass()
    }
  }

  /**
   * Get the underlying Photon app instance
   */
  get native(): Photon {
    return this.app
  }

  /**
   * Set the underlying Photon app instance
   * Used by PlanetCore during initialization
   */
  setNative(app: Photon): void {
    this.app = app
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void {
    const fullPath = (this.config.basePath || '') + path
    // We treat all handlers as potential middleware (accepting next)
    const photonHandlers = handlers.map((handler) =>
      toPhotonMiddleware<V>(handler as GravitoMiddleware<V>)
    )
    const methodFn: PhotonRouteRegistrar = this.app[method]
    methodFn.call(this.app, fullPath, ...photonHandlers)
  }

  routes(routes: RouteDefinition[]): void {
    for (const routeDef of routes) {
      const middlewareHandlers = (routeDef.middleware ?? []) as RouteHandlerLike<V>[]
      const routeHandlers = routeDef.handlers as RouteHandlerLike<V>[]
      const allHandlers = [...middlewareHandlers, ...routeHandlers]
      this.route(routeDef.method, routeDef.path, ...allHandlers)
    }
  }

  use(path: string, ...middleware: GravitoMiddleware<V>[]): void {
    const fullPath = (this.config.basePath || '') + path
    const photonMiddleware = middleware.map((m) => toPhotonMiddleware<V>(m))

    for (const m of photonMiddleware) {
      this.app.use(fullPath, m)
    }
  }

  useGlobal(...middleware: GravitoMiddleware<V>[]): void {
    this.use('*', ...middleware)
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware<V>[]): void {
    if (path === '*' || path === '*/*') {
      throw new Error(
        `useScoped(): Cannot use wildcard path '*' in Orbit-scoped middleware. ` +
          `Use regular use('*') for global middleware, or specify explicit paths like '${scope}/*'`
      )
    }

    const normalizedScope = scope.startsWith('/') ? scope : `/${scope}`
    const fullPath =
      (this.config.basePath || '') + normalizedScope + (path.startsWith('/') ? '' : `/${path}`)

    if (!fullPath.includes(normalizedScope)) {
      throw new Error(
        `useScoped(): Path '${path}' must include scope prefix '${scope}'. ` +
          `Expected path to be under '${scope}' (e.g., '${scope}${path}')`
      )
    }

    const photonMiddleware = middleware.map((m) => toPhotonMiddleware<V>(m))
    for (const m of photonMiddleware) {
      this.app.use(fullPath, m)
    }
  }

  mount(path: string, subAdapter: HttpAdapter<V>): void {
    if (isPhotonAdapter(subAdapter)) {
      // Optimized path for Photon sub-adapters
      this.app.route(path, subAdapter.native)
    } else {
      // Generic fallback: relay all requests to sub-adapter
      this.use(`${path}/*`, async (ctx) => {
        const response = await subAdapter.fetch(ctx.req.raw)
        return response
      })
    }
  }

  onError(handler: GravitoErrorHandler<V>): void {
    this.app.onError(toPhotonErrorHandler<V>(handler))
  }

  onNotFound(handler: GravitoNotFoundHandler<V>): void {
    const notFoundHandler: PhotonNotFoundHandler = async (c: Context) => {
      const ctx = PhotonContextWrapper.create<V>(c)
      return handler(ctx)
    }
    this.app.onNotFound(notFoundHandler)
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

  fetch = (request: Request, server?: unknown): Response | Promise<Response> => {
    return this.app.fetch(request, server)
  }

  createContext(_request: Request): GravitoContext<V> {
    // Create a minimal context for testing
    // In practice, this is called through the Photon routing pipeline
    throw new Error(
      'PhotonAdapter.createContext() should not be called directly. ' +
        'Use the router pipeline instead.'
    )
  }

  async init(): Promise<void> {
    // No-op for Photon
  }

  async shutdown(): Promise<void> {
    // No-op for Photon
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new PhotonAdapter instance
 */
export function createPhotonAdapter<V extends GravitoVariables = GravitoVariables>(
  config?: AdapterConfig
): PhotonAdapter<V> {
  return new PhotonAdapter<V>(config)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Exports
// ─────────────────────────────────────────────────────────────────────────────

export { PhotonContextWrapper, PhotonRequestWrapper }

// ─────────────────────────────────────────────────────────────────────────────
// Rebranded Aliases (Gravito Core)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rebranded alias for PhotonAdapter.
 * @category Rebranding
 */
export const GravitoAdapter = PhotonAdapter
/**
 * Rebranded alias for PhotonAdapter type.
 * @category Rebranding
 */
export type GravitoAdapter<V extends GravitoVariables = GravitoVariables> = PhotonAdapter<V>

/**
 * Rebranded alias for createPhotonAdapter.
 * @category Rebranding
 */
export const createGravitoAdapter = createPhotonAdapter
