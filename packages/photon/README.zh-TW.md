# @gravito/photon

> 驅動 Gravito Galaxy 架構的高效能 HTTP 引擎。

[![npm version](https://img.shields.io/npm/v/@gravito/photon.svg)](https://www.npmjs.com/package/@gravito/photon)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)

**@gravito/photon** 是 Gravito 框架的核心 HTTP 引擎。它提供了 `@gravito/core` 和所有 Orbit 模組所使用的基礎路由、中介軟體和請求/回應處理功能。

## 📊 專案現況

| 指標 | 狀態 | 測試覆蓋率 |
|--------|--------|----------|
| **核心引擎 (Core)** | ✅ 穩定 (Stable) | 99.21% |
| **JWT 模組** | ✅ 型別安全 | 92.86% |
| **二進位 (CBOR)** | ✅ 已優化 | 100% |

> 查看 [完整優化歷史紀錄](./doc/HISTORY_OPTIMIZATIONS.md)。

---

## ✨ 特色

- 🚀 **極致原生效能**：專為 Bun 1.39+ 優化的自定義引擎，具備 SIMD 加速路由與零分配 Context 池化。
- 🏎️ **原生路由卸載 (Native Offloading)**：自動將靜態路由與預編譯中介軟體鏈注入 Bun 的 C++/Zig 內核路由器。
- 🎯 **型別安全路由**：完整的 TypeScript 支援，針對參數、查詢與 Body 的智慧型別推論。
- 🔌 **中介軟體系統**：可組合的中介軟體，用於認證、驗證、安全與協議處理 (HTMX/CBOR)。
- 📡 **RPC 支援**：為 `@gravito/beam` 提供端到端型別安全的客戶端-伺服器通訊。
- 🛡️ **企業級安全**：內建 CORS、CSRF、HSTS、速率限制 (Rate Limiting) 與 Body 大小限制。

## 🚀 快速開始

### 標準模式 (Hono 相容)
```typescript
import { Photon } from '@gravito/photon'
const app = new Photon()

app.get('/', (c) => c.text('來自 Photon 的問候！'))
export default app
```

### 極限原生模式 (Bun 1.39+)
若要獲得最大吞吐量，請使用 **原生引擎**，它能完全跳過 JS 路由開銷。

```typescript
import { NativePhoton } from '@gravito/photon/native'

const app = new NativePhoton()

// 高效能靜態路由 (原生卸載)
app.get('/health', (c) => c.json({ status: 'ok' }))

// 動態路由 (AOT 優化)
app.get('/users/:id', (c) => c.json({ id: c.req.param('id') }))

// 使用原生 SIMD 路由器啟動
export default app.serveConfig({
  port: 3000
})
```

---

## 🏎️ 原生引擎優化 (Native Engine)

`@gravito/photon/native` 引擎利用最新的 Bun 1.39 特性實現了突破性的效能：

- **AOT 中介軟體注入**：將中介軟體鏈預編譯為單一函數，並直接注入 Bun 的原生路由器。
- **零微任務調度**：利用 `Bun.peek()` 消除同步處理器在事件循環中的等待開銷。
- **物件池化 (Object Pooling)**：循環利用請求 Context 物件，消除高流量下的 GC 停頓。
- **零拷貝串流**：整合 Bun 的 `direct` streams，實現內核級別的 Socket 數據傳輸。
- **二進位優先**：原生支援 `c.binary()` 並具備優化的緩衝區管理。

---

## 📚 文件指南 (Documentation)

詳細的使用說明與參考資料：

- [📖 **API 使用指南**](./doc/GUIDE.md) — 路由、Context 與應用程式 API。
- [🔌 **中介軟體 (Middleware)**](./doc/MIDDLEWARE.md) — 內建中介軟體 (HTMX, Binary, Logger) 與自定義。
- [🛡️ **安全與 JWT**](./doc/SECURITY.md) — 認證、Token 處理與安全實踐。
- [🏗️ **架構設計**](./doc/ARCHITECTURE.md) — 內部設計與實作細節。

---

## 🤝 貢獻

歡迎貢獻！請先閱讀主要的 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 📝 授權

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
