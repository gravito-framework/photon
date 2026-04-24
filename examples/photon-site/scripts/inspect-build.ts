#!/usr/bin/env bun

/**
 * 檢查建置輸出
 * 分析生成的 HTML 文件，檢查路由、連結和內容
 */

import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.join(process.cwd(), 'dist/static')

interface RouteInfo {
  path: string
  exists: boolean
  size: number
  url?: string
  component?: string
  lang?: string
}

async function inspectHTML(filePath: string, relativePath: string): Promise<RouteInfo> {
  const info: RouteInfo = {
    path: relativePath,
    exists: existsSync(filePath),
    size: 0,
  }

  if (!info.exists) {
    return info
  }

  try {
    const stats = await stat(filePath)
    info.size = stats.size

    const content = await readFile(filePath, 'utf-8')

    // 提取 data-page 中的 URL
    const urlMatch = content.match(/"url":"([^"]+)"/)
    if (urlMatch) {
      info.url = urlMatch[1]
    }

    // 提取 component
    const componentMatch = content.match(/"component":"([^"]+)"/)
    if (componentMatch) {
      info.component = componentMatch[1]
    }

    // 提取 lang
    const langMatch = content.match(/"lang":"([^"]+)"/)
    if (langMatch) {
      info.lang = langMatch[1]
    }
  } catch (error) {
    console.error(`無法讀取 ${relativePath}:`, error)
  }

  return info
}

async function walkDir(dir: string, relativeDir = ''): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.join(relativeDir, entry.name)

      if (entry.isDirectory()) {
        const subRoutes = await walkDir(fullPath, relativePath)
        routes.push(...subRoutes)
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const info = await inspectHTML(fullPath, relativePath)
        routes.push(info)
      }
    }
  } catch (error) {
    console.error(`讀取目錄失敗: ${relativeDir}`, error)
  }

  return routes
}

async function main() {
  console.log('🔍 檢查靜態輸出檔案...\n')
  console.log(`📁 輸出目錄: ${outputDir}\n`)

  if (!existsSync(outputDir)) {
    console.error('❌ 輸出目錄不存在')
    console.log('💡 請先執行建置命令: BASE_URL=https://photon-site.pages.dev bun run build')
    process.exit(1)
  }

  const routes = await walkDir(outputDir)

  // 按路徑排序
  routes.sort((a, b) => a.path.localeCompare(b.path))

  console.log(`📊 找到 ${routes.length} 個 HTML 文件\n`)

  // 檢查關鍵路由
  const criticalRoutes = [
    '/',
    '/docs/intro',
    '/docs/en/intro',
    '/docs/zh-TW/intro',
    '/ecosystem',
    '/patterns',
  ]

  console.log('🔑 關鍵路由檢查:')
  for (const route of criticalRoutes) {
    let filePath: string
    if (route === '/') {
      filePath = 'index.html'
    } else {
      const pathWithoutSlash = route.replace(/^\//, '')
      filePath = `${pathWithoutSlash}/index.html`
    }

    const routeInfo = routes.find((r) => r.path === filePath)
    if (routeInfo?.exists) {
      console.log(`  ✅ ${route}`)
      if (routeInfo.url) {
        console.log(`      URL: ${routeInfo.url}`)
      }
      if (routeInfo.component) {
        console.log(`      組件: ${routeInfo.component}`)
      }
      if (routeInfo.lang) {
        console.log(`      語言: ${routeInfo.lang}`)
      }
    } else {
      console.log(`  ❌ ${route} - 檔案不存在`)
    }
  }

  // 檢查 docs 路由
  console.log('\n📚 文檔路由統計:')
  const docRoutes = routes.filter((r) => r.path.startsWith('docs/'))
  const rootDocRoutes = docRoutes.filter(
    (r) => !r.path.includes('/en/') && !r.path.includes('/zh-TW/')
  )
  const enDocRoutes = docRoutes.filter((r) => r.path.includes('/en/'))
  const zhTWDocRoutes = docRoutes.filter((r) => r.path.includes('/zh-TW/'))

  console.log(`  根路徑 (/docs/): ${rootDocRoutes.length}`)
  console.log(`  英文路徑 (/docs/en/): ${enDocRoutes.length}`)
  console.log(`  繁體中文 (/docs/zh-TW/): ${zhTWDocRoutes.length}`)
  console.log(`  總計: ${docRoutes.length}`)

  // 檢查缺失的路由
  console.log('\n⚠️  缺失的路由:')
  const missingRoutes: string[] = []
  if (!routes.find((r) => r.path === 'docs/intro/index.html')) {
    missingRoutes.push('/docs/intro')
  }
  if (!routes.find((r) => r.path === 'docs/en/intro/index.html')) {
    missingRoutes.push('/docs/en/intro')
  }

  if (missingRoutes.length > 0) {
    for (const route of missingRoutes) {
      console.log(`  ❌ ${route}`)
    }
  } else {
    console.log('  ✅ 所有關鍵路由都存在')
  }

  // 檢查 URL 一致性
  console.log('\n🔗 URL 一致性檢查:')
  const urlMismatches: string[] = []
  for (const route of routes) {
    if (route.url && route.path !== 'index.html') {
      const expectedPath = route.url.split('?')[0].replace(/^\//, '')
      const actualPath = route.path.replace(/\/index\.html$/, '')
      if (expectedPath !== actualPath) {
        urlMismatches.push(`${route.path}: URL=${route.url}, 預期路徑=${expectedPath}`)
      }
    }
  }

  if (urlMismatches.length > 0) {
    console.log('  ⚠️  發現 URL 不一致:')
    for (const mismatch of urlMismatches.slice(0, 10)) {
      console.log(`    ${mismatch}`)
    }
    if (urlMismatches.length > 10) {
      console.log(`    ... 還有 ${urlMismatches.length - 10} 個`)
    }
  } else {
    console.log('  ✅ 所有 URL 都一致')
  }

  console.log('\n✅ 檢查完成')
}

main().catch((error) => {
  console.error('❌ 檢查過程發生錯誤:', error)
  process.exit(1)
})
