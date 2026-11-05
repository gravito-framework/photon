/**
 * @fileoverview Photon-owned HTTP Types
 *
 * These types provide a unified abstraction layer that decouples the framework
 * from any specific HTTP engine (Photon, Express, custom, etc.).
 *
 * @module @gravito/photon
 * @since 2.0.0
 */

// Global type for ExecutionContext (Cloudflare Workers compatibility)
// This may be provided by the runtime environment
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void
    passThroughOnException(): void
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Method Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard HTTP methods supported by Gravito
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

/**
 * HTTP status codes
 */
export type StatusCode = number

/**
 * Content-bearing HTTP status codes (excludes 1xx, 204, 304)
 */
export type ContentfulStatusCode = Exclude<StatusCode, 100 | 101 | 102 | 103 | 204 | 304>

// ─────────────────────────────────────────────────────────────────────────────
// Context Variable Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Application-owned context variables. No framework services are injected.
 * Framework-specific augmentation belongs to the deferred Gravito integration.
 */
export interface GravitoVariables {
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Abstraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validated request data targets
 */
export type ValidationTarget = 'json' | 'query' | 'param' | 'header' | 'form' | 'cookie'

/**
 * GravitoRequest - Unified request interface
 *
 * Provides a consistent API for accessing request data regardless of
 * the underlying HTTP engine.
 *
 * @example
 * ```typescript
 * const userId = ctx.req.param('id')
 * const search = ctx.req.query('q')
 * const body = await ctx.req.json<CreateUserDto>()
 * ```
 */
export interface GravitoRequest {
  // ─────────────────────────────────────────────
  // URL & Method
  // ─────────────────────────────────────────────

  /** Full request URL */
  readonly url: string

  /** HTTP method (uppercase) */
  readonly method: string

  /** Request path without query string */
  readonly path: string

  /**
   * Route pattern (e.g., /users/:id) for the matched route
   *
   * This provides the parameterized route pattern instead of the concrete path,
   * which is critical for preventing high cardinality issues in metrics systems.
   *
   * @example
   * ```typescript
   * // For request: GET /users/123
   * ctx.req.path          // => "/users/123"
   * ctx.req.routePattern  // => "/users/:id"
   * ```
   */
  readonly routePattern?: string

  /**
   * Alias for routePattern (for Hono/Express compatibility)
   * @deprecated Use `routePattern` instead
   */
  readonly routePath?: string

  // ─────────────────────────────────────────────
  // Parameter Access
  // ─────────────────────────────────────────────

  /**
   * Get a route parameter value
   * @param name - Parameter name (e.g., 'id' for route '/users/:id')
   */
  param(name: string): string | undefined

  /**
   * Get all route parameters
   */
  params(): Record<string, string>

  /**
   * Get a query string parameter
   * @param name - Query parameter name
   */
  query(name: string): string | undefined

  /**
   * Get all query parameters
   */
  queries(): Record<string, string | string[]>

  /**
   * Get a request header value
   * @param name - Header name (case-insensitive)
   */
  header(name: string): string | undefined

  /**
   * Get all request headers
   */
  header(): Record<string, string>

  // ─────────────────────────────────────────────
  // Body Parsing
  // ─────────────────────────────────────────────

  /**
   * Parse request body as JSON
   * @throws {Error} If body is not valid JSON
   */
  json<T = unknown>(): Promise<T>

  /**
   * Parse request body as text
   */
  text(): Promise<string>

  /**
   * Parse request body as FormData
   */
  formData(): Promise<FormData>

  /**
   * Parse request body as ArrayBuffer
   */
  arrayBuffer(): Promise<ArrayBuffer>

  /**
   * Parse form data (urlencoded or multipart)
   */
  parseBody<T = unknown>(): Promise<T>

  /**
   * Get the raw Request object
   */
  readonly raw: Request

  // ─────────────────────────────────────────────
  // Validated Data (from FormRequest/Validator)
  // ─────────────────────────────────────────────

  /**
   * Get validated data from a specific source
   * @param target - The validation target
   * @throws {Error} If validation was not performed for this target
   */
  valid<T = unknown>(target: ValidationTarget): T

