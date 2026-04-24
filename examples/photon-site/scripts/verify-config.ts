#!/usr/bin/env bun
/**
 * 配置驗證腳本
 * 檢查所有配置檔案是否正確設定
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

const results: CheckResult[] = []

async function checkAppTsx() {
  try {
    const filePath = path.join(process.cwd(), 'src/client/app.tsx')
    const content = await readFile(filePath, 'utf-8')

    // 檢查 staticDomains
    if (content.includes("'photon.gravito.dev'") || content.includes('"photon.gravito.dev"')) {
      results.push({
        name: 'app.tsx - staticDomains',
        status: 'pass',
        message: '✅ 已包含 photon.gravito.dev',
      })
    } else {
      results.push({
        name: 'app.tsx - staticDomains',
        status: 'fail',
        message: '❌ 未包含 photon.gravito.dev',
      })
    }

    // 檢查 baseUrl
    if (content.includes('VITE_BASE_URL') || content.includes('photon.gravito.dev')) {
      results.push({
        name: 'app.tsx - baseUrl',
        status: 'pass',
        message: '✅ baseUrl 已正確設定',
      })
    } else {
      results.push({
        name: 'app.tsx - baseUrl',
        status: 'fail',
        message: '❌ baseUrl 未正確設定',
      })
    }
  } catch (error) {
    results.push({
      name: 'app.tsx',
      status: 'fail',
      message: `❌ 無法讀取檔案: ${error}`,
    })
  }
}

async function checkBuildStatic() {
  try {
    const filePath = path.join(process.cwd(), 'build-static.ts')
    const content = await readFile(filePath, 'utf-8')

    // 檢查 BASE_URL
    if (content.includes('BASE_URL') || content.includes('photon.gravito.dev')) {
      results.push({
        name: 'build-static.ts - BASE_URL',
        status: 'pass',
        message: '✅ BASE_URL 已正確設定',
      })
    } else {
      results.push({
        name: 'build-static.ts - BASE_URL',
        status: 'fail',
        message: '❌ BASE_URL 未正確設定',
      })
    }

    // 檢查域名配置
    if (content.includes('photon.gravito.dev')) {
      results.push({
        name: 'build-static.ts - 域名檢查',
        status: 'pass',
        message: '✅ 域名配置正確 (photon.gravito.dev)',
      })
    } else {
      results.push({
        name: 'build-static.ts - 域名檢查',
        status: 'warning',
        message: '⚠️ 未發現主域名 photon.gravito.dev',
      })
    }
  } catch (error) {
    results.push({
      name: 'build-static.ts',
      status: 'fail',
      message: `❌ 無法讀取檔案: ${error}`,
    })
  }
}

async function checkRedirects() {
  try {
    const filePath = path.join(process.cwd(), 'public/_redirects')
    await readFile(filePath, 'utf-8')
    results.push({
      name: '_redirects 文件',
      status: 'pass',
      message: '✅ _redirects 文件存在',
    })
  } catch (_error) {
    results.push({
      name: '_redirects 文件',
      status: 'fail',
      message: '❌ _redirects 文件不存在',
    })
  }
}

async function main() {
  console.log('🔍 開始驗證配置...\n')

  await checkAppTsx()
  await checkBuildStatic()
  await checkRedirects()

  console.log('📊 驗證結果:\n')

  let passCount = 0
  let failCount = 0
  let warningCount = 0

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
    console.log(`${icon} ${result.name}: ${result.message}`)

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
    console.log('\n❌ 配置驗證失敗，請修復上述問題')
    process.exit(1)
  } else if (warningCount > 0) {
    console.log('\n⚠️  配置驗證通過，但有警告')
    process.exit(0)
  } else {
    console.log('\n✅ 所有配置驗證通過！')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('❌ 驗證過程發生錯誤:', error)
  process.exit(1)
})
