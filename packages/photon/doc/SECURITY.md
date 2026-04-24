# Photon Security & JWT Guide

Security is a core concern for the Gravito framework. Photon provides built-in tools for JWT (JSON Web Token) authentication.

## JWT Module

The JWT module is exported via `@gravito/photon/jwt`.

### Configuration

```typescript
import { jwt } from '@gravito/photon/jwt'

app.use('/auth/*', jwt({
  secret: 'your-super-secret-key',
  alg: 'HS256'
}))
```

### Manual Sign and Verify

Sometimes you need to manually handle tokens (e.g., during login).

```typescript
import { sign, verify } from '@gravito/photon/jwt'

// Create a token
const token = await sign({ sub: 'user_123', role: 'admin' }, 'secret')

// Verify a token
try {
  const payload = await verify(token, 'secret')
} catch (e) {
  // Invalid or expired token
}
```

### Payload Types

Photon provides strong typing for JWT payloads:

```typescript
import type { JwtPayload } from '@gravito/photon/jwt'

const payload: JwtPayload = {
  iss: 'gravito.dev',
  sub: '123',
  exp: Math.floor(Date.now() / 1000) + 3600
}
```

---

## Security Best Practices

1. **Environmental Secrets**: Never hardcode secrets. Use `process.env` or `@gravito/core` configuration.
2. **HTTPS**: Always serve Photon behind a TLS terminator or use HTTPS in production.
3. **Algorithm Choice**: Prefer `HS256` for simple shared secrets or `RS256` for public/private key pairs.

---

[← Back to README](../README.md)
