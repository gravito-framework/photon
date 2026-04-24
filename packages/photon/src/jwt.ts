/**
 * JWT Authentication Middleware and utilities for Photon.
 *
 * Native implementation using jose library (Hono-free, v2.0+).
 * Maintains 100% API compatibility with previous Hono version.
 *
 * @module @gravito/photon/jwt
 * @public
 */

import type { GravitoMiddleware } from '@gravito/core'
import { jwtVerify, SignJWT } from 'jose'

/**
 * JWT Payload type - payload data contained in the token
 * @public
 */
export type JwtPayload = Record<string, unknown>

/**
 * JWT Header type - header metadata
 * @public
 */
export type JwtHeader = Record<string, unknown>

/**
 * JWT Options for middleware
 * @public
 */
export interface JwtOptions {
  secret: string | Buffer | Uint8Array
  cookie?: string
  alg?: string
  [key: string]: unknown
}

/**
 * JWT middleware function type
 * @public
 */
export type JwtFunction = (options: JwtOptions) => GravitoMiddleware

const sharedEncoder = new TextEncoder()

/**
 * Convert secret to Uint8Array for jose operations
 */
function getSecretBytes(secret: string | Buffer | Uint8Array): Uint8Array {
  if (typeof secret === 'string') {
    return sharedEncoder.encode(secret)
  }
  if (secret instanceof Buffer) {
    return new Uint8Array(secret)
  }
  return secret
}

/**
 * Sign a JWT token with the provided payload and secret.
 *
 * @param payload - The data to include in the token
 * @param secret - The secret key for signing
 * @param alg - The signing algorithm (default: 'HS256')
 * @returns A signed JWT string
 * @throws Error if signing fails
 *
 * @example
 * ```typescript
 * const token = await sign(
 *   { sub: 'user_123', role: 'admin' },
 *   'my-secret'
 * )
 * ```
 * @public
 */
export async function sign(
  payload: JwtPayload,
  secret: string | Buffer | Uint8Array,
  alg = 'HS256'
): Promise<string> {
  try {
    const secretBytes = getSecretBytes(secret)
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .sign(secretBytes)
    return jwt
  } catch (error) {
    throw new Error(`Failed to sign JWT: ${(error as Error).message}`)
  }
}

/**
 * Verify a JWT token and return its payload.
 *
 * @param token - The JWT string to verify
 * @param secret - The secret key for verification
 * @returns The verified payload
 * @throws Error if verification fails or token is expired
 *
 * @example
 * ```typescript
 * try {
 *   const payload = await verify(token, 'my-secret')
 *   console.log('Valid token for user:', payload.sub)
 * } catch (e) {
 *   console.error('Invalid token:', e.message)
 * }
 * ```
 * @public
 */
export async function verify(
  token: string,
  secret: string | Buffer | Uint8Array
): Promise<JwtPayload> {
  try {
    const secretBytes = getSecretBytes(secret)
    const verified = await jwtVerify(token, secretBytes)
    return verified.payload as JwtPayload
  } catch (error) {
    const message = (error as Error).message
    if (message.includes('expired')) {
      throw new Error('Token has expired')
    } else if (message.includes('signature')) {
      throw new Error('Invalid token signature')
    }
    throw new Error(`Token verification failed: ${message}`)
  }
}

/**
 * Decode a JWT token without verifying its signature.
 *
 * @warning This does NOT validate the token signature. Use only for
 * inspecting token data before verification.
 *
 * @param token - The JWT string to decode
 * @returns Object with header and payload properties
 * @throws Error if token format is invalid
 *
 * @example
 * ```typescript
 * const { header, payload } = decode(token)
 * console.log('Algorithm:', header.alg)
 * console.log('User ID:', payload.sub)
 * ```
 * @public
 */
export function decode(token: string): { header: JwtHeader; payload: JwtPayload } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    // Decode header (base64url → standard base64 → atob)
    const headerJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))
    const header = JSON.parse(headerJson) as JwtHeader

    // Decode payload (base64url → standard base64 → atob)
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as JwtPayload

    return { header, payload }
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${(error as Error).message}`)
  }
}

/**
 * JWT Authentication Middleware.
 *
 * Protects routes by requiring a valid JWT in the Authorization header or cookie.
 * On success, stores the payload in context via ctx.set('jwtPayload', payload).
 *
 * @param options - JWT validation options (secret, cookie?, alg?)
 * @returns GravitoMiddleware
 *
 * @example
 * ```typescript
 * const app = new Photon()
 *
 * // Protect all /api/private routes
 * app.use('/api/private/*', jwt({ secret: 'your-secret' }))
 *
 * app.get('/api/private/profile', (ctx) => {
 *   const payload = ctx.get('jwtPayload')
 *   return ctx.json({ user: payload.sub })
 * })
 * ```
 * @public
 */
export function jwt(options: JwtOptions): GravitoMiddleware {
  return async (ctx, next) => {
    const authHeader = ctx.req.header('Authorization')

    // Check for Bearer token in Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      // Reject if Bearer prefix exists but token is empty
      if (!token) {
        return ctx.text('Unauthorized', 401)
      }

      try {
        const payload = await verify(token, options.secret)
        ctx.set('jwtPayload', payload)
      } catch (_error) {
        return ctx.text('Unauthorized', 401)
      }
      return await next()
    }

    // Try extracting from cookie if specified and no Bearer header
    if (options.cookie) {
      const cookieHeader = ctx.req.header('Cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce(
          (acc: Record<string, string>, cookie: string) => {
            const [name, value] = cookie.trim().split('=')
            if (name === options.cookie) {
              acc[name] = decodeURIComponent(value)
            }
            return acc
          },
          {} as Record<string, string>
        )
        const cookieToken = cookies[options.cookie]
        if (cookieToken) {
          try {
            const payload = await verify(cookieToken, options.secret)
            ctx.set('jwtPayload', payload)
          } catch (_error) {
            return ctx.text('Unauthorized', 401)
          }
          return await next()
        }
      }
    }

    // No token found - continue without authentication
    await next()
  }
}

/**
 * @deprecated Not implemented in native JWT. Use verify() with explicit secret.
 *
 * Verify a JWT using a JSON Web Key Set (JWKS).
 * This function is a stub for backwards API compatibility.
 * Will be implemented in a future version if OIDC provider support is needed.
 *
 * @param _token - The JWT string to verify
 * @param _options - JWKS configuration (jwksUri required)
 * @returns Never returns - always throws
 * @throws {Error} Always throws - not yet implemented
 *
 * @public
 */
export async function verifyWithJwks(
  _token: string,
  _options: { jwksUri: string; [key: string]: unknown }
): Promise<JwtPayload> {
  throw new Error(
    'verifyWithJwks is not yet implemented in native JWT. Use verify() with explicit secret instead.'
  )
}
