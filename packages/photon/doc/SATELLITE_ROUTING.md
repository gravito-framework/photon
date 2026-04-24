# Satellite Routing Guide

In the **Gravito Galaxy Architecture**, Photon serves as the central hub where multiple independent **Satellites** (domain plugins) mount their routing logic. This guide defines the standards and best practices for satellite-based routing.

## 🌌 The Sensing Layer Concept

A Satellite shouldn't "own" the entire web server. Instead, it should provide a **Router Bundle** that the main Photon application can consume.

## 1. Defining a Satellite Router

Each satellite should expose its routes via a dedicated `router` file. Use Photon's standard routing API but keep it scoped.

```typescript
// satellites/catalog/src/router.ts
import { Photon } from '@gravito/photon'

export const catalogRouter = new Photon()

catalogRouter.get('/products', async (c) => {
  const service = c.get('container').resolve('CatalogService')
  const products = await service.list()
  return c.json(products)
})

catalogRouter.get('/products/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'Sample Product' })
})
```

## 2. Mounting the Satellite

In your main entry point (usually the **PlanetCore** bootstrapper or a host application), mount the satellite router under a specific namespace.

```typescript
// src/index.ts
import { Photon } from '@gravito/photon'
import { catalogRouter } from '@satellites/catalog'
import { membershipRouter } from '@satellites/membership'

const app = new Photon()

// Standard namespacing practice
app.route('/api/v1/catalog', catalogRouter)
app.route('/api/v1/auth', membershipRouter)

export default app
```

## 3. Best Practices

### ✅ Do's
- **Use Namespacing**: Always mount satellites under a clear prefix (e.g., `/api/v1/domain`).
- **Leverage IoC**: Use `c.get('container')` to access services instead of importing them directly into handlers.
- **Export the Type**: Export the router type for `@gravito/beam` (RPC) support.

### ❌ Don'ts
- **Global Middleware in Satellites**: Avoid `app.use('*', ...)` inside a satellite router unless it's strictly scoped to that satellite's path.
- **Hardcoded Configs**: Use the `core.config` service injected via IoC for any environment-specific values.

## 4. Automatic Route Scanning (Advanced)

If using the `@gravito/xenon` satellite host, routes can be automatically discovered if defined in the `manifest.json`:

```json
{
  "name": "@satellites/catalog",
  "routing": {
    "prefix": "/catalog",
    "entry": "./dist/router.js"
  }
}
```

The framework will then call `app.route(prefix, satelliteRouter)` during the `BOOT` phase automatically.