  /**
   * Store validated data for a specific source
   * @param target - The validation target
   * @param data - The validated data to store
   */
  setValidated(target: ValidationTarget, data: unknown): void
}

/**
 * Options for request forwarding (Proxy)
 */
export interface ProxyOptions {
  /** Override or add request headers */
  headers?: Record<string, string>
  /** Whether to keep the original Host header (default: false) */
  preserveHost?: boolean
  /** Whether to add X-Forwarded-* headers (default: true) */
  addForwardedHeaders?: boolean
  /** Path rewriting logic */
  rewritePath?: (path: string) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Abstraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GravitoContext - Unified request context
 *
 * This interface encapsulates all HTTP request/response operations,
 * enabling seamless replacement of the underlying HTTP engine.
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * // In a controller
 * async show(ctx: GravitoContext) {
 *   const id = ctx.req.param('id')
 *   const user = await User.find(id)
 *   return ctx.json({ user })
 * }
 * ```
 */
export interface GravitoContext<V extends object = GravitoVariables> {
  // ─────────────────────────────────────────────
  // Request & Response
  // ─────────────────────────────────────────────

  /** The incoming request */
  readonly req: GravitoRequest

  /**
   * The response object (for middleware introspection).
   * Middleware can read response headers and status, or mutate the response.
   *
   * @remarks
   * This property is mutable, allowing middleware to replace the response object.
   * Example: `c.res = new Response(...)`
   *
   * May be undefined until a handler creates a response.
   */
  res?: Response

  // ─────────────────────────────────────────────
  // Response Builders
  // ─────────────────────────────────────────────

  /**
   * Send a JSON response
   * @param data - Data to serialize as JSON
   * @param status - HTTP status code (default: 200)
   */
  json<T>(data: T, status?: ContentfulStatusCode): Response

  /**
   * Send a plain text response
   * @param text - Text content
   * @param status - HTTP status code (default: 200)
   */
  text(text: string, status?: ContentfulStatusCode): Response

  /**
   * Send an HTML response
   * @param html - HTML content
   * @param status - HTTP status code (default: 200)
   */
  html(html: string, status?: ContentfulStatusCode): Response

  /**
   * Send a redirect response
   * @param url - Target URL
   * @param status - Redirect status code (default: 302)
   */
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response

  /**
   * Create a Response with no body
   * @param status - HTTP status code
   */
  body(data: BodyInit | null, status?: StatusCode): Response

  /**
   * Stream a response
   * @param stream - ReadableStream to send
   * @param status - HTTP status code (default: 200)
   */
  stream(stream: ReadableStream, status?: ContentfulStatusCode): Response

  /**
   * Send a 404 Not Found response
   */
  notFound(message?: string): Response

  /**
   * Send a 403 Forbidden response
   */
  forbidden(message?: string): Response

  /**
   * Send a 401 Unauthorized response
   */
  unauthorized(message?: string): Response

  /**
   * Send a 400 Bad Request response
   */
  badRequest(message?: string): Response

  /**
   * Forward the current request to another URL (Reverse Proxy)
   * @param target - Target URL or base URL to forward to
   * @param options - Optional proxy options
   */
  forward(target: string, options?: ProxyOptions): Promise<Response>

  // ─────────────────────────────────────────────
  // Headers
  // ─────────────────────────────────────────────

  /**
   * Set a response header
   * @param name - Header name
   * @param value - Header value
   * @param options - Options (append: true to add multiple values)
   */
  header(name: string, value: string, options?: { append?: boolean }): void

  /**
   * Get a request header
   * @param name - Header name (case-insensitive)
   */
  header(name: string): string | undefined

  /**
   * Set the response status code
   * @param code - HTTP status code
   */
  status(code: StatusCode): void

  // ─────────────────────────────────────────────
  // Context Variables (Dependency Injection)
  // ─────────────────────────────────────────────

  /**
   * Get a context variable
   * @param key - Variable key
   */
  get<K extends keyof V>(key: K): V[K]

  /**
   * Set a context variable
   * @param key - Variable key
   * @param value - Variable value
   */
  set: (...args: ContextVariableArgs<V>) => void

  // ─────────────────────────────────────────────
  // Execution Control
  // ─────────────────────────────────────────────

  /**
   * Get the execution context (for Cloudflare Workers, etc.)
   */
  readonly executionCtx?: ExecutionContext

  /**
   * Get environment bindings (for Cloudflare Workers, etc.)
   */
  readonly env?: Record<string, unknown>

  // ─────────────────────────────────────────────
  // Native Access (Escape Hatch)
  // ─────────────────────────────────────────────

  /**
   * Access the native context object from the underlying HTTP engine.
   *
   * ⚠️ WARNING: Using this ties your code to a specific adapter.
   * Prefer using the abstraction methods when possible.
   *
   * @example
   * ```typescript
   * // Only when absolutely necessary
   * const photonCtx = ctx.native as Context // Photon Context
   * ```
   */
  readonly native: unknown

  // ─────────────────────────────────────────────
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler & Middleware Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Next function for middleware chain
 */
export type GravitoNext = () => Promise<Response | void>

/**
 * GravitoHandler - Standard route handler type
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * const handler: GravitoHandler = async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * }
 * ```
 */
export type GravitoHandler<V extends object = GravitoVariables> = (
  ctx: GravitoContext<V>
) => Response | Promise<Response>

/**
 * GravitoMiddleware - Standard middleware type
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * const logger: GravitoMiddleware = async (ctx, next) => {
 *   console.log(`${ctx.req.method} ${ctx.req.path}`)
 *   await next()
 * }
 * ```
 */
export type GravitoMiddleware<V extends object = GravitoVariables> = (
  ctx: GravitoContext<V>,
  next: GravitoNext
) => Response | void | Promise<Response | void>

/**
 * Error handler type
 */
export type GravitoErrorHandler<V extends object = GravitoVariables> = (
  error: Error,
  ctx: GravitoContext<V>
) => Response | Promise<Response>

/**
 * Not found handler type
 */
export type GravitoNotFoundHandler<V extends object = GravitoVariables> = (
  ctx: GravitoContext<V>
) => Response | Promise<Response>

/** Correlated key/value writes; function-property variance prevents wider writers. */
export type ContextVariableArgs<V extends object> = {
  [K in keyof V]-?: [key: K, value: V[K]]
}[keyof V]

/** HTTP operations without access to application variables. */
export type HttpContext = Omit<GravitoContext<{}>, 'get' | 'set'>

/** A builtin can write only its declared slots and cannot assume typed reads. */
export type WriteContext<W extends object> = HttpContext & Pick<GravitoContext<W>, 'set'>

export type MiddlewareFor<C> = (ctx: C, next: GravitoNext) => ReturnType<GravitoMiddleware>
