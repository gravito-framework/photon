/**
 * @fileoverview Middleware Utility for Photon
 *
 * Provides middleware helper functions for Gravito-based applications.
 * Since Photon now uses Gravito middleware natively, adapters are minimal.
 *
 * @module @gravito/photon/middleware-adapter
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'

/**
 * Identity function for Gravito middleware.
 *
 * This function accepts a GravitoMiddleware and returns it unchanged.
 * It serves as a type-safe way to ensure middleware implements the correct interface.
 *
 * @param middleware - Gravito-typed middleware function
 * @returns The same middleware function
 *
 * @example
 * ```typescript
 * import { asHonoMiddleware } from '@gravito/photon/middleware-adapter'
 * import { myGravitoMiddleware } from './my-middleware'
 *
 * const app = new Photon()
 * app.use(asHonoMiddleware(myGravitoMiddleware))
 * ```
 *
 * @internal
 */
export function asHonoMiddleware(middleware: GravitoMiddleware): GravitoMiddleware {
  return middleware
}
