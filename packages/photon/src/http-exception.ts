/**
 * HTTP Exceptions for Photon.
 *
 * Standardized HTTP error classes (HttpException) for handling
 * error responses in a consistent way across the Gravito ecosystem.
 *
 * Gravito v1.x sources HTTP exceptions from @gravito/core. This module
 * provides backwards compatibility for existing imports:
 * - Old: import { HTTPException } from '@gravito/photon'
 * - New: import { HttpException } from '@gravito/core'
 *
 * Both import paths work and resolve to the same class.
 *
 * @public
 */
export { type ExceptionOptions, HttpException } from '@gravito/core'
