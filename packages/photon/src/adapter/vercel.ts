/**
 * @deprecated v2.0 — Hono Vercel adapter (optional path)
 *
 * Removal target: v3.0
 *
 * In v3.0+, this module will be replaced with a native Gravito platform
 * adapter system. v2.0 and v2.x users can continue using this adapter.
 *
 * Use: import { ... } from '@gravito/photon/adapters/vercel'
 *
 * ---
 *
 * @gravito/photon - Vercel Edge Functions 適配器
 *
 * 提供 Photon 應用程式在 Vercel Edge Runtime 上的執行支援。
 * 兼容 Vercel Edge Functions 和 Vercel Serverless Functions。
 *
 * @example 用法
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { handle } from '@gravito/photon/adapter/vercel'
 *
 * const app = new Photon()
 * app.get('/api/hello',
 *   (c) => c.json({ message: 'Hello from Vercel Edge!' })
 * )
 *
 * export default handle(app)
 * ```
 *
 * @packageDocumentation
 */

// Vercel Edge Functions adapter
export { getConnInfo, handle } from 'hono/vercel'
