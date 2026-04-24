// @ts-nocheck
/**
 * Contract tests for Photon Circuit Breaker Middleware
 *
 * Verifies D-07 (public API unchanged) and D-08 (503 + Retry-After header).
 */

import { describe, expect, it } from 'bun:test'
import { Photon } from '../../src/index'
import { circuitBreaker, circuitBreakerPresets } from '../../src/middleware/circuit-breaker'

describe('Contract: circuitBreaker middleware returns 503 when circuit is open', () => {
  it('returns 503 when circuit is open', async () => {
    const app = new Photon()

    // failureThreshold:1 means open after first failure
    app.use(
      '/api',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 30000,
      })
    )
    app.get('/api', (c) => c.text('error', 500))

    // Trigger one failure to open circuit
    await app.request('/api')

    // Next request should be blocked by open circuit
    const res = await app.request('/api')
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.error).toBe('Service Unavailable')
  })

  it('503 response includes Retry-After header (D-08)', async () => {
    const app = new Photon()

    app.use(
      '/api',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 30000,
      })
    )
    app.get('/api', (c) => c.text('error', 500))

    // Trigger failure to open circuit
    await app.request('/api')

    // Next request should be 503 with Retry-After: 30
    const res = await app.request('/api')
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('Retry-After matches resetTimeoutMs (60s -> header: 60)', async () => {
    const app = new Photon()

    app.use(
      '/api',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 60000,
      })
    )
    app.get('/api', (c) => c.text('error', 500))

    await app.request('/api')
    const res = await app.request('/api')
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('60')
  })
})

describe('Contract: circuitBreakerPresets', () => {
  it('circuitBreakerPresets.standard() returns valid middleware function', () => {
    const middleware = circuitBreakerPresets.standard()
    expect(typeof middleware).toBe('function')
  })

  it('circuitBreakerPresets.sensitive() returns valid middleware function', () => {
    const middleware = circuitBreakerPresets.sensitive()
    expect(typeof middleware).toBe('function')
  })

  it('circuitBreakerPresets.resilient() returns valid middleware function', () => {
    const middleware = circuitBreakerPresets.resilient()
    expect(typeof middleware).toBe('function')
  })

  it('standard preset opens after exactly 5 failures (not 4)', async () => {
    const app = new Photon()

    app.use('/api', circuitBreakerPresets.standard())
    app.get('/api', (c) => c.text('error', 500))

    // 4 failures should NOT open the circuit (failureThreshold: 5)
    for (let i = 0; i < 4; i++) {
      const res = await app.request('/api')
      expect(res.status).toBe(500)
    }

    // 5th failure opens the circuit
    await app.request('/api')

    // 6th request should be blocked (circuit open)
    const res = await app.request('/api')
    expect(res.status).toBe(503)
  })
})

describe('Contract: public API preserved (D-07)', () => {
  it('circuitBreaker function is exported', () => {
    expect(typeof circuitBreaker).toBe('function')
  })

  it('circuitBreakerPresets object is exported with sensitive/standard/resilient', () => {
    expect(typeof circuitBreakerPresets).toBe('object')
    expect(typeof circuitBreakerPresets.sensitive).toBe('function')
    expect(typeof circuitBreakerPresets.standard).toBe('function')
    expect(typeof circuitBreakerPresets.resilient).toBe('function')
  })

  it('accepts CircuitBreakerConfig with all optional fields', () => {
    expect(() =>
      circuitBreaker({
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        halfOpenMaxRequests: 1,
        successThreshold: 1,
        name: 'test',
        isFailure: (res) => res.status >= 500,
        onOpen: (c, state) => {
          return c.json({ state: state.state }, 503)
        },
      })
    ).not.toThrow()
  })
})
