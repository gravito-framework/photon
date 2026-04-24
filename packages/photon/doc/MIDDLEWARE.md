# Photon Middleware Guide

Middleware are functions that run before or after your route handlers. They are used for authentication, logging, header manipulation, and more.

## Table of Contents
- [Using Middleware](#using-middleware)
- [Built-in Middleware](#built-in-middleware)
  - [HTMX Middleware](#htmx-middleware)
  - [Binary Middleware (CBOR)](#binary-middleware-cbor)
  - [Logger](#logger)
- [Writing Custom Middleware](#writing-custom-middleware)

---

## Using Middleware

```typescript
// Global middleware
app.use('*', logger())

// Path-specific middleware
app.use('/api/*', auth())

// Route-specific middleware
app.get('/profile', auth(), (c) => c.json(c.get('user')))
```

---

## Built-in Middleware

### HTMX Middleware
Extends the context with HTMX-specific helpers. It detects if a request was made via HTMX and extracts relevant headers.

```typescript
import { htmxMiddleware } from '@gravito/photon'
app.use(htmxMiddleware())

app.get('/data', (c) => {
  const isHtmx = c.get('htmx')
  const target = c.get('htmx.target')
  return isHtmx ? c.html('<div>Fragment</div>') : c.html('<html>Page</html>')
})
```

### Binary Middleware (CBOR)
The Binary middleware automatically encodes JSON responses as [CBOR](https://cbor.io/) when the client sends an `Accept: application/cbor` header.

#### Performance
- **Speed**: Up to 3x faster than JSON serialization for large datasets.
- **Payload**: Reduces data size by 20-40% via binary encoding.

```typescript
import { binaryMiddleware } from '@gravito/photon'
app.use(binaryMiddleware())
```

### Logger
Standard request/response logging.

```typescript
import { logger } from '@gravito/photon/logger'
app.use(logger())
```

---

## AOT Middleware Injection (Native Mode)

When running in **Native Mode (`NativePhoton`)**, middleware is handled via **Ahead-of-Time (AOT) Injection**.

### How it Works
Traditional frameworks traverse a middleware tree for **every single request**. In Native Mode:
1.  **Flattening**: During server startup (`serveConfig`), Photon collects all applicable middleware for every static route.
2.  **Compilation**: It pre-compiles these chains into a single optimized function.
3.  **Kernel Injection**: This function is injected directly into Bun's native router.

### Benefits
-   **Zero Routing Overhead**: Static routes with middleware execute at the same speed as pure `Bun.serve` handlers.
-   **Microtask Elimination**: Synchronous middleware chains run as a single call stack, bypassing the event loop queue.
-   **Predictable Performance**: Execution time is constant, regardless of routing complexity.

---

## Writing Custom Middleware
...
```typescript
app.use(async (c, next) => {
  const start = performance.now()
  await next()
  const end = performance.now()
  console.log(`${c.req.method} ${c.req.path} - ${end - start}ms`)
})
```

### Pro-Tip: Native Sync Middleware
For maximum performance in Native Mode, avoid `async/await` if your middleware is purely synchronous. NativePhoton will detect this and eliminate microtask overhead.

```typescript
app.use((c, next) => {
  c.set('isAuthorized', true)
  return next() // No 'await' needed for sync logic
})
```
...

[← Back to README](../README.md)
