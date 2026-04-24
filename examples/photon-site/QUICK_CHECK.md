# 快速檢查指南

## 🚀 快速檢查命令

### 1. 配置驗證
```bash
bun run check:config
```
檢查所有配置檔案是否正確設定。

### 2. 類型檢查
```bash
bun run typecheck
```
檢查 TypeScript 類型錯誤。

### 3. 完整檢查（配置 + 類型）
```bash
bun run check:all
```
執行配置驗證和類型檢查。

### 4. 建置並檢查連結
```bash
BASE_URL=https://photon-site.pages.dev bun run build:check
```
建置靜態網站並檢查所有連結。

## 📋 檢查步驟

### 步驟 1: 配置檢查
```bash
bun run check:config
```
應該看到：
```
✅ 所有配置驗證通過！
```

### 步驟 2: 建置測試
```bash
BASE_URL=https://photon-site.pages.dev bun run build
```
檢查建置是否成功，確認 `dist/static/` 目錄已生成。

### 步驟 3: 連結檢查（建置後）
```bash
bun run check:links
```
檢查生成的 HTML 文件中的連結是否正確。

### 步驟 4: 驗證建置輸出（新增）
```bash
bun run verify:build
```
檢查建置輸出是否完整且正確。

### 步驟 5: 本地預覽
```bash
# 方法 1: 使用預覽腳本（推薦）
bun run preview

# 方法 2: 使用 Python（如果預覽腳本不可用）
cd dist/static
python3 -m http.server 8000
```
訪問 http://localhost:8000 測試所有連結。

### 一鍵建置並預覽
```bash
bun run preview:build
```
這會自動建置並啟動預覽伺服器。

## 🔍 手動檢查項目

### 1. 檢查生成的檔案
```bash
ls -la dist/static/
```
確認以下檔案/目錄存在：
- `index.html`
- `docs/` 目錄
- `_redirects` 文件
- `sitemap.xml`
- `robots.txt`

### 2. 檢查 HTML 內容
```bash
grep -r "photon.gravito.dev" dist/static/ --include="*.html" | head -5
```
應該沒有結果（或只有外部連結）。

### 3. 檢查連結格式
```bash
grep -r 'href="/docs/' dist/static/ --include="*.html" | head -5
```
確認連結使用相對路徑。

## 🐛 常見問題

### 問題：配置驗證失敗
**解決方案：**
1. 檢查 `src/client/app.tsx` 是否包含 `photon-site.pages.dev`
2. 檢查 `build-static.ts` 是否使用 `BASE_URL` 環境變數
3. 確認 `public/_redirects` 文件存在

### 問題：連結檢查失敗
**解決方案：**
1. 確認已執行建置：`bun run build`
2. 檢查 `dist/static/` 目錄是否存在
3. 查看錯誤訊息，修復對應的連結問題

### 問題：本地預覽無法訪問
**解決方案：**
1. 確認建置成功
2. 確認在 `dist/static/` 目錄執行預覽伺服器
3. 檢查防火牆設定

## 📝 部署前檢查清單

- [ ] 執行 `bun run check:config` 通過
- [ ] 執行 `bun run typecheck` 通過
- [ ] 執行 `bun run build` 成功
- [ ] 執行 `bun run check:links` 通過
- [ ] 本地預覽測試所有連結正常
- [ ] 檢查瀏覽器 Console 無錯誤
- [ ] 確認 `_redirects` 文件已複製到 `dist/static/`

## 🔗 相關文檔

- [本地預覽指南](./LOCAL_PREVIEW.md) - 詳細的本地預覽方法
- [完整檢查清單](./CHECKLIST.md) - 詳細的檢查項目
- [故障排除指南](./TROUBLESHOOTING.md) - 常見問題解決方案
