/**
 * @gravito/photon - Redis Rate Limit Store Tests
 */

import { beforeEach, describe, expect, it, vi } from 'bun:test'
import { RedisStore } from '../src/middleware/ratelimit-redis'

describe('RedisStore (Rate Limiting)', () => {
  let mockRedis: any
  let store: RedisStore

  beforeEach(() => {
    mockRedis = {
      eval: vi.fn(),
      del: vi.fn(),
      get: vi.fn(),
      pttl: vi.fn(),
    }
    store = new RedisStore(mockRedis, {
      maxRequests: 5,
      windowMs: 1000,
    })
  })

  it('should increment correctly using Lua script', async () => {
    mockRedis.eval.mockResolvedValue([1, 1000])

    const state = await store.increment('user1')

    expect(mockRedis.eval).toHaveBeenCalled()
    expect(state.count).toBe(1)
    expect(state.remaining).toBe(4)
    expect(state.resetTime).toBeGreaterThan(Date.now())
  })

  it('should reset key', async () => {
    await store.reset('user1')
    expect(mockRedis.del).toHaveBeenCalledWith('rl:user1')
  })

  it('should get state correctly', async () => {
    mockRedis.get.mockResolvedValue('2')
    mockRedis.pttl.mockResolvedValue(500)

    const state = await store.get('user1')

    expect(state).not.toBeNull()
    expect(state?.count).toBe(2)
    expect(state?.remaining).toBe(3)
    expect(state?.resetTime).toBeGreaterThan(Date.now())
  })

  it('should return null if key not found', async () => {
    mockRedis.get.mockResolvedValue(null)
    const state = await store.get('unknown')
    expect(state).toBeNull()
  })

  it('should support pipeline if available', async () => {
    const mockExec = vi.fn().mockResolvedValue([
      [null, '3'],
      [null, 800],
    ])
    const mockPipeline = {
      get: vi.fn().mockReturnThis(),
      pttl: vi.fn().mockReturnThis(),
      exec: mockExec,
    }
    mockRedis.pipeline = vi.fn().mockReturnValue(mockPipeline)

    const state = await store.get('user1')

    expect(mockRedis.pipeline).toHaveBeenCalled()
    expect(state?.count).toBe(3)
    expect(state?.remaining).toBe(2)
  })

  it('should throw if client does not support eval', () => {
    expect(() => new RedisStore({} as any, { maxRequests: 5, windowMs: 1000 })).toThrow(
      'Redis client must support eval() method'
    )
  })
})
