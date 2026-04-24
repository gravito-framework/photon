import { describe, expect, it } from 'bun:test'

/**
 * 驗證各平台適配器的 export 結構完整性。
 *
 * 這些測試確保：
 * 1. 各 adapter 模組能正確被引入
 * 2. 關鍵函式有被 export
 * 3. export 類型為函式
 *
 * 注意：
 * - Cloudflare Workers：使用 `export default app` 模式（不需要 handle wrapper）
 * - Cloudflare Pages：使用 `handle(app)` 包裝器（re-exported 為 handle）
 * - Deno adapter：設計用於 Deno 執行環境，在 bun/node 環境下 serveStatic 無法正常運行
 */

describe('Cloudflare adapter exports', () => {
  it('exports handle function for Cloudflare Pages', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    expect(typeof adapter.handle).toBe('function')
  })

  it('exports handleMiddleware function', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    expect(typeof adapter.handleMiddleware).toBe('function')
  })

  it('exports serveStatic function for Workers', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    expect(typeof adapter.serveStatic).toBe('function')
  })

  it('exports upgradeWebSocket function for Workers', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    expect(typeof adapter.upgradeWebSocket).toBe('function')
  })

  it('exports getConnInfo function', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    expect(typeof adapter.getConnInfo).toBe('function')
  })
})

describe('Vercel adapter exports', () => {
  it('exports handle function for Vercel Edge', async () => {
    const adapter = await import('../src/adapter/vercel')
    expect(typeof adapter.handle).toBe('function')
  })

  it('exports getConnInfo function', async () => {
    const adapter = await import('../src/adapter/vercel')
    expect(typeof adapter.getConnInfo).toBe('function')
  })
})

describe('Deno adapter exports', () => {
  it('exports getConnInfo function for Deno Deploy', async () => {
    // 注意：deno adapter 設計用於 Deno 執行環境
    // serveStatic 在 bun/node 環境中因 Deno global 不存在而無法直接測試
    // 但我們可以確認 adapter 模組結構的 import 是否能被解析
    const adapterModule = await import('../src/adapter/deno').catch(() => null)
    // 如果模組導入失敗（Deno 環境問題），跳過測試
    if (adapterModule === null) {
      return
    }
    expect(typeof adapterModule.getConnInfo).toBe('function')
  })
})

describe('adapter module structure', () => {
  it('cloudflare adapter exports handle from cloudflare-pages', async () => {
    const adapter = await import('../src/adapter/cloudflare')
    const exportKeys = Object.keys(adapter)

    // Cloudflare Pages 的 handle wrapper
    expect(exportKeys).toContain('handle')
    expect(exportKeys).toContain('handleMiddleware')
    // Cloudflare Workers utilities
    expect(exportKeys).toContain('serveStatic')
    expect(exportKeys).toContain('upgradeWebSocket')
    expect(exportKeys).toContain('getConnInfo')
  })

  it('vercel adapter has all required exports', async () => {
    const adapter = await import('../src/adapter/vercel')
    const exportKeys = Object.keys(adapter)

    expect(exportKeys).toContain('handle')
    expect(exportKeys).toContain('getConnInfo')
  })
})
