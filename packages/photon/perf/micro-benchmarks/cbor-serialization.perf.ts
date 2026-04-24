/**
 * @fileoverview CBOR Serialization Performance Benchmarks
 *
 * Tests CBOR (Concise Binary Object Representation) encoding/decoding performance
 * Used in Photon's binary middleware for efficient data serialization.
 *
 * @module photon/perf/cbor-serialization
 */

import { decode, encode } from 'cborg'
import { formatTime, generateReport, measure } from '../utils'

// 測試數據集
const smallObject = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
}

const mediumObject = {
  id: 12345,
  name: 'John Doe',
  email: 'john.doe@example.com',
  age: 30,
  active: true,
  roles: ['user', 'admin'],
  metadata: {
    created: '2023-01-01T00:00:00Z',
    updated: '2024-03-02T00:00:00Z',
    tags: ['important', 'verified', 'premium'],
  },
}

const largeObject = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    age: Math.floor(Math.random() * 50) + 20,
    roles: ['user'],
    preferences: {
      theme: 'dark',
      notifications: true,
      language: 'en',
    },
    data: Array.from({ length: 10 }, (_, j) => ({
      key: `data_${j}`,
      value: Math.random(),
    })),
  })),
}

const nestedObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            value: 'deep nested value',
            count: 42,
            items: [1, 2, 3, 4, 5],
          },
        },
      },
    },
  },
}

