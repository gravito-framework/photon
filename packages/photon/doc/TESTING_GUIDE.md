# Testing Guide: Web Integration

Testing is critical in the **Galaxy Architecture**. Photon provides an integrated way to test your routers, middleware, and satellite-based API without booting a real HTTP server.

## 1. Local Request Testing (Unit)

Use the `.request()` method to simulate an HTTP call directly against your Photon application. This is extremely fast and doesn't require port binding.

```typescript
// tests/api/products.test.ts
import { describe, expect, it } from 'bun:test'
import { catalogRouter } from '@satellites/catalog'

describe('Catalog API Integration', () => {
  it('should list products from CatalogSatellite', async () => {
    const res = await catalogRouter.request('/products')
    
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
```

## 2. Integration with IoC (PlanetCore Integration)

When testing a full application, ensure the IoC container is properly mocked for your handlers.

```typescript
import { PlanetCore } from '@gravito/core'
import { Photon } from '@gravito/photon'

describe('IoC Handler Integration', () => {
  it('should resolve services from the mocked container', async () => {
    // 1. Setup Mock Container
    const core = new PlanetCore()
    core.container.register('MockService', { data: 'mock-data' })
    
    const app = new Photon()
    app.use('*', (c, next) => {
      c.set('container', core.container)
      return next()
    })
    
    app.get('/test', (c) => c.json(c.get('container').resolve('MockService')))
    
    // 2. Execute Request
    const res = await app.request('/test')
    const data = await res.json()
    expect(data.data).toBe('mock-data')
  })
})
```

## 3. Middleware Snapshot Testing

If your middleware modifies headers or redirects, you can verify the raw response headers.

```typescript
it('should apply security headers correctly', async () => {
  const res = await app.request('/secure-endpoint')
  
  expect(res.headers.get('x-frame-options')).toBe('DENY')
  expect(res.headers.get('x-content-type-options')).toBe('nosniff')
})
```

## 4. Testing WebSockets

Testing WebSockets in **Bun** requires a running server. Use `Bun.serve` in your test setup and the native `WebSocket` client for verification.

```typescript
import { beforeAll, afterAll } from 'bun:test'

let server: any
beforeAll(() => {
  server = Bun.serve({ fetch: app.fetch, websocket: app.websocket, port: 3001 })
})

afterAll(() => {
  server.stop()
})

it('should connect to WebSocket and receive welcome message', (done) => {
  const ws = new WebSocket('ws://localhost:3001/ws')
  ws.onmessage = (event) => {
    expect(event.data).toBe('Welcome to the Galaxy!')
    ws.close()
    done()
  }
})
```

## 5. Mocking File Uploads (Binary/Multipart)

Use `FormData` and `Blob` to simulate file uploads in your tests.

```typescript
it('should handle multipart file uploads', async () => {
  const formData = new FormData()
  formData.append('file', new Blob(['content'], { type: 'text/plain' }), 'test.txt')
  
  const res = await app.request('/upload', {
    method: 'POST',
    body: formData
  })
  expect(res.status).toBe(201)
})
```
