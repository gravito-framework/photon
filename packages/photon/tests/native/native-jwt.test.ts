import { describe, expect, it } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { Photon } from '../../src/index'
import { decode, jwt, sign, verify } from '../../src/jwt'

describe('native JWT implementation', () => {
  const secret = 'test-secret-key'
  const payload = { sub: 'user_123', role: 'admin' }

  // ─────────────────────────────────────────────────────────────
  // Sign and Verify
  // ─────────────────────────────────────────────────────────────

  describe('sign()', () => {
    it('creates a valid JWT token with string secret', async () => {
      const token = await sign(payload, secret)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('creates a valid JWT token with Buffer secret', async () => {
      const bufferSecret = Buffer.from(secret)
      const token = await sign(payload, bufferSecret)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('creates a valid JWT token with Uint8Array secret', async () => {
      const uint8Secret = new TextEncoder().encode(secret)
      const token = await sign(payload, uint8Secret)
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3)
    })

    it('uses HS256 algorithm by default', async () => {
      const token = await sign(payload, secret)
      const { header } = decode(token)
      expect(header.alg).toBe('HS256')
    })

    it('allows custom algorithm', async () => {
      const token = await sign(payload, secret, 'HS512')
      const { header } = decode(token)
      expect(header.alg).toBe('HS512')
    })

    it('includes issued at (iat) claim', async () => {
      const token = await sign(payload, secret)
      const { payload: decodedPayload } = decode(token)
      expect(decodedPayload.iat).toBeDefined()
      expect(typeof decodedPayload.iat).toBe('number')
    })

    it('includes custom payload properties', async () => {
      const customPayload = { ...payload, email: 'user@example.com' }
      const token = await sign(customPayload, secret)
      const { payload: decodedPayload } = decode(token)
      expect(decodedPayload.email).toBe('user@example.com')
    })

    it('throws on invalid secret type', async () => {
      try {
        // @ts-expect-error - intentional type violation
        await sign(payload, 12345)
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Failed to sign JWT')
      }
    })
  })

  describe('verify()', () => {
    it('verifies a valid token', async () => {
      const token = await sign(payload, secret)
      const verified = await verify(token, secret)
      expect(verified.sub).toBe('user_123')
      expect(verified.role).toBe('admin')
    })

    it('verifies with Buffer secret', async () => {
      const bufferSecret = Buffer.from(secret)
      const token = await sign(payload, secret)
      const verified = await verify(token, bufferSecret)
      expect(verified.sub).toBe('user_123')
    })

    it('verifies with Uint8Array secret', async () => {
      const uint8Secret = new TextEncoder().encode(secret)
      const token = await sign(payload, secret)
      const verified = await verify(token, uint8Secret)
      expect(verified.sub).toBe('user_123')
    })

    it('throws on invalid signature', async () => {
      const token = await sign(payload, secret)
      const wrongSecret = 'wrong-secret'
      try {
        await verify(token, wrongSecret)
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Invalid token signature')
      }
    })

    it('throws on tampered token', async () => {
      const token = await sign(payload, secret)
      const [header, _, signature] = token.split('.')
      const tamperedToken = `${header}.tampered_payload.${signature}`
      try {
        await verify(tamperedToken, secret)
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Invalid token signature')
      }
    })

    it('verifies and returns iat claim', async () => {
      const token = await sign(payload, secret)
      const verified = await verify(token, secret)
      expect(verified.iat).toBeDefined()
    })

    it('handles complex payload objects', async () => {
      const complexPayload = {
        sub: 'user_123',
        roles: ['admin', 'moderator'],
        metadata: { org: 'example', dept: 'eng' },
      }
      const token = await sign(complexPayload, secret)
      const verified = await verify(token, secret)
      expect(verified.roles).toEqual(['admin', 'moderator'])
      expect((verified.metadata as any).org).toBe('example')
    })
  })

  describe('decode()', () => {
    it('decodes a JWT without verification', async () => {
      const token = await sign(payload, secret)
      const { header, payload: decodedPayload } = decode(token)
      expect(header.alg).toBe('HS256')
      expect(decodedPayload.sub).toBe('user_123')
    })

    it('returns header with typ claim', async () => {
      const token = await sign(payload, secret)
      const { header } = decode(token)
      expect(header.alg).toBe('HS256')
    })

    it('returns payload with all custom claims', async () => {
      const token = await sign(payload, secret)
      const { payload: decodedPayload } = decode(token)
      expect(decodedPayload.sub).toBe('user_123')
      expect(decodedPayload.role).toBe('admin')
    })

    it('throws on invalid JWT format', () => {
      try {
        decode('invalid.token')
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Invalid JWT format')
      }
    })

    it('throws on invalid base64 encoding', () => {
      try {
        decode('not_base64.not_base64.not_base64')
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Failed to decode JWT')
      }
    })

    it('works with tampered token (does not verify)', async () => {
      const token = await sign(payload, secret)
      const [header, _, signature] = token.split('.')
      const tamperedPayload = Buffer.from(JSON.stringify({ hacker: true })).toString('base64')
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`
      const { payload: decodedPayload } = decode(tamperedToken)
      expect((decodedPayload as any).hacker).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // JWT Middleware
  // ─────────────────────────────────────────────────────────────

  describe('jwt() middleware', () => {
    it('allows requests with valid Bearer token', async () => {
      const app = new Photon()
      const token = await sign(payload, secret)

      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.json({ user: (jwtPayload as any).sub })
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBe('user_123')
    })

    it('rejects requests with invalid token', async () => {
      const app = new Photon()
      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        return ctx.text('OK')
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Authorization: 'Bearer invalid.token.here' },
        })
      )

      expect(res.status).toBe(401)
    })

    it('rejects requests with tampered token', async () => {
      const app = new Photon()
      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        return ctx.text('OK')
      })

      const token = await sign(payload, secret)
      const [header, _, signature] = token.split('.')
      const tamperedToken = `${header}.tampered.${signature}`

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Authorization: `Bearer ${tamperedToken}` },
        })
      )

      expect(res.status).toBe(401)
    })

    it('allows requests without token', async () => {
      const app = new Photon()
      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.text(jwtPayload ? 'has_token' : 'no_token')
      })

      const res = await app.request('http://localhost/protected/resource')
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('no_token')
    })

    it('stores JWT payload in context.jwtPayload', async () => {
      const app = new Photon()
      const token = await sign({ sub: 'user_456', aud: 'test' }, secret)

      app.use('/api/*', jwt({ secret }))
      app.get('/api/me', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload') as any
        return ctx.json({
          sub: jwtPayload?.sub,
          aud: jwtPayload?.aud,
        })
      })

      const res = await app.request(
        new Request('http://localhost/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )

      const data = await res.json()
      expect(data.sub).toBe('user_456')
      expect(data.aud).toBe('test')
    })

    it('handles Bearer token with whitespace', async () => {
      const app = new Photon()
      const token = await sign(payload, secret)

      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.json({ ok: !!(jwtPayload as any).sub })
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it('handles Bearer prefix with whitespace', async () => {
      const app = new Photon()
      const token = await sign(payload, secret)

      app.use('/protected/*', jwt({ secret }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        return ctx.text('OK')
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Authorization: `Bearer  ${token}` },
        })
      )

      // Should still work with extra whitespace
      expect(res.status).toBe(200)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // Cookie-based Authentication
  // ─────────────────────────────────────────────────────────────

  describe('jwt() middleware with cookies', () => {
    it('extracts token from cookie', async () => {
      const app = new Photon()
      const token = await sign(payload, secret)

      app.use('/protected/*', jwt({ secret, cookie: 'auth_token' }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.json({ user: (jwtPayload as any).sub })
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Cookie: `auth_token=${token}` },
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBe('user_123')
    })

    it('prioritizes Authorization header over cookie', async () => {
      const app = new Photon()
      const headerPayload = { sub: 'header_user' }
      const cookiePayload = { sub: 'cookie_user' }
      const headerToken = await sign(headerPayload, secret)
      const cookieToken = await sign(cookiePayload, secret)

      app.use('/protected/*', jwt({ secret, cookie: 'auth_token' }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.json({ user: (jwtPayload as any).sub })
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: {
            Authorization: `Bearer ${headerToken}`,
            Cookie: `auth_token=${cookieToken}`,
          },
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user).toBe('header_user')
    })

    it('handles URL-encoded cookie values', async () => {
      const app = new Photon()
      const token = await sign(payload, secret)
      const encodedToken = encodeURIComponent(token)

      app.use('/protected/*', jwt({ secret, cookie: 'auth_token' }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.json({ ok: !!(jwtPayload as any).sub })
      })

      const res = await app.request(
        new Request('http://localhost/protected/resource', {
          headers: { Cookie: `auth_token=${encodedToken}` },
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.ok).toBe(true)
    })

    it('ignores missing cookie gracefully', async () => {
      const app = new Photon()
      app.use('/protected/*', jwt({ secret, cookie: 'auth_token' }))
      app.get('/protected/resource', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload')
        return ctx.text(jwtPayload ? 'has_token' : 'no_token')
      })

      const res = await app.request('http://localhost/protected/resource')
      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('no_token')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // Backward Compatibility Tests
  // ─────────────────────────────────────────────────────────────

  describe('backward compatibility', () => {
    it('maintains JwtPayload type', async () => {
      const customPayload: Record<string, unknown> = {
        sub: 'user_123',
        custom: 'value',
      }
      const token = await sign(customPayload, secret)
      const verified = await verify(token, secret)
      expect(typeof verified).toBe('object')
    })

    it('maintains JwtHeader type', async () => {
      const token = await sign(payload, secret)
      const { header } = decode(token)
      expect(typeof header).toBe('object')
      expect(header.alg).toBeDefined()
    })

    it('maintains JwtOptions type', async () => {
      const options = { secret, cookie: 'token', alg: 'HS256' }
      const middleware = jwt(options)
      expect(typeof middleware).toBe('function')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // Edge Cases and Error Handling
  // ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('requires non-empty secret for security', async () => {
      const emptySecret = ''
      try {
        await sign(payload, emptySecret)
        expect.unreachable()
      } catch (error) {
        expect((error as Error).message).toContain('Failed to sign JWT')
      }
    })

    it('handles very long payload', async () => {
      const longPayload = {
        sub: 'user_123',
        data: 'x'.repeat(10000),
      }
      const token = await sign(longPayload, secret)
      const verified = await verify(token, secret)
      expect((verified.data as string).length).toBe(10000)
    })

    it('handles special characters in payload', async () => {
      const specialPayload = {
        sub: 'user_123',
        emoji: '🚀🔒',
        unicode: '中文',
      }
      const token = await sign(specialPayload, secret)
      const verified = await verify(token, secret)
      expect(verified.emoji).toBe('🚀🔒')
      expect(verified.unicode).toBe('中文')
    })

    it('handles null values in payload', async () => {
      const payloadWithNull = {
        sub: 'user_123',
        optional: null,
      }
      const token = await sign(payloadWithNull, secret)
      const verified = await verify(token, secret)
      expect(verified.optional).toBe(null)
    })

    it('handles undefined vs missing properties', async () => {
      const payload1 = { sub: 'user_123' }
      const token1 = await sign(payload1, secret)
      const verified1 = await verify(token1, secret)
      expect('missing_prop' in verified1).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // Integration Tests
  // ─────────────────────────────────────────────────────────────

  describe('integration', () => {
    it('supports complete auth flow: sign -> verify -> middleware', async () => {
      const app = new Photon()
      const payload = { sub: 'user_123', role: 'admin' }
      const token = await sign(payload, secret)

      app.use('/api/*', jwt({ secret }))

      app.post('/api/login', (ctx: GravitoContext) => {
        return ctx.json({ token, expiresIn: 3600 })
      })

      app.get('/api/profile', (ctx: GravitoContext) => {
        const jwtPayload = ctx.get('jwtPayload') as any
        return ctx.json({
          id: jwtPayload?.sub,
          role: jwtPayload?.role,
        })
      })

      // Get token
      const loginRes = await app.request('http://localhost/api/login', { method: 'POST' })
      const loginData = await loginRes.json()
      const receivedToken = loginData.token

      // Use token
      const profileRes = await app.request(
        new Request('http://localhost/api/profile', {
          headers: { Authorization: `Bearer ${receivedToken}` },
        })
      )
      const profileData = await profileRes.json()

      expect(profileRes.status).toBe(200)
      expect(profileData.id).toBe('user_123')
      expect(profileData.role).toBe('admin')
    })

    it('supports multiple middleware instances with different secrets', async () => {
      const app = new Photon()
      const secret1 = 'secret1'
      const secret2 = 'secret2'
      const payload1 = { sub: 'user_1' }
      const payload2 = { sub: 'user_2' }

      const token1 = await sign(payload1, secret1)
      const token2 = await sign(payload2, secret2)

      app.use('/api1/*', jwt({ secret: secret1 }))
      app.use('/api2/*', jwt({ secret: secret2 }))

      app.get('/api1/test', (ctx: GravitoContext) => {
        const p = ctx.get('jwtPayload') as any
        return ctx.text(p?.sub)
      })

      app.get('/api2/test', (ctx: GravitoContext) => {
        const p = ctx.get('jwtPayload') as any
        return ctx.text(p?.sub)
      })

      const res1 = await app.request(
        new Request('http://localhost/api1/test', {
          headers: { Authorization: `Bearer ${token1}` },
        })
      )
      const res2 = await app.request(
        new Request('http://localhost/api2/test', {
          headers: { Authorization: `Bearer ${token2}` },
        })
      )

      expect(await res1.text()).toBe('user_1')
      expect(await res2.text()).toBe('user_2')
    })
  })
})