async function runCBORBenchmarks() {
  console.log('🚀 Starting CBOR Serialization Performance Benchmarks...\n')

  const results = []

  // 1. 編碼小物件
  console.log('📊 Testing Small Object Encoding...')
  const smallEncodeResult = await measure(
    'Encode Small Object (~50 bytes)',
    () => {
      encode(smallObject)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(smallEncodeResult)
  const smallEncoded = encode(smallObject)
  console.log(`  ✓ Mean: ${formatTime(smallEncodeResult.mean)}, Size: ${smallEncoded.length} bytes`)

  // 2. 解碼小物件
  console.log('📊 Testing Small Object Decoding...')
  const smallDecodeResult = await measure(
    'Decode Small Object (~50 bytes)',
    () => {
      decode(smallEncoded)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(smallDecodeResult)
  console.log(
    `  ✓ Mean: ${formatTime(smallDecodeResult.mean)}, p99: ${formatTime(smallDecodeResult.p99)}`
  )

  // 3. 編碼中等物件
  console.log('📊 Testing Medium Object Encoding...')
  const mediumEncodeResult = await measure(
    'Encode Medium Object (~500 bytes)',
    () => {
      encode(mediumObject)
    },
    { iterations: 50000, warmup: 500 }
  )
  results.push(mediumEncodeResult)
  const mediumEncoded = encode(mediumObject)
  console.log(
    `  ✓ Mean: ${formatTime(mediumEncodeResult.mean)}, Size: ${mediumEncoded.length} bytes`
  )

  // 4. 解碼中等物件
  console.log('📊 Testing Medium Object Decoding...')
  const mediumDecodeResult = await measure(
    'Decode Medium Object (~500 bytes)',
    () => {
      decode(mediumEncoded)
    },
    { iterations: 50000, warmup: 500 }
  )
  results.push(mediumDecodeResult)
  console.log(
    `  ✓ Mean: ${formatTime(mediumDecodeResult.mean)}, p99: ${formatTime(mediumDecodeResult.p99)}`
  )

  // 5. 編碼大物件
  console.log('📊 Testing Large Object Encoding...')
  const largeEncodeResult = await measure(
    'Encode Large Object (~20KB)',
    () => {
      encode(largeObject)
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(largeEncodeResult)
  const largeEncoded = encode(largeObject)
  console.log(`  ✓ Mean: ${formatTime(largeEncodeResult.mean)}, Size: ${largeEncoded.length} bytes`)

  // 6. 解碼大物件
  console.log('📊 Testing Large Object Decoding...')
  const largeDecodeResult = await measure(
    'Decode Large Object (~20KB)',
    () => {
      decode(largeEncoded)
    },
    { iterations: 5000, warmup: 50 }
  )
  results.push(largeDecodeResult)
  console.log(
    `  ✓ Mean: ${formatTime(largeDecodeResult.mean)}, p99: ${formatTime(largeDecodeResult.p99)}`
  )

  // 7. 編碼深層嵌套物件
  console.log('📊 Testing Deeply Nested Object Encoding...')
  const nestedEncodeResult = await measure(
    'Encode Deeply Nested Object',
    () => {
      encode(nestedObject)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(nestedEncodeResult)
  const nestedEncoded = encode(nestedObject)
  console.log(
    `  ✓ Mean: ${formatTime(nestedEncodeResult.mean)}, Size: ${nestedEncoded.length} bytes`
  )

  // 8. 解碼深層嵌套物件
  console.log('📊 Testing Deeply Nested Object Decoding...')
  const nestedDecodeResult = await measure(
    'Decode Deeply Nested Object',
    () => {
      decode(nestedEncoded)
    },
    { iterations: 100000, warmup: 1000 }
  )
  results.push(nestedDecodeResult)
  console.log(
    `  ✓ Mean: ${formatTime(nestedDecodeResult.mean)}, p99: ${formatTime(nestedDecodeResult.p99)}`
  )

  // 9. 完整循環（編碼 + 解碼）
  console.log('📊 Testing Complete Round-Trip (encode + decode)...')
  const roundTripResult = await measure(
    'Round-Trip (encode + decode)',
    () => {
      const encoded = encode(mediumObject)
      decode(encoded)
    },
    { iterations: 50000, warmup: 500 }
  )
  results.push(roundTripResult)
  console.log(
    `  ✓ Mean: ${formatTime(roundTripResult.mean)}, p99: ${formatTime(roundTripResult.p99)}`
  )

  // 10. 數組編碼
  console.log('📊 Testing Array Encoding...')
  const arrayData = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random(),
  }))
  const arrayEncodeResult = await measure(
    'Encode Array (100 items)',
    () => {
      encode(arrayData)
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(arrayEncodeResult)
  const arrayEncoded = encode(arrayData)
  console.log(`  ✓ Mean: ${formatTime(arrayEncodeResult.mean)}, Size: ${arrayEncoded.length} bytes`)

  // 11. 數組解碼
  console.log('📊 Testing Array Decoding...')
  const arrayDecodeResult = await measure(
    'Decode Array (100 items)',
    () => {
      decode(arrayEncoded)
    },
    { iterations: 10000, warmup: 100 }
  )
  results.push(arrayDecodeResult)
  console.log(
    `  ✓ Mean: ${formatTime(arrayDecodeResult.mean)}, p99: ${formatTime(arrayDecodeResult.p99)}`
  )

  // 生成報告
  console.log('\n📈 Performance Report\n')
  console.log(generateReport(results))

  // 輸出統計摘要
  console.log('\n📊 Summary Statistics')
  console.log('─'.repeat(50))

  const avgMean = results.reduce((sum, r) => sum + r.mean, 0) / results.length
  const encodeResults = results.filter((r) => r.name.includes('Encode'))
  const decodeResults = results.filter((r) => r.name.includes('Decode'))

  const avgEncodeMean =
    encodeResults.reduce((sum, r) => sum + r.mean, 0) / (encodeResults.length || 1)
  const avgDecodeMean =
    decodeResults.reduce((sum, r) => sum + r.mean, 0) / (decodeResults.length || 1)

  console.log(`Overall Average Mean: ${formatTime(avgMean)}`)
  console.log(`Average Encoding: ${formatTime(avgEncodeMean)}`)
  console.log(`Average Decoding: ${formatTime(avgDecodeMean)}`)

  // 性能評估
  console.log('\n✅ Performance Assessment')
  console.log('─'.repeat(50))

  results.forEach((r) => {
    const status =
      r.mean < 5 ? '✓ Excellent' : r.mean < 20 ? '⚠ Good' : r.mean < 100 ? '⚠ Acceptable' : '✗ Poor'
    console.log(`${r.name}: ${status} (${formatTime(r.mean)})`)
  })

  // 序列化效率分析
  console.log('\n📊 Serialization Efficiency Analysis')
  console.log('─'.repeat(50))

  const smallJSON = JSON.stringify(smallObject)
  const mediumJSON = JSON.stringify(mediumObject)
  const largeJSON = JSON.stringify(largeObject)

  console.log(
    `Small Object: JSON=${smallJSON.length} bytes, CBOR=${smallEncoded.length} bytes (${((smallEncoded.length / smallJSON.length) * 100).toFixed(1)}%)`
  )
  console.log(
    `Medium Object: JSON=${mediumJSON.length} bytes, CBOR=${mediumEncoded.length} bytes (${((mediumEncoded.length / mediumJSON.length) * 100).toFixed(1)}%)`
  )
  console.log(
    `Large Object: JSON=${largeJSON.length} bytes, CBOR=${largeEncoded.length} bytes (${((largeEncoded.length / largeJSON.length) * 100).toFixed(1)}%)`
  )
}

runCBORBenchmarks().catch(console.error)
