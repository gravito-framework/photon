import type { GravitoMiddleware, GravitoVariables } from './http-types'

/**
 * Route Handler type (simplified for internal use)
 * In the full framework this will align with GravitoHandler
 */
export type RouteHandler<V extends object = GravitoVariables> = GravitoMiddleware<V>

/**
 * Route Match Result
 */
export interface RouteMatch<V extends object = GravitoVariables> {
  handlers: RouteHandler<V>[]
  params: Record<string, string>
  options?: BunRouteOptions
}

/**
 * Route Options (Metadata)
 */
export interface BunRouteOptions {
  excludeMiddleware?: string[]
}

/**
 * Radix Node Type
 */
export enum NodeType {
  STATIC = 0,
  PARAM = 1,
  WILDCARD = 2,
}
