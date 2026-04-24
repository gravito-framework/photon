# 本地預覽靜態網站指南

## 🚀 快速開始

### 方法 1: 使用預覽腳本（推薦）

```bash
# 建置並預覽（一步完成）
bun run preview:build

# 或分步驟執行
BASE_URL=https://photon-site.pages.dev bun run build
bun run preview
```

預覽腳本會自動：
- ✅ 檢查輸出目錄是否存在
- ✅ 檢查 index.html 是否存在
- ✅ 啟動本地 HTTP 伺服器
- ✅ 處理 SPA 路由（自動 fallback 到 index.html）

訪問地址：http://localhost:8000

### 方法 2: 使用 Python HTTP 伺服器

```bash
# 建置
BASE_URL=https://photon-site.pages.dev bun run build

# 進入輸出目錄
cd dist/static

# 啟動 Python 伺服器
python3 -m http.server 8000
```

訪問地址：http://localhost:8000

### 方法 3: 使用 Node.js http-server

```bash
# 安裝 http-server（如果尚未安裝）
npm install -g http-server

# 建置
BASE_URL=https://photon-site.pages.dev bun run build

# 啟動伺服器
cd dist/static
http-server -p 8000
```

### 方法 4: 使用 Vite Preview

```bash
# 建置
BASE_URL=https://photon-site.pages.dev bun run build

# 使用 Vite 預覽（需要先建置客戶端資源）
bun run build:client
cd dist/static
# 注意：Vite preview 主要用於開發環境，不適合靜態網站預覽
```

## 📋 完整檢查流程

### 步驟 1: 配置檢查
```bash
bun run check:config
```
確認所有配置正確。

### 步驟 2: 建置靜態網站
```bash
BASE_URL=https://photon-site.pages.dev bun run build
```

### 步驟 3: 驗證建置輸出
```bash
bun run verify:build
```

這會檢查：
- ✅ 輸出目錄是否存在
- ✅ 必要檔案（index.html, _redirects, sitemap.xml, robots.txt）
- ✅ 必要目錄（docs/）
- ✅ HTML 內容完整性
- ✅ 資源檔案（JS, CSS）

### 步驟 4: 檢查連結
```bash
bun run check:links
```

檢查生成的 HTML 文件中的連結是否正確。

### 步驟 5: 本地預覽
```bash
bun run preview
```

或使用其他方法（見上方）。

### 步驟 6: 瀏覽器測試

訪問以下 URL 進行測試：

1. **首頁**
   - http://localhost:8000/
   - http://localhost:8000/?lang=zh-TW

2. **文檔頁面**
   - http://localhost:8000/docs/intro
   - http://localhost:8000/docs/intro?lang=en
   - http://localhost:8000/docs/intro?lang=zh-TW
   - http://localhost:8000/docs/zh-TW/intro

3. **其他頁面**
   - http://localhost:8000/ecosystem
   - http://localhost:8000/patterns
   - http://localhost:8000/legal/privacy

## 🔍 檢查項目

### 1. 檔案結構檢查
```bash
# 檢查輸出目錄結構
ls -la dist/static/

# 應該看到：
# - index.html
# - _redirects
# - sitemap.xml
# - robots.txt
# - docs/ (目錄)
# - assets/ (目錄，如果有的話)
```

### 2. HTML 內容檢查
```bash
# 檢查是否有硬編碼的舊域名
grep -r "photon.gravito.dev" dist/static/ --include="*.html" | head -5

# 檢查連結格式
grep -r 'href="/docs/' dist/static/ --include="*.html" | head -5
```

### 3. 檔案大小檢查
```bash
# 檢查主要檔案大小
du -sh dist/static/
du -sh dist/static/index.html
du -sh dist/static/docs/
```

### 4. 瀏覽器開發者工具檢查

打開瀏覽器開發者工具（F12），檢查：

- **Console 標籤**
  - 確認沒有 JavaScript 錯誤
  - 確認沒有資源載入失敗

- **Network 標籤**
  - 確認所有資源（JS, CSS, 圖片）都成功載入
  - 確認沒有 404 錯誤
  - 檢查載入時間

- **Elements 標籤**
  - 檢查 HTML 結構是否正確
  - 檢查 CSS 樣式是否正確應用
  - 檢查連結的 `href` 屬性

## 🐛 常見問題

### 問題 1: 預覽伺服器無法啟動

**錯誤訊息：** `輸出目錄不存在`

**解決方案：**
```bash
# 確認已執行建置
BASE_URL=https://photon-site.pages.dev bun run build

# 確認輸出目錄存在
ls -la dist/static/
```

### 問題 2: 頁面顯示空白

**可能原因：**
- JavaScript 未正確載入
- CSS 未正確載入
- React 根元素未找到

**解決方案：**
1. 檢查瀏覽器 Console 是否有錯誤
2. 檢查 Network 標籤，確認資源載入成功
3. 檢查 `dist/static/index.html` 是否包含正確的 script 標籤

### 問題 3: 連結無法導航

**可能原因：**
- `_redirects` 文件未正確複製
- 連結使用了絕對 URL

**解決方案：**
```bash
# 確認 _redirects 文件存在
ls -la dist/static/_redirects

# 檢查連結格式
grep -r 'href="http' dist/static/ --include="*.html" | head -5
```

### 問題 4: 樣式未正確載入

**可能原因：**
- CSS 檔案路徑錯誤
- Tailwind CSS 未正確編譯

**解決方案：**
1. 檢查 `dist/static/assets/` 目錄是否有 CSS 檔案
2. 檢查 HTML 中的 `<link>` 標籤路徑是否正確
3. 重新建置：`bun run build`

## 📝 一鍵檢查命令

執行以下命令進行完整檢查：

```bash
# 完整檢查流程
bun run check:config && \
BASE_URL=https://photon-site.pages.dev bun run build && \
bun run verify:build && \
bun run check:links && \
echo "✅ 所有檢查通過！可以執行 'bun run preview' 進行本地預覽"
```

## 🔗 相關文檔

- [快速檢查指南](./QUICK_CHECK.md) - 快速檢查命令
- [完整檢查清單](./CHECKLIST.md) - 詳細檢查項目
- [故障排除指南](./TROUBLESHOOTING.md) - 常見問題解決方案
