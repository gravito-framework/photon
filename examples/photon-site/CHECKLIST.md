# Photon Site 部署檢查清單

## ✅ 配置檢查

### 1. 環境變數配置
- [x] `app.tsx` 使用 `VITE_BASE_URL` 環境變數（預設：`https://photon-site.pages.dev`）
- [x] `build-static.ts` 使用 `BASE_URL` 環境變數（預設：`https://photon-site.pages.dev`）
- [ ] 在 Cloudflare Pages 設定環境變數（如需要）

### 2. 靜態網站域名配置
- [x] `app.tsx` 的 `staticDomains` 包含 `photon-site.pages.dev`
- [x] `app.tsx` 的 `staticDomains` 包含 `photon.gravito.dev`（備用域名）

### 3. 路由配置
- [x] `_redirects` 文件已建立於 `public/` 目錄
- [x] 路由支援查詢參數 `?lang=en` 和 `?lang=zh-TW`
- [x] 路由支援路徑格式 `/docs/:lang/:page`

## 🔍 連結生成檢查

### 1. 連結格式一致性
檢查所有連結生成位置：
- [x] `DocsLayout.tsx` - 側邊欄導航連結
- [x] `Home.tsx` - 首頁快速連結
- [x] `Footer.tsx` - 頁尾連結
- [x] `Docs.tsx` - 文檔頁面連結
- [x] `Patterns.tsx` - 模式頁面連結

### 2. 查詢參數處理
- [x] 所有內部連結都包含 `?lang=${currentLang}` 參數
- [x] 伺服器路由正確處理 `?lang=` 查詢參數
- [x] `StaticLink` 組件在靜態模式下使用原生 `<a>` 標籤

## 🏗️ 建置流程檢查

### 1. 建置命令
```bash
# 開發環境
bun run dev

# 建置靜態網站
BASE_URL=https://photon-site.pages.dev bun run build

# 預覽建置結果
bun run preview
```

### 2. 建置輸出檢查
建置完成後檢查 `dist/static/` 目錄：
- [ ] `index.html` 存在
- [ ] `docs/` 目錄包含所有文檔頁面
- [ ] `_redirects` 文件已複製到輸出目錄
- [ ] `sitemap.xml` 已生成
- [ ] `robots.txt` 已生成

### 3. HTML 內容檢查
檢查生成的 HTML 文件：
- [ ] 所有連結使用相對路徑（不是絕對 URL）
- [ ] 連結包含正確的 `?lang=` 參數
- [ ] 沒有硬編碼的 `photon.gravito.dev` URL

## 🌐 部署檢查

### 1. Cloudflare Pages 設定
- [ ] 建置命令：`BASE_URL=https://photon-site.pages.dev bun run build`
- [ ] 輸出目錄：`dist/static`
- [ ] 根目錄：`examples/photon-site`（如果從 monorepo 根目錄部署）

### 2. 環境變數（可選）
如果需要覆蓋預設值，在 Cloudflare Pages 設定：
- `BASE_URL` = `https://photon-site.pages.dev`
- `VITE_BASE_URL` = `https://photon-site.pages.dev`

### 3. 自訂域名（如適用）
- [ ] 如果使用 `photon.gravito.dev`，確保 DNS 設定正確
- [ ] 更新 `staticDomains` 和 `baseUrl` 以匹配實際域名

## 🧪 測試檢查

### 1. 本地測試
```bash
# 1. 建置靜態網站
BASE_URL=https://photon-site.pages.dev bun run build

# 2. 預覽建置結果
cd dist/static
python3 -m http.server 8000
# 或使用其他靜態伺服器

# 3. 測試連結
# 訪問 http://localhost:8000
# 點擊所有連結，確認都能正常導航
```

### 2. 連結測試清單
- [ ] 首頁 (`/`)
- [ ] 文檔首頁 (`/docs/intro`)
- [ ] 文檔頁面（英文）：`/docs/intro?lang=en`
- [ ] 文檔頁面（繁體中文）：`/docs/intro?lang=zh-TW`
- [ ] 路徑格式文檔：`/docs/zh-TW/intro`
- [ ] 生態系統頁面：`/ecosystem?lang=en`
- [ ] 模式頁面：`/patterns?lang=en`
- [ ] 法律頁面：`/legal/privacy?lang=en`
- [ ] 語言切換功能

### 3. 瀏覽器開發者工具檢查
- [ ] 檢查 Console 是否有錯誤
- [ ] 檢查 Network 標籤，確認所有資源載入成功
- [ ] 檢查連結的 `href` 屬性是否正確
- [ ] 確認沒有 404 錯誤

### 4. 跨瀏覽器測試
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

## 🐛 常見問題排查

### 問題 1：連結無法正常導航
**可能原因：**
- `_redirects` 文件未正確複製到輸出目錄
- Cloudflare Pages 未正確處理 `_redirects` 文件
- 連結使用了絕對 URL 而非相對路徑

**解決方案：**
1. 確認 `public/_redirects` 存在
2. 確認建置後 `dist/static/_redirects` 存在
3. 檢查連結是否使用相對路徑

### 問題 2：語言切換不工作
**可能原因：**
- 查詢參數未正確傳遞
- `StaticLink` 組件未正確檢測靜態環境

**解決方案：**
1. 檢查 `staticDomains` 配置
2. 確認 `isStaticSite()` 返回 `true`
3. 檢查瀏覽器 Console 是否有錯誤

### 問題 3：404 錯誤
**可能原因：**
- 路由未正確生成
- `_redirects` 文件配置錯誤
- 檔案路徑大小寫不匹配

**解決方案：**
1. 檢查 `dist/static/` 目錄結構
2. 確認所有路由都已生成對應的 HTML 文件
3. 檢查 Cloudflare Pages 的建置日誌

## 📝 部署後驗證

部署完成後，訪問以下 URL 進行驗證：

1. **首頁**
   - https://photon-site.pages.dev/
   - https://photon-site.pages.dev/?lang=zh-TW

2. **文檔頁面**
   - https://photon-site.pages.dev/docs/intro
   - https://photon-site.pages.dev/docs/intro?lang=en
   - https://photon-site.pages.dev/docs/intro?lang=zh-TW
   - https://photon-site.pages.dev/docs/zh-TW/intro

3. **其他頁面**
   - https://photon-site.pages.dev/ecosystem
   - https://photon-site.pages.dev/patterns
   - https://photon-site.pages.dev/legal/privacy

4. **檢查連結**
   - 點擊所有導航連結
   - 確認語言切換功能正常
   - 確認沒有 404 錯誤

## 🔗 相關檔案

- `src/client/app.tsx` - 應用程式配置
- `build-static.ts` - 靜態網站建置腳本
- `public/_redirects` - Cloudflare Pages 重定向規則
- `src/server/index.ts` - 伺服器路由配置
- `src/client/components/DocsLayout.tsx` - 文檔佈局組件
