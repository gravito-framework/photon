# Photon API Guide

This guide provides a detailed reference for building applications with the @gravito/photon HTTP engine.

## Table of Contents
- [The Photon Instance](#the-photon-instance)
- [Routing](#routing)
- [Context (c)](#context-c)
- [Request Handling](#request-handling)
- [Response Handling](#response-handling)

---

## The Photon Instance

Photon provides two engine modes:

1.  **Standard Mode (`Photon`)**: Fully compatible with the Hono ecosystem.
2.  **Native Mode (`NativePhoton`)**: High-performance engine optimized for Bun 1.39+.

### Standard Mode
```typescript
import { Photon } from '@gravito/photon'
const app = new Photon()
```

### Native Mode (High Performance)
Use `NativePhoton` to leverage SIMD-accelerated routing and zero-allocation context pooling.

```typescript
import { NativePhoton } from '@gravito/photon/native'
const app = new NativePhoton()

// Launch with optimized native configuration
export default app.serveConfig({
  port: 3000
})
```

### Methods
- `app.get | post | put | delete | patch | options(path, ...handlers)`: Register routes for specific HTTP methods.
- `app.all(path, ...handlers)`: Match all HTTP methods.
- `app.use([path], ...middleware)`: Register global or path-prefixed middleware.
- `app.route(prefix, otherApp)`: Compose and nest Photon instances.

---

## Routing

Photon supports standard and advanced routing patterns.

### Static Routes
```typescript
app.get('/hello', (c) => c.text('Hello!'))
```

### Dynamic Parameters
```typescript
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.text(`User ID: ${id}`)
})
```

### Multiple Parameters
```typescript
app.get('/posts/:year/:month', (c) => {
  const { year, month } = c.req.param()
  // ...
})
```

---

## Context (c)

The `Context` object is the heart of every handler. It contains the request, response, and environment information.

### Request (`c.req`)
- `c.req.param(name)`: Get path parameters.
- `c.req.query(name)`: Get query string parameters.
- `c.req.header(name)`: Get HTTP headers.
- `c.req.json()`: Parse JSON body.
- `c.req.formData()`: Parse form data.
- `c.req.valid(type)`: Access validated data (when using validation middleware).

### Response
- `c.json(data, status?)`: Send a JSON response (optimized with native `Response.json()`).
- `c.binary(data, status?)`: **NEW**: Send binary data (CBOR/Protobuf) with optimized buffer management.
- `c.text(text, status?)`: Send a plain text response.
- `c.html(html, status?)`: Send an HTML response (SIMD-accelerated escaping available via `c.escape()`).
- `c.stream(stream, status?)`: **NEW**: Stream data directly to the socket with kernel-level zero-copy.
- `c.redirect(url, status?)`: Perform a redirect.
- `c.notFound()`: Send a 404 response.

### Variables
You can share data between middleware and handlers using `c.set` and `c.get`.

```typescript
app.use(async (c, next) => {
  c.set('startTime', Date.now())
  await next()
})

app.get('/', (c) => {
  const start = c.get('startTime')
  return c.text(`Started at ${start}`)
})
```

---

[← Back to README](../README.md)
