/**
 * @fileoverview Token Validation Performance Benchmarks
 *
 * Tests token validation performance including:
 * - Time-safe string comparison
 * - JWT verification
 * - Token parsing
 *
 * @module photon/perf/token-validation
 */

import { formatTime, generateReport, measure } from '../utils'

/**
 * 時間安全的字符串比較
 * 防止計時攻擊（timing attacks）
 */
function timeSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)

  if (bufA.length !== bufB.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i]
  }

  return result === 0
}

/**
 * 簡單的 JWT 驗證模擬（不實際驗證簽名）
 */
function parseJWT(token: string): {
  header: string
  payload: string
  signature: string
} {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  return {
    header: Buffer.from(parts[0], 'base64url').toString(),
    payload: Buffer.from(parts[1], 'base64url').toString(),
    signature: parts[2],
  }
}

/**
 * 簡單的 HMAC 簽名驗證模擬
 */
function verifyHMAC(data: string, signature: string, secret: string): boolean {
  // 模擬 HMAC 計算（實際應用中會使用 crypto.createHmac）
  const crypto = require('node:crypto')
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return timeSafeCompare(expectedSig, signature)
}

async function runTokenValidationBenchmarks() {
  console.log('🚀 Starting Token Validation Performance Benchmarks...\n')

  const results = []

  // 準備測試數據
  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
  const invalidToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid'
  const secret = 'your-secret-key'

  // 1. 時間安全比較 - 相同字符串
  console.log('📊 Testing Time-Safe String Comparison (matching strings)...')
  const sameStringResult = await measure(
    'Time-Safe Compare (same string)',
    () => {
      timeSafeCompare(validToken, validToken)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(sameStringResult)
  console.log(
    `  ✓ Mean: ${formatTime(sameStringResult.mean)}, p99: ${formatTime(sameStringResult.p99)}`
  )

  // 2. 時間安全比較 - 不同字符串
  console.log('📊 Testing Time-Safe String Comparison (different strings)...')
  const diffStringResult = await measure(
    'Time-Safe Compare (different string)',
    () => {
      timeSafeCompare(validToken, invalidToken)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(diffStringResult)
  console.log(
    `  ✓ Mean: ${formatTime(diffStringResult.mean)}, p99: ${formatTime(diffStringResult.p99)}`
  )

  // 3. JWT 解析
  console.log('📊 Testing JWT Parsing...')
  const jwtParseResult = await measure(
    'JWT Parsing',
    () => {
      parseJWT(validToken)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(jwtParseResult)
  console.log(
    `  ✓ Mean: ${formatTime(jwtParseResult.mean)}, p99: ${formatTime(jwtParseResult.p99)}`
  )

  // 4. JWT 簽名驗證
  console.log('📊 Testing JWT Signature Verification...')
  const jwtVerifyResult = await measure(
    'JWT Signature Verification',
    () => {
      try {
        const parts = validToken.split('.')
        verifyHMAC(`${parts[0]}.${parts[1]}`, parts[2], secret)
      } catch (_e) {
        // 忽略錯誤
      }
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(jwtVerifyResult)
  console.log(
    `  ✓ Mean: ${formatTime(jwtVerifyResult.mean)}, p99: ${formatTime(jwtVerifyResult.p99)}`
  )

  // 5. 完整 JWT 驗證流程
  console.log('📊 Testing Complete JWT Validation Flow...')
  const fullJWTResult = await measure(
    'Complete JWT Validation',
    () => {
      try {
        const parts = validToken.split('.')
        if (parts.length !== 3) {
          throw new Error('Invalid JWT')
        }
        // 驗證簽名
        verifyHMAC(`${parts[0]}.${parts[1]}`, parts[2], secret)
      } catch (_e) {
        // 忽略錯誤
      }
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(fullJWTResult)
  console.log(`  ✓ Mean: ${formatTime(fullJWTResult.mean)}, p99: ${formatTime(fullJWTResult.p99)}`)

  // 6. Bearer Token 提取
  console.log('📊 Testing Bearer Token Extraction...')
  const bearerExtractResult = await measure(
    'Bearer Token Extraction',
    () => {
      const header = `Bearer ${validToken}`
      const _token = header.startsWith('Bearer ') ? header.slice(7) : null
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(bearerExtractResult)
  console.log(
    `  ✓ Mean: ${formatTime(bearerExtractResult.mean)}, p99: ${formatTime(bearerExtractResult.p99)}`
  )

  // 7. 多個 Token 驗證（模擬多個頭檢查）
  console.log('📊 Testing Multiple Token Validation (Authorization header check)...')
  const multiTokenResult = await measure(
    'Authorization Header Check',
    () => {
      const header = `Bearer ${validToken}`
      const parts = header.split(' ')
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return false
      }
      return timeSafeCompare(parts[1], validToken)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(multiTokenResult)
  console.log(
    `  ✓ Mean: ${formatTime(multiTokenResult.mean)}, p99: ${formatTime(multiTokenResult.p99)}`
  )

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 輸出統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(50))

  const avgMean = results.reduce((sum, r) => sum + r.mean, 0) / results.length
  const maxMean = Math.max(...results.map((r) => r.mean))
  const minMean = Math.min(...results.map((r) => r.mean))

  console.log(`Average Mean: ${formatTime(avgMean)}`)
  console.log(`Fastest: ${formatTime(minMean)}`)
  console.log(`Slowest: ${formatTime(maxMean)}`)

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(50))

  results.forEach((r) => {
    const status = r.mean < 10 ? '✓ Excellent' : r.mean < 50 ? '⚠ Good' : '✗ Poor'
    console.log(`${r.name}: ${status} (${formatTime(r.mean)})`)
  })
}

runTokenValidationBenchmarks().catch(console.error)
