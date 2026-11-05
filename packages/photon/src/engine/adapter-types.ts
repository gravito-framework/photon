import type { GravitoHandler, GravitoMiddleware, GravitoVariables, HttpMethod } from './http-types'

export interface RouteDefinition<V extends object = GravitoVariables> {
  method: HttpMethod
  path: string
  handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  name?: string
  middleware?: GravitoMiddleware<V>[]
}

/** Minimal request boundary required when mounting a sub-application. */
export interface HttpAdapter {
  fetch(request: Request): Response | Promise<Response>
}
