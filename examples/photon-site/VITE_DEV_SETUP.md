# Vite 開發環境設置說明

## 錯誤說明

### 404 錯誤（舊版本）

如果您遇到以下錯誤：

```
GET http://localhost:5173/src/client/app.tsx net::ERR_ABORTED 404 (Not Found)
GET http://localhost:5173/@react-refresh net::ERR_ABORTED 404 (Not Found)
```

這表示瀏覽器直接請求 Vite 伺服器失敗（通常是 CORS 或路徑問題）。

### 503 錯誤（當前版本）

如果您遇到以下錯誤：

```
GET http://localhost:3333/@vite/client net::ERR_ABORTED 503 (Service Unavailable)
GET http://localhost:3333/src/client/app.tsx net::ERR_ABORTED 503 (Service Unavailable)
GET http://localhost:3333/@react-refresh net::ERR_ABORTED 503 (Service Unavailable)
```

這表示：

1. **代理中間件正在工作**（請求到達了後端）
2. **但無法連接到 Vite 開發伺服器**（最常見原因）
3. **Vite 開發伺服器未運行**：確保 `bun run dev:vite` 正在運行
4. **Vite 伺服器啟動中**：可能需要等待幾秒鐘讓 Vite 完全啟動

## 解決方案

### 1. 確保 Vite 開發伺服器正在運行

```bash
# 在一個終端運行 Vite
bun run dev:vite

# 在另一個終端運行後端伺服器
bun run dev:server

# 或者同時運行（推薦）
bun run dev
```

### 2. 檢查 Vite 配置

確保 `vite.config.ts` 配置正確：

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    origin: 'http://localhost:5173',
  },
})
```

### 3. 檢查 HTML 模板

`src/views/app.html` 應該使用相對路徑（通過後端代理）：

```html
{{#if isDev}}
<!-- Development mode: Load from Vite dev server (proxied through backend) -->
<script type="module">
    import RefreshRuntime from '/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => { }
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
</script>
<script type="module" src="/@vite/client"></script>
<script type="module" src="/src/client/app.tsx"></script>
{{else}}
<!-- Production mode: Load from built assets -->
<script type="module" src="/static/build/assets/app.js"></script>
<link rel="stylesheet" href="/static/build/assets/app.css">
{{/if}}
```

### 4. 確保後端有 Vite 代理

後端伺服器（`src/server/index.ts`）應該包含 Vite 代理中間件，將以下路徑的請求代理到 Vite 開發伺服器：

- `/@*` - Vite 特殊路徑（`/@vite/client`, `/@react-refresh` 等）
- `/src/client/*` - 客戶端源文件
- `/node_modules/*` - 依賴模組

## 工作原理

1. **開發模式**：
   - 瀏覽器請求 `/@vite/client` 或 `/src/client/app.tsx`
   - 後端代理中間件攔截這些請求
   - 代理將請求轉發到 `http://127.0.0.1:5173`
   - Vite 開發伺服器處理請求並返回響應

2. **生產模式**：
   - 使用構建後的靜態文件
   - 從 `/static/build/assets/` 載入

## 故障排除

### 503 錯誤：Vite 伺服器未啟動（最常見）

**症狀**：所有 Vite 相關請求返回 503

**解決步驟**：

1. **檢查 Vite 是否在運行**：
   ```bash
   # 在終端中檢查端口 5173 是否被佔用
   lsof -i :5173
   
   # 或直接測試 Vite 伺服器
   curl http://localhost:5173/@vite/client
   ```

2. **啟動 Vite 開發伺服器**：
   ```bash
   # 在一個終端中運行
   bun run dev:vite
   
   # 應該看到類似輸出：
   # VITE v6.x.x  ready in xxx ms
   # ➜  Local:   http://localhost:5173/
   ```

3. **確保兩個服務都在運行**：
   ```bash
   # 終端 1：Vite 開發伺服器
   bun run dev:vite
   
   # 終端 2：後端伺服器
   bun run dev:server
   
   # 或使用單一命令（推薦）
   bun run dev
   ```

4. **檢查後端日誌**：
   如果 Vite 未運行，後端會顯示：
   ```
   [Vite Proxy] Failed to connect to Vite dev server after 3 retries
   [Vite Proxy] Make sure 'bun run dev:vite' is running on port 5173
   ```

### 端口衝突

如果端口 5173 已被佔用：

```bash
# 查找佔用端口的進程
lsof -i :5173

# 終止進程（替換 PID）
kill -9 <PID>

# 或修改 vite.config.ts 使用其他端口
```

### 代理未工作

檢查 `src/server/index.ts` 中是否有 Vite 代理中間件。如果沒有，請添加：

```typescript
if (isDev) {
  app.use('*', async (c, next) => {
    const url = new URL(c.req.url)
    const p = url.pathname

    if (
      p.startsWith('/@') ||
      p.startsWith('/src/client') ||
      p.startsWith('/node_modules')
    ) {
      // Proxy to Vite
      const viteUrl = `http://127.0.0.1:5173${p}${url.search}`
      const response = await fetch(viteUrl, {
        headers: c.req.header(),
        method: c.req.method,
      })
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      })
    }

    await next()
  })
}
```

### CORS 錯誤

如果遇到 CORS 錯誤，確保代理設置了正確的 CORS 標頭：

```typescript
responseHeaders.set('Access-Control-Allow-Origin', '*')
```

## 快速診斷

### 方法 1：健康檢查端點（推薦）

在瀏覽器中打開或使用 curl：

```bash
curl http://localhost:3333/__vite_health
```

這會返回 JSON 格式的診斷信息，包括：
- Vite 伺服器是否可用
- 連接狀態
- 錯誤訊息（如果有）

### 方法 2：診斷腳本

運行診斷腳本：

```bash
./check-vite.sh
```

### 方法 3：手動檢查

```bash
# 1. 檢查 Vite 是否在運行
lsof -i :5173

# 2. 測試 Vite 連接
curl http://127.0.0.1:5173/@vite/client

# 3. 如果無法連接，重啟 Vite
pkill -f vite
bun run dev:vite
```

### 方法 4：查看瀏覽器錯誤頁面

當遇到 503 錯誤時，後端會返回一個詳細的 HTML 錯誤頁面，包含：
- 錯誤原因
- 解決步驟
- 快速修復命令
- 診斷連結

## 常見問題

### Vite 伺服器啟動但無法連接

**症狀**：`lsof` 顯示端口被佔用，但 `curl` 無法連接

**可能原因**：
- Vite 進程卡住或崩潰
- 網絡配置問題
- 防火牆阻擋

**解決方案**：
```bash
# 強制終止所有 Vite 相關進程
pkill -f vite
pkill -f 'node.*5173'

# 等待幾秒
sleep 2

# 重新啟動
bun run dev:vite
```

### 代理返回 503 但 Vite 正常運行

**症狀**：直接訪問 `http://localhost:5173` 正常，但通過代理返回 503

**可能原因**：
- 代理代碼錯誤
- 後端伺服器未重啟（使用了舊代碼）

**解決方案**：
```bash
# 重啟後端伺服器
pkill -f 'bun.*server'
bun run dev:server
```

## 參考

- [Vite 官方文檔](https://vitejs.dev/)
- [Vite React 插件](https://github.com/vitejs/vite-plugin-react)
