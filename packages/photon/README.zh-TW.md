# @gravito/photon

獨立的 Bun HTTP 路由、middleware 與型別化請求 Context。
目前為尚未發布的 major 遷移版本；套件版本號仍沿用歷史版本，不能用 registry
版本替代此開發快照。Gravito 整合 A7 尚未完成，尚無已驗證的 core 配對版本。

## 從零啟動

使用 Bun **1.4.4**。在本套件執行 `bun install --ignore-scripts`、`bun run build`、
`bun pm pack --destination /tmp`。到 repo 外新目錄執行 `bun init -y`，再以
`bun add /tmp/gravito-photon-2.0.1.tgz` 安裝剛產生的檔案（檔名以 pack 輸出為準）。
執行 `bun add -d typescript@5.9.3 bun-types@1.3.10`，將以下存為 `app.ts`：

```ts
import { Photon } from '@gravito/photon'
import { cors } from '@gravito/photon/middleware/cors'
import { HttpException } from '@gravito/photon/http-exception'

export const app = new Photon<{ user: string }>()
app.use(cors())
app.use(async (c, next) => {
  c.set('user', 'Ada')
  c.header('x-photon', 'yes')
  await next()
})
app.get('/hello', c => c.json({ message: 'Hello', user: c.get('user') }))
app.post('/echo', async c => c.json(await c.req.json()))
app.get('/error', () => { throw new HttpException(409, { message: 'Conflict' }) })
app.onError((error, c) => c.json(
  { error: error instanceof HttpException ? error.message : 'Internal error' },
  error instanceof HttpException ? error.status : 500
))

if (import.meta.main) Bun.serve(app.serveConfig({ port: 3000 }))
```

執行 `bun app.ts`，以 `curl http://localhost:3000/hello` 驗證 JSON 與
`x-photon: yes` header。`/error` 回傳 409，未知路徑回傳 404。Ctrl-C 關閉服務。
嚴格型別設定與 POST 範例見 [English README](README.md)。請先在 middleware
初始化必要變數，並在請求結束前複製背景工作所需資料。

## 選用模組與遷移

JWT、logger、CBOR、HTMX、streaming、限流與安全 middleware 使用明確子路徑。
OTel 需額外安裝 `@opentelemetry/api` 才啟用，缺省為 no-op；Redis 限流需提供相容 client。
Fast path 略過 Context、middleware（含安全 middleware）及 `onError`，錯誤回傳
不洩漏訊息的 500。Cloudflare/Deno/Vercel 入口是 Hono 相容介面，不代表原生 Photon
平台支援；尚未完成這些平台實測，Deno 入口在 Bun 的 import 會失敗。

執行 `bun run verify:release` 保存獨立 source、tarball、文件範例、exports、型別、
HTTP、publint 與打包演練證據，不會發布。參閱 [發布驗證](doc/RELEASE.md)、
[效能方法](doc/BENCHMARK.md) 及 [完整遷移表](doc/INDEPENDENCE_MIGRATION.md)。
A7 尚未通過，不能宣告整體整合完成。
