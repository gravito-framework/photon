#!/usr/bin/env bun
/**
 * 測試路由是否正確響應
 * 用於調試建置時的路由問題
 */

import { app } from '../src/server/index'

const testRoutes = [
  '/docs/intro',
  '/docs/intro?lang=en',
  '/docs/intro?lang=zh-TW',
  '/docs/en/intro',
  '/docs/zh-TW/intro',
]

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
    } else if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location')
      console.log(`   ↪ 重定向到: ${location}`)
    } else {
      console.log(`   ❌ 錯誤狀態碼`)
    }
  } catch (error: any) {
    console.log(`\n📍 ${path}`)
    console.log(`   ❌ 錯誤: ${error.message}`)
  }
}

async function main() {
  console.log('🧪 測試路由響應...\n')
  console.log('⚠️  注意：此腳本需要伺服器正在運行 (bun run dev:server)')
  console.log('   如果伺服器未運行，請先啟動: bun run dev:server\n')

  for (const route of testRoutes) {
    await testRoute(route)
  }

  console.log('\n✅ 測試完成')
}

main().catch((error) => {
  console.error('❌ 測試過程發生錯誤:', error)
  process.exit(1)
})
