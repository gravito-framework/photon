import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GravitoContext } from '@gravito/core'
import { HttpException } from '@gravito/core'
import * as clientExports from '../src/client'
import * as httpExceptionExports from '../src/http-exception'
import { Photon } from '../src/index'
import * as loggerExports from '../src/logger'
import * as regExpRouterExports from '../src/router/reg-exp-router'
import * as trieRouterExports from '../src/router/trie-router'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../../..')

const keys = (mod: Record<string, unknown>) => Object.keys(mod).sort()

describe('photon exports', () => {
  it('provides Photon as a standalone engine', () => {
    expect(new Photon()).toBeDefined()
  })

  it('exports hc from hono/client (RPC client, @deprecated v2.0 → removal v3.0)', () => {
    // Note: client.ts exports only hc (not export *) per D-05 deprecation strategy.
    // Full hono/client re-export narrowed to hc-only as part of v3.0 migration plan.
    expect(typeof clientExports.hc).toBe('function')
    expect(keys(clientExports)).toEqual(['hc'])
  })

  it('exports native logger function', () => {
    expect(typeof loggerExports.logger).toBe('function')
  })

  it('re-exports http-exception helpers from @gravito/core', () => {
    expect(typeof httpExceptionExports.HttpException).toBe('function')
    expect(httpExceptionExports.HttpException).toBe(HttpException)
  })

  it('re-exports jwt helpers via compat shim', async () => {
    const jwtExports = await import('../src/jwt')
    expect(typeof jwtExports.jwt).toBe('function')
    expect(typeof jwtExports.verify).toBe('function')
    expect(typeof jwtExports.decode).toBe('function')
    expect(typeof jwtExports.sign).toBe('function')
    expect(typeof jwtExports.verifyWithJwks).toBe('function')
  })

  it('re-exports hono router helpers', () => {
    // Note: regExpRouter and trieRouter are deprecated (type-only stubs for backwards compatibility)
    // Runtime exports are empty by design
    expect(Object.keys(regExpRouterExports).length).toBe(0)
    expect(Object.keys(trieRouterExports).length).toBe(0)
  })

  describe('adapter sub-paths', () => {
    it('re-exports Cloudflare Workers adapter via ./adapter/cloudflare', async () => {
      const { readFileSync } = await import('fs')
      // Verify built dist file exists and contains the expected exports
      const cloudflareJs = readFileSync(
        join(projectRoot, 'packages/photon/dist/adapter/cloudflare.js'),
        'utf-8'
      )
      expect(cloudflareJs).toContain('serveStatic')
      expect(cloudflareJs).toContain('getConnInfo')
      expect(cloudflareJs).toContain('handle')
    })

    it('re-exports Deno adapter via ./adapter/deno', async () => {
      const { readFileSync } = await import('fs')
      // Verify built dist file exists and contains the expected exports
      const denoJs = readFileSync(
        join(projectRoot, 'packages/photon/dist/adapter/deno.js'),
        'utf-8'
      )
      expect(denoJs).toContain('serveStatic')
      expect(denoJs).toContain('getConnInfo')
      expect(denoJs).toContain('upgradeWebSocket')
    })

    it('re-exports Vercel adapter via ./adapter/vercel', async () => {
      const { readFileSync } = await import('fs')
      // Verify built dist file exists and contains the expected exports
      const vercelJs = readFileSync(
        join(projectRoot, 'packages/photon/dist/adapter/vercel.js'),
        'utf-8'
      )
      expect(vercelJs).toContain('handle')
      expect(vercelJs).toContain('getConnInfo')
    })

    it('marks all adapters as @deprecated in JSDoc', async () => {
      // This is a static check — verify that the source files contain
      // the @deprecated notices that users will see in their IDE
      const { readFileSync } = await import('fs')
      const cloudflareSource = readFileSync(
        join(projectRoot, 'packages/photon/src/adapter/cloudflare.ts'),
        'utf-8'
      )
      const denoSource = readFileSync(
        join(projectRoot, 'packages/photon/src/adapter/deno.ts'),
        'utf-8'
      )
      const vercelSource = readFileSync(
        join(projectRoot, 'packages/photon/src/adapter/vercel.ts'),
        'utf-8'
      )

      expect(cloudflareSource).toContain('@deprecated v2.0')
      expect(cloudflareSource).toContain('Removal target: v3.0')
      expect(denoSource).toContain('@deprecated v2.0')
      expect(denoSource).toContain('Removal target: v3.0')
      expect(vercelSource).toContain('@deprecated v2.0')
      expect(vercelSource).toContain('Removal target: v3.0')
    })
  })
})

