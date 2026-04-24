# Real-time Communication Guide

Photon isn't just for JSON! It provides first-class support for **Server-Sent Events (SSE)**, **WebSockets**, and **Streaming** responses, optimized for the Bun runtime.

## 1. Server-Sent Events (SSE)

Use SSE for real-time one-way updates (e.g., dashboards, logs, stock prices).

```typescript
import { sse } from '@gravito/photon/middleware/sse'

app.get('/api/events', sse(), (c) => {
  const stream = c.get('sse')
  
  // Send an event every 5 seconds
  const interval = setInterval(() => {
    stream.send({ event: 'ping', data: Date.now() })
  }, 5000)
  
  // Clean up on disconnect
  c.req.raw.signal.addEventListener('abort', () => {
    clearInterval(interval)
  })
})
```

## 2. WebSockets (Bun Optimized)

In a **Bun** environment, Photon leverages native WebSocket support for maximum performance.

```typescript
import { createBunWebSocket } from '@gravito/photon/middleware/websocket'

const { upgradeWebSocket, websocket } = createBunWebSocket()

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen: (ws) => {
      console.log('Client connected!')
      ws.send('Welcome to the Galaxy!')
    },
    onMessage: (ws, message) => {
      ws.send(`Echo: ${message}`)
    },
    onClose: () => {
      console.log('Client disconnected.')
    }
  }
}))

// Use Bun.serve with the websocket handler
export default {
  fetch: app.fetch,
  websocket
}
```

## 3. Streaming Responses

For processing large data or handling AI responses (like LLM stream), use the `streaming` middleware.

```typescript
import { stream } from '@gravito/photon/middleware/streaming'

app.get('/api/ai/chat', stream((c) => {
  const s = c.get('stream')
  
  // Manually stream data
  await s.write('Hello ')
  await s.sleep(500)
  await s.write('from ')
  await s.sleep(500)
  await s.write('Gravito!')
  
  // Close the stream
  await s.close()
}))
```

## 4. Streaming Lifecycle (Native Engine)

When using **Native Mode (`NativePhoton`)**, the engine implements a **Deferred Release** mechanism to ensure memory safety and resource integrity:

- **Resource Cleanup**: Photon guarantees that `requestScope().cleanup()` (from `@gravito/core`) is only executed **after** the stream is fully closed or the client disconnects.
- **IoC Integrity**: Scoped services (like database transactions) remain active and valid throughout the entire duration of the stream.
- **Zero-Copy**: The engine uses Bun's `direct` stream type to bypass internal queuing, piping data directly from your generator/handler to the network socket.

## 5. Key Performance Differences

| Protocol | Strategy | Runtime Path | Best For |
|----------|----------|--------------|----------|
| **SSE** | HTTP One-way | Native Stream | Dashboards, Notifications |
| **WS** | Full-duplex | Bun Upgrade | Chat, Gaming, Real-time Collab |
| **Stream** | Progressive | Direct Socket | AI Responses, Large Logs |

## 6. Middleware & Security

- **Rate Limiting**: Can be applied to SSE/WS upgrade routes.
- **Authentication**: Always use `@gravito/photon/middleware/security/header-token-gate` for secure streaming endpoints.
- **Native Offloading**: Streaming routes are fully compatible with `serveConfig()` and benefit from SIMD routing.
