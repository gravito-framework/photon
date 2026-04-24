/**
 * @deprecated v2.0 — Hono Deno adapter (optional path)
 *
 * Removal target: v3.0
 *
 * In v3.0+, this module will be replaced with a native Gravito platform
 * adapter system. v2.0 and v2.x users can continue using this adapter.
 *
 * Use: import { ... } from '@gravito/photon/adapters/deno'
 *
 * ---
 *
 * @gravito/photon - Deno Deploy 適配器
 *
 * 提供 Photon 應用程式在 Deno Deploy 和 Deno 執行環境上的執行支援。
 * 基於 Deno 的原生 HTTP 伺服器 API。
 *
 * @example 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 *
 * const app = new Photon()
 * app.get('/', (c) => c.text('Hello from Deno Deploy!'))
 *
 * Deno.serve(app.fetch)
 * ```
 *
 * @example 靜態資源服務
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { serveStatic } from '@gravito/photon/adapter/deno'
 *
 * const app = new Photon()
 * app.use('/static/*', serveStatic({ root: './public' }))
 * ```
 *
 * @packageDocumentation
 */

// Deno adapter - re-export from hono/deno
export { getConnInfo, serveStatic, toSSG, upgradeWebSocket } from 'hono/deno'
