// @ts-nocheck
/**
 * @gravito/photon - Circuit Breaker Middleware Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { Photon } from '../src/index'
import { circuitBreaker, circuitBreakerPresets } from '../src/middleware/circuit-breaker'

describe('Circuit Breaker Middleware', () => {
  let app: Photon

  beforeEach(() => {
    app = new Photon()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should allow requests when CLOSED', async () => {
    app.use(
      '/test',
      circuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
      })
    )
    app.get('/test', (c) => c.text('ok'))

    const res = await app.request('/test')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('should transition to OPEN after failures', async () => {
    app.use(
      '/test',
      circuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
      })
    )
    app.get('/test', (c) => {
      return c.text('error', 500)
    })

    // 1st failure
    await app.request('/test')
    // 2nd failure -> should open
    await app.request('/test')

    // 3rd request -> should be blocked by circuit breaker
    const res = await app.request('/test')
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('Service Unavailable')
    expect(body.circuitBreaker.state).toBe('OPEN')
  })

  it('should transition to HALF_OPEN after timeout', async () => {
    app.use(
      '/half-open',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      })
    )

    let responseText = 'error'
    let status = 500
    app.get('/half-open', (c) => c.text(responseText, status as any))

    // 1st failure -> open
    await app.request('/half-open')

    // Fast forward time
    vi.advanceTimersByTime(1001)

    // Request should be allowed (HALF_OPEN)
    responseText = 'recovered'
    status = 200
    const res = await app.request('/half-open')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('recovered')
  })

  it('should transition back to CLOSED after success in HALF_OPEN', async () => {
    app.use(
      '/test',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
        successThreshold: 1,
      })
    )

    let shouldFail = true
    app.get('/test', (c) => {
      if (shouldFail) {
        return c.text('error', 500)
      }
      return c.text('ok')
    })

    // Open the circuit
    await app.request('/test')

    // Half-open
    vi.advanceTimersByTime(1001)
    shouldFail = false

    // Success in half-open -> transition to closed
    await app.request('/test')

    // Should be closed now
    const res = await app.request('/test')
    expect(res.status).toBe(200)
  })

  it('should transition back to OPEN if failure in HALF_OPEN', async () => {
    app.use(
      '/test',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      })
    )

    app.get('/test', (c) => c.text('error', 500))

    // Open
    await app.request('/test')

    // Half-open
    vi.advanceTimersByTime(1001)

    // Failure in half-open -> back to open immediately
    await app.request('/test')

    const res = await app.request('/test')
    expect(res.status).toBe(503)
  })

  it('should support presets', async () => {
    app.use('/sensitive', circuitBreakerPresets.sensitive())
    app.get('/sensitive', (c) => c.text('ok'))

    const res = await app.request('/sensitive')
    expect(res.status).toBe(200)
  })

  it('should handle exceptions as failures', async () => {
    app.use(
      '/error',
      circuitBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 1000,
      })
    )
    app.get('/error', () => {
      throw new Error('Boom')
    })

    try {
      await app.request('/error')
    } catch (_e) {
      // ignore
    }

    const res = await app.request('/error')
    expect(res.status).toBe(503)
  })
})
