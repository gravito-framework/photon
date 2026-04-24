import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/photon'

describe('Photon Middleware Opt-out', () => {
  it('should skip global middleware when opted out', async () => {
    const app = new Photon()
    let middlewareCalled = false

    const myMiddleware = Object.assign(
      async (_c: any, next: any) => {
        middlewareCalled = true
        return next()
      },
      { middlewareName: 'my-mw' }
    )

    app.use(myMiddleware)

    app.get('/protected', (c: any) => c.text('protected'))
    app.get('/opt-out', (c: any) => c.text('opt-out'), { excludeMiddleware: ['my-mw'] })

    // Test protected route
    const res1 = await app.request('/protected')
    expect(await res1.text()).toBe('protected')
    expect(middlewareCalled).toBe(true)

    // Reset flag
    middlewareCalled = false

    // Test opt-out route
    const res2 = await app.request('/opt-out')
    expect(await res2.text()).toBe('opt-out')
    expect(middlewareCalled).toBe(false)
  })

  it('should work with multiple middlewares and partial opt-out', async () => {
    const app = new Photon()
    let mw1Called = false
    let mw2Called = false

    const mw1 = Object.assign(
      async (_c: any, next: any) => {
        mw1Called = true
        return next()
      },
      { middlewareName: 'mw1' }
    )

    const mw2 = Object.assign(
      async (_c: any, next: any) => {
        mw2Called = true
        return next()
      },
      { middlewareName: 'mw2' }
    )

    app.use(mw1)
    app.use(mw2)

    app.get('/skip-mw1', (c: any) => c.text('skip-mw1'), { excludeMiddleware: ['mw1'] })

    const res = await app.request('/skip-mw1')
    expect(await res.text()).toBe('skip-mw1')
    expect(mw1Called).toBe(false)
    expect(mw2Called).toBe(true)
  })
})
