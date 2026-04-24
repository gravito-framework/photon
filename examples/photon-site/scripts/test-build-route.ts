#!/usr/bin/env bun
/**
 * 測試建置時的路由響應
 * 模擬 SSG 建置過程，測試特定路由
 */

import { app } from '../src/server/index'

const testRoutes = ['/docs/intro', '/docs/en/intro', '/docs/zh-TW/intro']

async function testRoute(path: string) {
  try {
    const url = `http://localhost${path}`
    const request = new Request(url)
    const response = await (app as any).fetch(request)

    console.log(`\n📍 ${path}`)
    console.log(`   狀態: ${response.status} ${response.statusText}`)

    if (response.status === 200) {
      const html = await response.text()
      const hasDataPage = html.includes('data-page')
      const hasApp = html.includes('id="app"')
      console.log(`   ✅ HTML 長度: ${html.length} bytes`)
      console.log(`   ${hasDataPage ? '✅' : '❌'} 包含 data-page: ${hasDataPage}`)
      console.log(`   ${hasApp ? '✅' : '❌'} 包含 id="app": ${hasApp}`)

      // 提取 URL
      const urlMatch = html.match(/"url":"([^"]+)"/)
      if (urlMatch) {
        console.log(`   URL: ${urlMatch[1]}`)
      }
    } else if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location')
      console.log(`   ↪ 重定向到: ${location}`)
    } else {
      const text = await response.text().catch(() => '無法讀取響應')
      console.log(`   ❌ 錯誤狀態碼`)
      console.log(`   響應內容: ${text.substring(0, 200)}`)
    }
  } catch (error: any) {
    console.log(`\n📍 ${path}`)
    console.log(`   ❌ 錯誤: ${error.message}`)
  }
}

async function main() {
  console.log('🧪 測試建置時的路由響應...\n')
  console.log('⚠️  注意：此腳本模擬 SSG 建置過程\n')

  for (const route of testRoutes) {
    await testRoute(route)
  }

  console.log('\n✅ 測試完成')
}

main().catch((error) => {
  console.error('❌ 測試過程發生錯誤:', error)
  process.exit(1)
})
