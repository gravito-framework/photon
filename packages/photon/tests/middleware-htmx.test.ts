// @ts-nocheck
import { describe, expect, it } from 'bun:test'
import { Photon } from '../src/index'
import { htmxMiddleware } from '../src/middleware/htmx'

describe('HTMX Middleware', () => {
  it('should detect HTMX request and set context variables', async () => {
    const app = new Photon()
    app.use(htmxMiddleware() as any)

    app.get('/htmx', (c) => {
      const isHtmx = c.get('htmx' as any)
      const boosted = c.get('htmx.boosted' as any)
      const target = c.get('htmx.target' as any)
      const trigger = c.get('htmx.trigger' as any)

      return c.json({ isHtmx, boosted, target, trigger })
    })

    const res1 = await app.request('/htmx')
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.isHtmx).toBe(false)

    const res2 = await app.request('/htmx', {
      headers: {
        'HX-Request': 'true',
      },
    })
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.isHtmx).toBe(true)

    const res3 = await app.request('/htmx', {
      headers: {
        'HX-Request': 'true',
        'HX-Boosted': 'true',
        'HX-Target': 'my-div',
        'HX-Trigger': 'my-button',
        'HX-Current-URL': 'http://localhost/page',
        'HX-Prompt': 'Enter something',
        'HX-Trigger-Name': 'submit',
      },
    })
    expect(res3.status).toBe(200)
    const data3 = await res3.json()
    expect(data3.isHtmx).toBe(true)
    expect(data3.boosted).toBe(true)
    expect(data3.target).toBe('my-div')
    expect(data3.trigger).toBe('my-button')
  })

  it('should handle history restore request', async () => {
    const app = new Photon()
    app.use(htmxMiddleware() as any)

    app.get('/history', (c) => {
      return c.json({
        history: c.get('htmx.historyRestoreRequest' as any),
        prompt: c.get('htmx.prompt' as any),
        triggerName: c.get('htmx.triggerName' as any),
      })
    })

    const res = await app.request('/history', {
      headers: {
        'HX-Request': 'true',
        'HX-History-Restore-Request': 'true',
        'HX-Prompt': 'test-prompt',
        'HX-Trigger-Name': 'test-name',
      },
    })
    const data = await res.json()
    expect(data.history).toBe(true)
    expect(data.prompt).toBe('test-prompt')
    expect(data.triggerName).toBe('test-name')
  })
})
