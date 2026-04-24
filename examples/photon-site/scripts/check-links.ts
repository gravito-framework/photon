#!/usr/bin/env bun
/**
 * 連結檢查腳本
 * 檢查所有生成的 HTML 文件中的連結是否正確
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.join(process.cwd(), 'dist/static')
const baseUrl = process.env.BASE_URL || 'https://photon-site.pages.dev'

interface LinkIssue {
  file: string
  line: number
  href: string
  issue: string
}

const issues: LinkIssue[] = []

async function checkFile(filePath: string, relativePath: string) {
  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    // 檢查硬編碼的舊域名
    if (content.includes('photon.gravito.dev') && !content.includes('photon-site.pages.dev')) {
      const lineNum = lines.findIndex((line) => line.includes('photon.gravito.dev'))
      issues.push({
        file: relativePath,
        line: lineNum + 1,
        href: 'photon.gravito.dev',
        issue: '發現硬編碼的舊域名，應該使用相對路徑或環境變數',
      })
    }

    // 檢查絕對 URL（除了外部連結）
    const absoluteUrlRegex = /href=["'](https?:\/\/[^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = absoluteUrlRegex.exec(content)) !== null) {
      const url = match[1]
      // 跳過外部連結（非 photon-site.pages.dev 或 photon.gravito.dev）
      if (!url.includes('photon-site.pages.dev') && !url.includes('photon.gravito.dev')) {
        continue
      }

      // 如果是內部連結，應該使用相對路徑
      if (url.includes(baseUrl.replace('https://', ''))) {
        const lineNum = content.substring(0, match.index).split('\n').length
        issues.push({
          file: relativePath,
          line: lineNum,
          href: url,
          issue: '內部連結應該使用相對路徑而非絕對 URL',
        })
      }
    }

    // 檢查缺少 lang 參數的內部連結（僅檢查文檔連結）
    if (relativePath.includes('/docs/')) {
      const docLinkRegex = /href=["'](\/docs\/[^"']+)(\?[^"']*)?["']/g
      while ((match = docLinkRegex.exec(content)) !== null) {
        const href = match[1]
        const query = match[2] || ''
        // 如果連結不包含 lang 參數，且不是路徑格式（/docs/:lang/:page 或 /:lang/docs/:page）
        if (
          !query.includes('lang=') &&
          !href.match(/\/docs\/(en|zh-TW)\//) &&
          !href.match(/^\/(en|zh-TW)\/docs\//)
        ) {
          const lineNum = content.substring(0, match.index).split('\n').length
          issues.push({
            file: relativePath,
            line: lineNum,
            href: href + query,
            issue: '文檔連結應該包含 lang 參數或使用路徑格式',
          })
        }
      }
    }
  } catch (error) {
    console.error(`❌ 讀取檔案失敗: ${relativePath}`, error)
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

async function main() {
  console.log('🔍 開始檢查連結...\n')
  console.log(`📁 輸出目錄: ${outputDir}`)
  console.log(`🌐 Base URL: ${baseUrl}\n`)

  // 檢查輸出目錄是否存在
  try {
    await stat(outputDir)
  } catch {
    console.error(`❌ 輸出目錄不存在: ${outputDir}`)
    console.log('💡 請先執行建置命令: bun run build')
    process.exit(1)
  }

  await walkDir(outputDir)

  console.log(`\n📊 檢查完成，發現 ${issues.length} 個問題\n`)

  if (issues.length === 0) {
    console.log('✅ 所有連結檢查通過！')
    process.exit(0)
  }

  // 按檔案分組顯示問題
  const issuesByFile = new Map<string, LinkIssue[]>()
  for (const issue of issues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, [])
    }
    issuesByFile.get(issue.file)?.push(issue)
  }

  for (const [file, fileIssues] of issuesByFile) {
    console.log(`\n📄 ${file}`)
    for (const issue of fileIssues) {
      console.log(`  ⚠️  第 ${issue.line} 行: ${issue.href}`)
      console.log(`     ${issue.issue}`)
    }
  }

  console.log('\n❌ 發現問題，請修復後重新建置')
  process.exit(1)
}

main().catch((error) => {
  console.error('❌ 檢查過程發生錯誤:', error)
  process.exit(1)
})
