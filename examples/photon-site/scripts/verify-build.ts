#!/usr/bin/env bun
/**
 * 驗證建置輸出
 * 檢查靜態網站建置是否完整且正確
 */

import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

const results: CheckResult[] = []
const outputDir = path.join(process.cwd(), 'dist/static')

async function checkOutputDir() {
  if (!existsSync(outputDir)) {
    results.push({
      name: '輸出目錄',
      status: 'fail',
      message: '❌ dist/static 目錄不存在',
      details: '請先執行建置命令: BASE_URL=https://photon-site.pages.dev bun run build',
    })
    return false
  }

  results.push({
    name: '輸出目錄',
    status: 'pass',
    message: '✅ dist/static 目錄存在',
  })
  return true
}

async function checkRequiredFiles() {
  const requiredFiles = ['index.html', '_redirects', 'sitemap.xml', 'robots.txt']

  for (const file of requiredFiles) {
    const filePath = path.join(outputDir, file)
    if (existsSync(filePath)) {
      const stats = await stat(filePath)
      results.push({
        name: `檔案: ${file}`,
        status: 'pass',
        message: `✅ ${file} 存在 (${(stats.size / 1024).toFixed(2)} KB)`,
      })
    } else {
      results.push({
        name: `檔案: ${file}`,
        status: 'fail',
        message: `❌ ${file} 不存在`,
      })
    }
  }
}

async function checkDirectories() {
  const requiredDirs = ['docs']

  for (const dir of requiredDirs) {
    const dirPath = path.join(outputDir, dir)
    if (existsSync(dirPath)) {
      try {
        const entries = await readdir(dirPath)
        results.push({
          name: `目錄: ${dir}`,
          status: 'pass',
          message: `✅ ${dir}/ 目錄存在 (包含 ${entries.length} 個項目)`,
        })
      } catch (_error) {
        results.push({
          name: `目錄: ${dir}`,
          status: 'fail',
          message: `❌ 無法讀取 ${dir}/ 目錄`,
        })
      }
    } else {
      results.push({
        name: `目錄: ${dir}`,
        status: 'fail',
        message: `❌ ${dir}/ 目錄不存在`,
      })
    }
  }
}

async function checkHTMLContent() {
  try {
    const indexPath = path.join(outputDir, 'index.html')
    if (!existsSync(indexPath)) {
      return
    }

    const { readFile } = await import('node:fs/promises')
    const content = await readFile(indexPath, 'utf-8')

    // 檢查是否包含必要的標籤
    const checks = [
      {
        name: 'HTML 標籤',
        pattern: /<html/i,
        message: '包含 <html> 標籤',
      },
      {
        name: 'Head 標籤',
        pattern: /<head/i,
        message: '包含 <head> 標籤',
      },
      {
        name: 'Body 標籤',
        pattern: /<body/i,
        message: '包含 <body> 標籤',
      },
      {
        name: 'React 根元素',
        pattern: /id=["']root["']|id=["']app["']/i,
        message: '包含 React 根元素',
      },
    ]

    for (const check of checks) {
      if (check.pattern.test(content)) {
        results.push({
          name: `HTML: ${check.name}`,
          status: 'pass',
          message: `✅ ${check.message}`,
        })
      } else {
        results.push({
          name: `HTML: ${check.name}`,
          status: 'warning',
          message: `⚠️  未找到 ${check.message}`,
        })
      }
    }

    // 檢查是否有硬編碼的舊域名
    if (content.includes('photon.gravito.dev') && !content.includes('photon-site.pages.dev')) {
      results.push({
        name: 'HTML: 域名檢查',
        status: 'warning',
        message: '⚠️  發現 photon.gravito.dev（如果這是外部連結則可忽略）',
      })
    } else {
      results.push({
        name: 'HTML: 域名檢查',
        status: 'pass',
        message: '✅ 沒有發現硬編碼的舊域名',
      })
    }
  } catch (error) {
    results.push({
      name: 'HTML 內容檢查',
      status: 'fail',
      message: `❌ 無法讀取 index.html: ${error}`,
    })
  }
}

async function checkAssets() {
  try {
    const assetsDir = path.join(outputDir, 'assets')
    if (existsSync(assetsDir)) {
      const entries = await readdir(assetsDir)
      const jsFiles = entries.filter((f) => f.endsWith('.js'))
      const cssFiles = entries.filter((f) => f.endsWith('.css'))

      results.push({
        name: '資源檔案',
        status: 'pass',
        message: `✅ assets/ 目錄存在 (${jsFiles.length} JS, ${cssFiles.length} CSS)`,
      })
    } else {
      results.push({
        name: '資源檔案',
        status: 'warning',
        message: '⚠️  assets/ 目錄不存在（可能使用內聯樣式）',
      })
    }
  } catch (error) {
    results.push({
      name: '資源檔案',
      status: 'warning',
      message: `⚠️  無法檢查資源檔案: ${error}`,
    })
  }
}

async function main() {
  console.log('🔍 開始驗證建置輸出...\n')
  console.log(`📁 輸出目錄: ${outputDir}\n`)

  const dirExists = await checkOutputDir()
  if (!dirExists) {
    printResults()
    process.exit(1)
  }

  await checkRequiredFiles()
  await checkDirectories()
  await checkHTMLContent()
  await checkAssets()

  printResults()
}

function printResults() {
  console.log('📊 驗證結果:\n')

  let passCount = 0
  let failCount = 0
  let warningCount = 0

  for (const result of results) {
    console.log(`${result.message}`)
    if (result.details) {
      console.log(`   ${result.details}`)
    }

    if (result.status === 'pass') {
      passCount++
    } else if (result.status === 'fail') {
      failCount++
    } else {
      warningCount++
    }
  }

  console.log(`\n📈 統計:`)
  console.log(`  ✅ 通過: ${passCount}`)
  console.log(`  ⚠️  警告: ${warningCount}`)
  console.log(`  ❌ 失敗: ${failCount}`)

  if (failCount > 0) {
    console.log('\n❌ 建置驗證失敗，請檢查上述問題')
    process.exit(1)
  } else if (warningCount > 0) {
    console.log('\n⚠️  建置驗證通過，但有警告')
    process.exit(0)
  } else {
    console.log('\n✅ 所有檢查通過！建置輸出正常')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ 驗證過程發生錯誤:', error)
  process.exit(1)
})