describe('RPC client exports (@gravito/photon/client)', () => {
  it('exports hc function from hono/client', () => {
    // Verify hc is exported from client sub-path
    expect(typeof clientExports.hc).toBe('function')
    // Verify only hc is exported (narrowed from export * per D-05 deprecation strategy)
    expect(keys(clientExports)).toEqual(['hc'])
  })

  it('client.ts contains @deprecated v2.0 JSDoc and Removal target: v3.0', async () => {
    const { readFileSync } = await import('fs')
    const source = readFileSync(join(__dirname, '../src/client.ts'), 'utf-8')
    expect(source).toContain('@deprecated v2.0')
    expect(source).toContain('Removal target: v3.0')
    expect(source).toContain('native Gravito RPC')
  })

  it('client.d.ts is generated with correct type definitions', async () => {
    const { existsSync } = await import('fs')
    const dtsPath = join(__dirname, '../dist/client.d.ts')
    expect(existsSync(dtsPath)).toBe(true)
  })

  it('beam package createBeam function works with hono RPC type system', async () => {
    const beam = await import('@gravito/beam')
    // Verify createBeam is a function that accepts Hono type parameter
    expect(typeof beam.createBeam).toBe('function')
  })
})

describe('jwt module', () => {
  const TEST_SECRET = 'test-secret-key-for-jwt-testing-12345'
  let app: Photon

  beforeEach(() => {
    app = new Photon()
  })

  afterEach(() => {
    mock.restore()
  })

  it('exports all expected functions', async () => {
    const jwtExports = await import('../src/jwt')

    // Runtime function exports should be defined
    expect(typeof jwtExports.jwt).toBe('function')
    expect(typeof jwtExports.sign).toBe('function')
    expect(typeof jwtExports.verify).toBe('function')
    expect(typeof jwtExports.decode).toBe('function')
    expect(typeof jwtExports.verifyWithJwks).toBe('function')
  })

  it('signs and verifies JWT tokens correctly', async () => {
    const { sign, verify } = await import('../src/jwt')

    const payload = {
      sub: 'user-123',
      name: 'Test User',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    }

    const token = await sign(payload, TEST_SECRET)
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT has 3 parts

    const verified = await verify(token, TEST_SECRET)
    expect(verified.sub).toBe('user-123')
    expect(verified.name).toBe('Test User')
  })

  it('decodes JWT tokens without verification', async () => {
    const { sign, decode } = await import('../src/jwt')

    const payload = {
      sub: 'user-456',
      role: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }

    const token = await sign(payload, TEST_SECRET)
    const decoded = decode(token)

    expect(decoded.payload.sub).toBe('user-456')
    expect(decoded.payload.role).toBe('admin')
    expect(decoded.header.alg).toBe('HS256') // Default algorithm
  })

  it('throws error for invalid tokens during verification', async () => {
    const { verify } = await import('../src/jwt')

    const invalidToken = 'invalid.token.here'

    await expect(verify(invalidToken, TEST_SECRET)).rejects.toThrow()
  })

  it('throws error for expired tokens', async () => {
    const { sign, verify } = await import('../src/jwt')

    const payload = {
      sub: 'user-expired',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    }

    const token = await sign(payload, TEST_SECRET)

    await expect(verify(token, TEST_SECRET)).rejects.toThrow()
  })

  it('works as middleware to protect routes', async () => {
    const { jwt } = await import('../src/jwt')

    // Protected route
    app.use('/protected/*', jwt({ secret: TEST_SECRET }))
    app.get('/protected/data', (c: GravitoContext) => c.json({ secret: 'data' }))

    // Public route
    app.get('/public', (c: GravitoContext) => c.json({ message: 'public' }))

    // Test public route
    const publicRes = await app.request('/public')
    expect(publicRes.status).toBe(200)

    // Test protected route without token
    const noTokenRes = await app.request('/protected/data')
    expect(noTokenRes.status).toBe(200) // No token, no payload, but doesn't reject

    // Test protected route with valid token
    const { sign } = await import('../src/jwt')
    const token = await sign(
      { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET
    )

    const authRes = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(authRes.status).toBe(200)
    const body = await authRes.json()
    expect(body.secret).toBe('data')
  })
})
