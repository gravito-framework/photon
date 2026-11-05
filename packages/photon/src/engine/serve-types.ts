import type { Serve } from 'bun'

// Distribute over Bun's TCP/Unix union; Photon owns the request dispatch fields.
type BaseOptions<T> = T extends unknown ? Omit<T, 'fetch' | 'routes' | 'websocket'> : never
export type PhotonServeOptions = BaseOptions<Serve.Options<unknown>> & {
  fetch?: never
  routes?: never
  websocket?: never
}
export type PhotonServeConfig = Serve.Options<unknown>
