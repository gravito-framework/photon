# @gravito/photon

## 1.1.0 (2026-02-25)

### Minor Changes

- **feat: Add middleware/security module with 6 HTTP middleware**
  - Migrate CORS, CSRF, Security Headers, Body Size Limit, Header Token Gate, Throttle Requests from `@gravito/core`
  - All middleware use native Hono types (`Context`, `MiddlewareHandler`) for independence from `@gravito/core`
  - CSRF protection now uses built-in `parseCookies()` (removes CookieJar dependency)
  - Throttle Requests API refactored: class-based (`new ThrottleRequests(core).handle()`) to function-based (`throttleRequests(options)`)
  - New barrel export: `@gravito/photon/middleware/security`
  - 65 new tests added for security middleware (all passing)

### Migration Guide

Replace `@gravito/core` middleware imports with `@gravito/photon`:

```typescript
// Before (deprecated)
import { cors, csrfProtection, securityHeaders } from '@gravito/core'

// After
import { cors, csrfProtection, securityHeaders } from '@gravito/photon/middleware/security'
```

For `ThrottleRequests`, update the API:

```typescript
// Before (deprecated)
const mw = new ThrottleRequests(core).handle(100, 60)

// After
const mw = throttleRequests({ maxAttempts: 100, decaySeconds: 60 })
```

## 1.0.1

### Patch Changes

- Convert all workspace:\* dependencies to version numbers for npm publishing

  - Fixed 144 workspace:\* dependencies across 58 packages
  - Ensures all packages work properly when installed from npm
  - Resolves issues with bunx and npm installation of CLI tools
  - All internal dependencies now use explicit version constraints
