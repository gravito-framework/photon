import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { Photon } from '../../src/index'
import { logger } from '../../src/logger'

describe('native logger middleware', () => {
  let logOutput: string[] = []
  let originalLog: (typeof console)['log']

  beforeEach(() => {
    logOutput = []
    originalLog = console.log
    console.log = mock((message: string) => {
      logOutput.push(message)
    })
  })

  afterEach(() => {
    console.log = originalLog
    logOutput = []
  })

  it('logs request method, path, status, and duration', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/test', (ctx: GravitoContext) => {
      return ctx.text('OK')
    })

    const res = await app.request(new Request('http://localhost/test'))

    expect(res.status).toBe(200)
    expect(logOutput.length).toBeGreaterThan(0)

    const logged = logOutput[0]
    expect(logged).toContain('GET')
    expect(logged).toContain('/test')
    expect(logged).toContain('200')
    expect(logged).toMatch(/\d+ms/)
  })

  it('logs non-200 status codes correctly', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/notfound', (ctx: GravitoContext) => {
      return ctx.text('Not Found', 404)
    })

    const res = await app.request(new Request('http://localhost/notfound'))

    expect(res.status).toBe(404)
    expect(logOutput[0]).toContain('404')
  })

  it('logs duration in milliseconds', async () => {
    const app = new Photon()
    app.use(logger())

    app.get('/slow', async (ctx: GravitoContext) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return ctx.text('OK')
    })

    const res = await app.request(new Request('http://localhost/slow'))

    expect(res.status).toBe(200)
    const logged = logOutput[0]
    expect(logged).toMatch(/\d+ms/)
  })
})
