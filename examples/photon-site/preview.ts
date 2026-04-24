#!/usr/bin/env bun
/**
 * 本地預覽靜態網站
 * 啟動一個簡單的 HTTP 伺服器來預覽建置後的靜態網站
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

const outputDir = path.join(process.cwd(), 'dist/static')
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8000

// 檢查輸出目錄是否存在
if (!existsSync(outputDir)) {
  console.error('❌ 錯誤: 輸出目錄不存在')
  console.log(`📁 預期目錄: ${outputDir}`)
  console.log('\n💡 請先執行建置命令:')
  console.log('   BASE_URL=https://photon-site.pages.dev bun run build')
  process.exit(1)
}

// 檢查 index.html 是否存在
const indexFile = path.join(outputDir, 'index.html')
if (!existsSync(indexFile)) {
  console.error('❌ 錯誤: index.html 不存在')
  console.log(`📁 預期檔案: ${indexFile}`)
  console.log('\n💡 請先執行建置命令:')
  console.log('   BASE_URL=https://photon-site.pages.dev bun run build')
  process.exit(1)
}

console.log('🚀 啟動本地預覽伺服器...\n')
console.log(`📁 服務目錄: ${outputDir}`)
console.log(`🌐 訪問地址: http://localhost:${port}`)
console.log(`\n💡 按 Ctrl+C 停止伺服器\n`)

// 使用 Bun 的內建 HTTP 伺服器
const server = Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url)
    // 移除查詢參數，只使用路徑部分
    // 查詢參數（如 ?lang=en）由客戶端 JavaScript 處理
    const pathname = url.pathname

    // 確定要載入的檔案路徑
    let filePath: string
    if (pathname === '/') {
      filePath = path.join(outputDir, 'index.html')
    } else if (pathname.endsWith('/')) {
      // 如果路徑以 / 結尾，載入該目錄下的 index.html
      filePath = path.join(outputDir, pathname.slice(1), 'index.html')
    } else {
      // 檢查是否為檔案（有副檔名）
      const hasExtension = path.extname(pathname) !== ''
      if (hasExtension) {
        // 直接載入檔案
        filePath = path.join(outputDir, pathname.slice(1))
      } else {
        // 沒有副檔名，嘗試載入目錄下的 index.html
        filePath = path.join(outputDir, pathname.slice(1), 'index.html')
      }
    }

    // 確保檔案在輸出目錄內（安全檢查）
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(outputDir)
    if (!resolvedPath.startsWith(resolvedDir)) {
      return new Response('Forbidden', { status: 403 })
    }

    // 檢查檔案是否存在
    if (!existsSync(resolvedPath)) {
      // 嘗試載入 index.html（SPA fallback）
      // 這對於帶查詢參數的路由很重要（如 /docs/intro?lang=en）
      const fallbackPath = path.join(outputDir, 'index.html')
      if (existsSync(fallbackPath)) {
        const file = Bun.file(fallbackPath)
        return new Response(file, {
          headers: {
            'Content-Type': 'text/html',
          },
        })
      }
      return new Response('Not Found', { status: 404 })
    }

    const file = Bun.file(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()

    // 設定正確的 Content-Type
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
    }

    return new Response(file, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
      },
    })
  },
})

console.log(`✅ 伺服器已啟動在 http://localhost:${server.port}`)
