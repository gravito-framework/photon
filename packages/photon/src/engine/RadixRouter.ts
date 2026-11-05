import type { GravitoVariables, HttpMethod } from './http-types'
import { RadixNode } from './RadixNode'
import { type BunRouteOptions, NodeType, type RouteHandler, type RouteMatch } from './types'

/**
 * Simple LRU Cache for route matching
 * @internal
 */
class RouteCache<V extends object = GravitoVariables> {
  private cache = new Map<string, RouteMatch<V> | null>()
  private readonly maxSize = 10000

  get(key: string): RouteMatch<V> | null | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: RouteMatch<V> | null): void {
    if (this.cache.size >= this.maxSize) {
      // Remove first (oldest) entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }
}

/**
 * High-performance Radix Tree Router for Bun
 */
export class RadixRouter<V extends object = GravitoVariables> {
  private root: RadixNode<V> = new RadixNode<V>()

  // Global parameter constraints (e.g., id => /^\d+$/)
  private globalConstraints: Map<string, RegExp> = new Map()

  // Route cache (P2 optimization)
  private routeCache = new RouteCache<V>()

  /**
   * Add a generic parameter constraint
   */
  where(param: string, regex: RegExp): void {
    this.globalConstraints.set(param, regex)
  }

  /**
   * Register a route
   */
  add(
    method: HttpMethod,
    path: string,
    handlers: RouteHandler<V>[],
    options?: BunRouteOptions
  ): void {
    let node = this.root
    const segments = this.splitPath(path)

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!

      // Determine node type
      if (segment === '*') {
        // Wildcard
        if (!node.wildcardChild) {
          node.wildcardChild = new RadixNode<V>('*', NodeType.WILDCARD)
        }
        node = node.wildcardChild
        break
      } else if (segment.startsWith(':')) {
        // Parameter
        const paramName = segment.slice(1)
        if (!node.paramChild) {
          const child = new RadixNode<V>(segment, NodeType.PARAM)
          child.paramName = paramName
          // Apply global constraint if exists
          const constraint = this.globalConstraints.get(paramName)
          if (constraint) {
            child.regex = constraint
          }
          node.paramChild = child
        }
        node = node.paramChild!
      } else {
        // Static
        if (!node.children.has(segment)) {
          node.children.set(segment, new RadixNode<V>(segment, NodeType.STATIC))
        }
        node = node.children.get(segment)!
      }
    }

    // Ensure we store handlers for lowercase method
    const normalizedMethod = method.toLowerCase() as HttpMethod
    node.handlers.set(normalizedMethod, handlers)
    if (options) {
      node.options.set(normalizedMethod, options)
    }

    // P2 optimization: Clear cache when new route added
    this.routeCache.clear()
  }

  /**
   * Match a request
   */
  match(method: string, path: string): RouteMatch<V> | null {
    const normalizedMethod = method.toLowerCase() as HttpMethod

    // Fast path for root
    if (path === '/' || path === '') {
      const handlers = this.root.handlers.get(normalizedMethod)
      if (handlers) {
        return { handlers, params: {}, options: this.root.options.get(normalizedMethod) }
      }
      return null
    }

    // P2 optimization: Check route cache first
    const cacheKey = `${normalizedMethod}:${path}`
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey) ?? null
    }

    // Removing leading slash for faster segmenting
    const searchPath = path.startsWith('/') ? path.slice(1) : path
    const segments = searchPath.split('/')

    const result = this.matchRecursive(this.root, segments, 0, {}, normalizedMethod)

    // P2 optimization: Cache the result
    this.routeCache.set(cacheKey, result)

    return result
  }

  private matchRecursive(
    node: RadixNode<V>,
    segments: string[],
    depth: number,
    params: Record<string, string>,
    method: HttpMethod
  ): RouteMatch<V> | null {
    // 1. Check if we reached end of path
    if (depth >= segments.length) {
      let handlers = node.handlers.get(method)
      let options = node.options.get(method)

      if (!handlers) {
        handlers = node.handlers.get('all' as HttpMethod)
        options = node.options.get('all' as HttpMethod)
      }

      if (handlers) {
        return { handlers, params, options }
      }

      // If no handlers on current node, but we have a wildcard child, it matches (empty string)
      if (node.wildcardChild) {
        let wh = node.wildcardChild.handlers.get(method)
        let wo = node.wildcardChild.options.get(method)
        if (!wh) {
          wh = node.wildcardChild.handlers.get('all' as HttpMethod)
          wo = node.wildcardChild.options.get('all' as HttpMethod)
        }
        if (wh) {
          params['*'] = ''
          return { handlers: wh, params, options: wo }
        }
      }

      return null
    }

    const segment = segments[depth]!

    // 2. Try Static Match
    const staticChild = node.children.get(segment)
    if (staticChild) {
      const match = this.matchRecursive(staticChild, segments, depth + 1, params, method)
      if (match) {
        return match
      }
    }

    // 3. Try Param Match
    const paramChild = node.paramChild
    if (paramChild) {
      // Check constraints
      if (paramChild.regex && !paramChild.regex.test(segment)) {
        // Constraint failed, continue to wildcard
      } else {
        // Capture param
        if (paramChild.paramName) {
          params[paramChild.paramName] = decodeURIComponent(segment)
          const match = this.matchRecursive(paramChild, segments, depth + 1, params, method)
          if (match) {
            return match
          }
          // Backtrack
          delete params[paramChild.paramName]
        }
      }
    }

    // 4. Try Wildcard Match
    if (node.wildcardChild) {
      let handlers = node.wildcardChild.handlers.get(method)
      let options = node.wildcardChild.options.get(method)

      if (!handlers) {
        handlers = node.wildcardChild.handlers.get('all' as HttpMethod)
        options = node.wildcardChild.options.get('all' as HttpMethod)
      }

      if (handlers) {
        // Capture the remainder as '*' param
        const wildcardPath = segments.slice(depth).join('/')
        params['*'] = wildcardPath
        return { handlers, params, options }
      }
    }

    return null
  }

  private splitPath(path: string): string[] {
    if (path === '/' || path === '') {
      return []
    }
    let p = path
    if (p.startsWith('/')) {
      p = p.slice(1)
    }
    if (p.endsWith('/')) {
      p = p.slice(0, -1)
    }
    return p.split('/')
  }

  /**
   * Serialize the router to a JSON string
   */
  serialize(): string {
    return JSON.stringify({
      root: this.root.toJSON(),
      globalConstraints: Array.from(this.globalConstraints.entries()).map(([k, v]) => [
        k,
        v.source,
      ]),
    })
  }

  /**
   * Restore a router from a serialized JSON string
   */
  static fromSerialized<V extends object = GravitoVariables>(json: string): RadixRouter<V> {
    const data = JSON.parse(json)
    const router = new RadixRouter<V>()

    router.root = RadixNode.fromJSON<V>(data.root)

    if (data.globalConstraints) {
      for (const [key, source] of data.globalConstraints) {
        router.globalConstraints.set(key, new RegExp(source))
      }
    }

    return router
  }
}
