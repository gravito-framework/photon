# 故障排除指南

## 503 錯誤：Vite Dev Server Not Available

### 錯誤訊息

如果您在瀏覽器中看到：

```
GET http://localhost:3333/@vite/client net::ERR_ABORTED 503 (Service Unavailable)
GET http://localhost:3333/src/client/app.tsx net::ERR_ABORTED 503 (Service Unavailable)
GET http://localhost:3333/@react-refresh net::ERR_ABORTED 503 (Service Unavailable)
```

這表示後端代理無法連接到 Vite 開發伺服器。

### 快速診斷

1. **檢查健康狀態**：
   ```
   curl http://localhost:3333/__vite_health
   ```
   或直接在瀏覽器打開：`http://localhost:3333/__vite_health`

2. **檢查 Vite 是否運行**：
   ```bash
   lsof -i :5173
   ```

3. **測試直接連接**：
   ```bash
   curl http://127.0.0.1:5173/@vite/client
   ```

### 解決步驟

#### 步驟 1：確認環境變數

確保 `NODE_ENV=development` 已設置：

```bash
# 檢查環境變數
echo $NODE_ENV

# 如果為空，設置它
export NODE_ENV=development
```

#### 步驟 2：終止舊進程

```bash
# 終止所有 Vite 相關進程
pkill -f vite
pkill -f 'node.*5173'

# 確認端口已釋放
lsof -i :5173  # 應該沒有輸出
```

#### 步驟 3：在正確的目錄啟動 Vite

```bash
# 確保在 photon-site 目錄
cd /Users/carl/Dev/Carl/gravito-core/examples/photon-site

# 啟動 Vite
bun run dev:vite
```

您應該看到類似輸出：

```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### 步驟 4：驗證連接

在另一個終端：

```bash
# 測試 Vite 連接
curl http://127.0.0.1:5173/@vite/client

# 應該返回 JavaScript 代碼，而不是錯誤
```

#### 步驟 5：檢查後端日誌

查看後端伺服器的控制台輸出，應該看到：

```
🚀 PHOTON_ENGINE // ACTIVE_ON: http://localhost:3333
```

如果看到 `[Vite Proxy]` 錯誤訊息，請按照訊息中的建議操作。

### 一鍵修復腳本

```bash
#!/bin/bash
cd /Users/carl/Dev/Carl/gravito-core/examples/photon-site

echo "🛑 停止舊進程..."
pkill -f vite
pkill -f 'node.*5173'
sleep 2

echo "🚀 啟動 Vite..."
bun run dev:vite &
VITE_PID=$!

echo "⏳ 等待 Vite 啟動..."
sleep 3

echo "✅ 檢查 Vite 狀態..."
if curl -s http://127.0.0.1:5173/@vite/client > /dev/null; then
    echo "✅ Vite 運行正常！"
    echo "💡 現在可以在另一個終端運行: bun run dev:server"
else
    echo "❌ Vite 啟動失敗，請檢查錯誤訊息"
    kill $VITE_PID 2>/dev/null
    exit 1
fi
```

### 常見問題

#### Q: Vite 啟動但代理仍然返回 503

**A:** 檢查：
1. 後端伺服器是否已重啟（使用最新代碼）
2. `NODE_ENV` 是否設置為 `development`
3. 後端和 Vite 是否在同一台機器上運行

#### Q: 端口 5173 已被佔用

**A:** 
```bash
# 查找佔用端口的進程
lsof -i :5173

# 終止進程（替換 PID）
kill -9 <PID>

# 或修改 vite.config.ts 使用其他端口
```

#### Q: Vite 在錯誤的目錄運行

**A:** 
```bash
# 檢查當前 Vite 進程的工作目錄
ps aux | grep vite

# 終止並在正確目錄重新啟動
pkill -f vite
cd /Users/carl/Dev/Carl/gravito-core/examples/photon-site
bun run dev:vite
```

### 檢查清單

- [ ] `NODE_ENV=development` 已設置
- [ ] Vite 開發伺服器正在運行（端口 5173）
- [ ] 後端伺服器正在運行（端口 3333）
- [ ] Vite 在正確的目錄運行（`photon-site`）
- [ ] 可以直接訪問 `http://127.0.0.1:5173/@vite/client`
- [ ] 健康檢查端點返回正常：`http://localhost:3333/__vite_health`

### 獲取幫助

如果問題仍然存在：

1. 運行診斷腳本：`./check-vite.sh`
2. 檢查健康端點：`http://localhost:3333/__vite_health`
3. 查看後端控制台的 `[Vite Proxy]` 錯誤訊息
4. 檢查 Vite 控制台的錯誤訊息
