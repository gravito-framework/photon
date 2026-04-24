/**
 * RPC client for type-safe remote procedure calls.
 *
 * Uses Hono's hc() type inference system and App type constraints.
 * Type-only dependency — no runtime code from hono/client is executed.
 *
 * @deprecated v2.0 — RPC client type system targeting migration to native implementation
 *
 * Removal target: v3.0
 *
 * In v3.0+, this module will be replaced with a native Gravito RPC type system
 * that doesn't require Hono dependencies. v2.0 and v2.x users can continue using
 * this for type-safe RPC clients via @gravito/beam.
 *
 * @example
 * ```typescript
 * import { hc } from '@gravito/photon/client'
 * import type { Hono } from 'hono'
 *
 * // Type inference for Beam RPC client
 * const client = beam.createClient<typeof app>('http://localhost:3000')
 * ```
 *
 * @see {@link https://gravito.dev/docs/rpc} Gravito RPC documentation
 * @see {@link https://hono.dev/docs/helpers/client} Hono hc() helper
 */
export { hc } from 'hono/client'
