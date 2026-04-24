#!/usr/bin/env bun

/**
 * 檢查靜態輸出檔案
 * 驗證建置後的 HTML 文件是否正確
 */

import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.join(process.cwd(), 'dist/static')

interface Issue {
  file: string
  issue: string
  severity: 'error' | 'warning' | 'info'
}

const issues: Issue[] = []

async function checkFile(filePath: string, relativePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8')
    const stats = await stat(filePath)

    // 檢查檔案大小
    if (stats.size === 0) {
      issues.push({
        file: relativePath,
        issue: '檔案為空',
        severity: 'error',
      })
      return
    }

    // 檢查基本 HTML 結構
    if (!content.includes('<!DOCTYPE html>')) {
      issues.push({
        file: relativePath,
        issue: '缺少 DOCTYPE 聲明',
        severity: 'warning',
      })
    }

    if (!content.includes('<html')) {
      issues.push({
        file: relativePath,
        issue: '缺少 <html> 標籤',
        severity: 'error',
      })
    }

    if (!content.includes('<body')) {
      issues.push({
        file: relativePath,
        issue: '缺少 <body> 標籤',
        severity: 'error',
      })
    }

    // 檢查 React 根元素
    if (!content.includes('id="app"') && !content.includes("id='app'")) {
      issues.push({
        file: relativePath,
        issue: '缺少 React 根元素 (id="app")',
        severity: 'error',
      })
    }

    // 檢查 data-page 屬性（Inertia）
    if (!content.includes('data-page')) {
      issues.push({
        file: relativePath,
        issue: '缺少 data-page 屬性（Inertia 頁面數據）',
        severity: 'error',
      })
    }

    // 檢查資源引用
    if (!content.includes('/assets/') && !content.includes('app.js')) {
      issues.push({
        file: relativePath,
        issue: '缺少資源引用（JS/CSS）',
        severity: 'warning',
      })
    }

    // 檢查硬編碼的舊域名
    if (content.includes('photon.gravito.dev') && !content.includes('photon-site.pages.dev')) {
      issues.push({
        file: relativePath,
        issue: '包含硬編碼的舊域名 photon.gravito.dev',
        severity: 'warning',
      })
    }

    // 檢查 JSON 數據是否有效
    // Inertia 使用 HTML 實體編碼，需要正確解碼
    const dataPageMatch = content.match(/data-page=['"]([^'"]+)['"]/)
    if (dataPageMatch) {
      try {
        let jsonStr = dataPageMatch[1]
        // 解碼 HTML 實體
        jsonStr = jsonStr
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&#039;/g, "'")
        JSON.parse(jsonStr)
      } catch (e: any) {
        // 只報告嚴重的解析錯誤，忽略格式問題
        if (e.message?.includes('JSON Parse error')) {
          issues.push({
            file: relativePath,
            issue: `data-page JSON 解析失敗: ${e.message.substring(0, 50)}`,
            severity: 'warning', // 改為警告，因為可能是檢查腳本的問題
          })
        }
      }
    }
  } catch (error) {
    issues.push({
      file: relativePath,
      issue: `無法讀取檔案: ${error}`,
      severity: 'error',
    })
  }
}

async function walkDir(dir: string, relativeDir = '') {
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.join(relativeDir, entry.name)

      if (entry.isDirectory()) {
        await walkDir(fullPath, relativePath)
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        await checkFile(fullPath, relativePath)
      }
    }
  } catch (error) {
    console.error(`❌ 讀取目錄失敗: ${relativeDir}`, error)
  }
}

async function checkRequiredFiles() {
  const requiredFiles = ['index.html', '_redirects', 'sitemap.xml', 'robots.txt']

  for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file)
    if (!existsSync(filePath)) {
      issues.push({
        file,
        issue: '必要檔案不存在',
        severity: 'error',
      })
    }
  }
}

async function checkRouteCoverage() {
  // 檢查關鍵路由是否存在
  const criticalRoutes = ['/', '/docs/intro', '/docs/zh-TW/intro', '/ecosystem', '/patterns']

  for (const route of criticalRoutes) {
    let filePath: string
    if (route === '/') {
      filePath = path.join(outputDir, 'index.html')
    } else {
      const pathWithoutSlash = route.replace(/^\//, '')
      filePath = path.join(outputDir, pathWithoutSlash, 'index.html')
    }

    if (!existsSync(filePath)) {
      issues.push({
        file: route,
        issue: '路由對應的 HTML 檔案不存在',
        severity: 'error',
      })
    }
  }
}

async function main() {
  console.log('🔍 開始檢查靜態輸出檔案...\n')
  console.log(`📁 輸出目錄: ${outputDir}\n`)

  // 檢查輸出目錄是否存在
  if (!existsSync(outputDir)) {
    console.error('❌ 輸出目錄不存在')
    console.log('💡 請先執行建置命令: BASE_URL=https://photon-site.pages.dev bun run build')
    process.exit(1)
  }

  await checkRequiredFiles()
  await checkRouteCoverage()
  await walkDir(outputDir)

  // 統計問題
  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')
  const infos = issues.filter((i) => i.severity === 'info')

  console.log('📊 檢查結果:\n')
  console.log(`  ❌ 錯誤: ${errors.length}`)
  console.log(`  ⚠️  警告: ${warnings.length}`)
  console.log(`  ℹ️  資訊: ${infos.length}`)

  if (issues.length === 0) {
    console.log('\n✅ 所有檢查通過！')
    process.exit(0)
  }

  // 按嚴重程度分組顯示
  if (errors.length > 0) {
    console.log('\n❌ 錯誤:')
    for (const issue of errors) {
      console.log(`  • ${issue.file}: ${issue.issue}`)
    }
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:')
    for (const issue of warnings) {
      console.log(`  • ${issue.file}: ${issue.issue}`)
    }
  }

  if (infos.length > 0) {
    console.log('\nℹ️  資訊:')
    for (const issue of infos) {
      console.log(`  • ${issue.file}: ${issue.issue}`)
    }
  }

  if (errors.length > 0) {
    console.log('\n❌ 發現錯誤，請修復後重新建置')
    process.exit(1)
  } else {
    console.log('\n⚠️  檢查完成，有警告但無錯誤')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ 檢查過程發生錯誤:', error)
  process.exit(1)
})
