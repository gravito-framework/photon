/**
 * @fileoverview Photon Type Extensions
 *
 * Type definitions for Photon framework extensions and internal properties.
 * These types help maintain type safety when working with Photon's native APIs.
 *
 * @module @gravito/photon/adapter
 * @since 2.0.0
 */

import type { GravitoContext as Context } from '@gravito/core'

/**
 * Extended Photon Request with additional properties
 */
export interface PhotonRequestExtended {
  /**
   * Return all route params when called without a name.
   */
  param(): Record<string, string>

  /**
   * Validate request data against a schema
   * This is typically added by validation middleware
   */
  valid<T = unknown>(target: string): T

  /**
   * Store validated payload for later retrieval.
   */
  setValidated?(target: string, data: unknown): void

  /**
   * Matched route pattern, if available.
   */
  routePattern?: string

  /**
   * Allow dynamic property access for middleware extensions
   */
  [key: string]: unknown
}

/**
 * Extended Photon Context with internal caching
 */
export interface PhotonContextExtended extends Context {
  /**
   * Internal cache for parsed JSON body to avoid re-parsing
   * @internal
   */
  _cachedJsonBody?: unknown

  /**
   * Extended request object
   */
  req: Context['req'] & PhotonRequestExtended
}

/**
 * Extended Response with flash message support
 * This is a partial interface since we're adding the method dynamically
 */
export interface ResponseWithFlash {
  /**
   * Add flash message to session (for redirect responses)
   * @param key - Flash message key
   * @param value - Flash message value
   * @returns The response for chaining
   */
  with(key: string, value: unknown): ResponseWithFlash

  [key: string]: unknown
}

/**
 * Session interface with flash message support
 */
export interface SessionWithFlash {
  /**
   * Store a flash message in the session
   */
  flash(key: string, value: unknown): void

  /**
   * Allow other session properties
   */
  [key: string]: unknown
}

/**
 * Type guard to check if context has cached JSON body
 */
export function hasCachedJsonBody(ctx: Context): ctx is PhotonContextExtended {
  return '_cachedJsonBody' in ctx
}

/**
 * Type guard to check if request has valid method
 */
export function hasValidMethod(req: Context['req']): req is Context['req'] & PhotonRequestExtended {
  const request = req as Context['req'] & Partial<PhotonRequestExtended>
  return 'valid' in request && typeof request.valid === 'function'
}
