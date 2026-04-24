# Photon 架構演進與補完計畫 (Evolution Plan)

本文件基於對業界現代化 Web 框架 (如 ElysiaJS, tRPC, NestJS, Nuxt/Nitro) 的架構對標，整理出 @gravito/photon 作為 Gravito Galaxy Architecture 核心 HTTP 引擎的「六大進化維度」。

此計畫旨在為短、中、長期的框架開發提供明確的技術藍圖，將 Photon 從「高效能的底層 Router」昇華為「統帥企業級開發體驗的現代化框架核心」。

---

## 📅 演進路線圖 (Roadmap Overview)

為了有效推進，補完計畫將分為三個主要階段：

- **Phase 1: 開發體驗提升 (DX & Tooling)**
  - 自動化 API 文件生成 (OpenAPI / Swagger)
  - Type-Safe 即時通訊基礎 (WebSockets / SSE)
- **Phase 2: 企業級韌性與可觀測性 (Resilience & Observability)**
  - OpenTelemetry (OTel) 原生整合
  - 聲明式安全防護與限流 (Rate Limiting / Circuit Breaker)
- **Phase 3: 雲原生與前瞻技術 (Cloud-Native & Future Web)**
  - 邊緣運算平台適配器 (Edge / Universal Adapters)
  - 漸進式渲染與串流基礎設施 (Streaming & Suspense)

---

## 🚀 Phase 1: 開發體驗提升 (DX & Tooling)

### 1. 聲明式 OpenAPI / Swagger 自動生成
**問題描述**：目前 Photon 具備 Type-Safe 路由與驗證，但缺乏自動轉化為 OpenAPI v3 規格的能力，影響跨端/跨團隊協作。
**補完目標**：
- 引入一個以中介軟體 (Middleware) 或 Router Wrapper 形式存在的 OpenAPI 產生器。
- 深度整合現有 `c.req.valid()` 的 schema (如 TypeBox 或 Zod)，自動推導 Request/Response 模型。
- 提供內建的 Swagger UI 端點 (例如 `app.get('/docs', swaggerUI())`)。
**技術實作方向**：
參考 `@hono/zod-openapi` 的設計，擴展現有 Photon Router 介面，讓使用者在定義路由時不僅傳入 Handler，還能附加 API 描述、標籤 (Tags) 與回應 Schema。

### 2. 端到端型別安全的雙向通訊 (Type-Safe WebSockets / SSE)
**問題描述**：`@gravito/beam` 目前解決了 HTTP RPC 的型別安全，但在即時通訊 (聊天、狀態訂閱) 場景缺乏等效的方案。
**補完目標**：
- 在 Photon 核心提供對 WebSocket 的封裝升級，與 Bun 的原生 `server.upgrade` 機制無縫結合。
- 為 `@gravito/beam` 增加 `.subscription()` 或 `.ws()` 端點定義。
- Client 端產生帶型別推斷的事件發送與監聽 API。
**技術實作方向**：
建立與 tRPC 相似的 Event Stream 抽象。在握手階段 (Handshake) 進行 Token 驗證與 Schema校驗，隨後建立 Type-Safe 的 Message 通道。

---

## 🛡️ Phase 2: 企業級韌性與可觀測性 (Resilience & Observability)

### 3. OpenTelemetry (OTel) 原生整合
**問題描述**：微核心架構下，跨衛星模組 (Satellites) 的請求難以追蹤效能瓶頸。
**補完目標**：
- 開發 `@gravito/photon-otel` 核心擴充，自動化提取 Trace ID 與 Span ID。
- 自動測量 HTTP 請求耗時、DB 查詢耗時 (與 Atlas 聯動)、並將中繼資料傳送至 APM (Jaeger, Datadog)。
**技術實作方向**：
在 Photon 的全局 Middleware 注入 `tracer.startActiveSpan()`，並將 Span Context 封裝進 Photon 的 `Context (c)` 中，讓後續所有的 `core` 模組或 `Satellites` 取用。

### 4. 聲明式進階限流與熔斷策略 (Rate Limiting & Circuit Breaker)
**問題描述**：單純依靠基礎 JWT 驗證無法防禦惡意請求或突發性高流量 (Thundering Herd)。
**補完目標**：
- 實作防護擴充 (Shield Extension)，提供基於 IP、Token、或 Router 端點的速率限制。
- 支援靈活的儲存後端 (Memory, Redis/Atlas)。
**技術實作方向**：
開發標準化 Middleware 例如 `app.use('/api', rateLimiter({ max: 100, windowMs: 60000 }))`，內部邏輯結合原子計數器。並在發生異常飆升時，搭配 Circuit Breaker 快速返回 503 阻止連鎖反應崩潰。

---

## ☁️ Phase 3: 雲原生與前瞻技術 (Cloud-Native)

### 5. 邊緣運算平台適配化 (Universal Edge Adapters)
**問題描述**：過度依賴 Bun API (`Bun.serve`) 降低了部署至如 Cloudflare Workers 或 Vercel Edge 的無痛感。
**補完目標**：
- 抽象化 Adapter 介面，支援 `WinterCG` 標準 (Fetch API)。
- 建立 `@gravito/photon/adapter/cloudflare-workers` 等平台綑綁工具。
**技術實作方向**：
使用底層的 `fetch(request: Request)` 介面作為所有 Adapter 的最大公約數。使得 Photon 的 `export default app` 能夠經過簡單封裝後被任何支援 `fetch` 的平台啟動。

### 6. 漸進式串流基礎設施 (Response Streaming)
**問題描述**：面對越來越多的大型語言模型 (LLM) 回應、React Server Components 或大型 HTML 渲染，需要強大的串流支援。
**補完目標**：
- 原生支援並優化 `Transfer-Encoding: chunked` 與 `ReadableStream` 回應的 DX (Developer Experience)。
- 提供特定的 `c.stream()` 與 `c.streamText()` 輔助方法。
**技術實作方向**：
允許在非同步 Generator Function (Async Generators) 中直接使用 `yield` 返回部分渲染結果，Photon 底層自動將其封裝為相容於各平台的 `ReadableStream`，降低前端接入難度。

---

## 🎯 結語與下一步行動

這六個維度構築了 Photon 走向 2.0 的全面進化。
**建議的實務推進方式：**
1. 將 **OpenAPI 自動生成** 作為最優先任務啟動，因為這對使用者 DX 與團隊推廣有最顯著、最立竿見影的幫助。
2. 在 GitHub 建立此 Issue Epic，將各個 Phase 拆解為具體的 Milestone 進行逐步迭代。
