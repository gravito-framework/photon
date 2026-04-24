import type { serveStatic as cfServeStatic } from '@gravito/photon/adapter/cloudflare'
import type { serveStatic as denoServeStatic } from '@gravito/photon/adapter/deno'
import type { handle as vercelHandle } from '@gravito/photon/adapter/vercel'

// Type-only check - if this file compiles, the types resolve correctly
const _: typeof cfServeStatic = undefined as any
