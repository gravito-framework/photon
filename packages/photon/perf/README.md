# Photon Performance Benchmarks

Performance testing suite for @gravito/photon HTTP engine.

## 📋 Overview

This directory contains performance benchmarks organized in 4 phases:

### Phase 1: Micro-Benchmarks (Current)
- **Router Matching**: Static, dynamic, regex, wildcard routes
- **Token Validation**: Time-safe comparison, JWT verification
- **CBOR Serialization**: Encoding/decoding various object sizes
- **Middleware Chain**: Overhead analysis for middleware layers

### Phase 2: Unit Performance Tests (Planned)
- Individual middleware component performance
- Security middleware overhead (CORS, CSRF, Rate Limit)
- Streaming middleware efficiency

### Phase 3: Integration Tests (Planned)
- End-to-end request throughput
- Latency percentiles (p50, p95, p99)
- Concurrent request handling
- Memory usage profiling

### Phase 4: Stress Tests (Planned)
- Sustained load testing
- Memory leak detection
- Rate limit accuracy under high load
- Connection pool exhaustion

## 🚀 Running Benchmarks

### Run All Micro-Benchmarks
```bash
cd packages/photon
bun perf/micro-benchmarks/*.perf.ts
```

### Run Individual Benchmark
```bash
# Router performance
bun perf/micro-benchmarks/router.perf.ts

# Token validation
bun perf/micro-benchmarks/token-validation.perf.ts

# CBOR serialization
bun perf/micro-benchmarks/cbor-serialization.perf.ts

# Middleware chain
bun perf/micro-benchmarks/middleware-chain.perf.ts
```

### Run with Custom Options
```bash
# Run specific benchmark with environment variables
DEBUG=1 bun perf/micro-benchmarks/router.perf.ts

# Run with increased iterations (slower but more accurate)
ITERATIONS=100000 bun perf/micro-benchmarks/token-validation.perf.ts
```

## 📊 Understanding Results

### BenchmarkResult Structure
```typescript
interface BenchmarkResult {
  name: string           // Benchmark name
  iterations: number     // Number of test runs
  duration: number       // Total execution time (ms)
  min: number           // Minimum duration (μs)
  max: number           // Maximum duration (μs)
  mean: number          // Average duration (μs)
  median: number        // Median duration (μs)
  stdDev: number        // Standard deviation (μs)
  p95: number           // 95th percentile (μs)
  p99: number           // 99th percentile (μs)
  throughput: number    // Operations per second
}
```

### Performance Grades
- **Excellent** (✓): < 1μs or < 10μs depending on operation
- **Good** (⚠): < 5μs or < 50μs depending on operation
- **Poor** (✗): Above good threshold

### Key Metrics to Monitor
1. **Mean**: Average operation duration
2. **p99**: 99th percentile (99% of operations complete within this time)
3. **Throughput**: Operations per second
4. **Standard Deviation**: Consistency of performance

## 📈 Interpreting Reports

### Router Performance Report
```
| Benchmark | Mean | Median | Min | Max | StdDev | p95 | p99 | Throughput |
|-----------|------|--------|-----|-----|--------|-----|-----|-----------|
| Static Route Matching | 0.05μs | 0.04μs | 0.02 | 1.23 | 0.08 | 0.12μs | 0.25μs | 20000000 |
```

**Interpretation**:
- Static routes match in ~0.05μs (excellent)
- 99% of matches complete within 0.25μs
- Can handle ~20M route matches per second

### Token Validation Report
```
| Time-Safe Compare (same) | 1.2μs | 1.1μs | 0.8 | 5.2 | 0.3 | 1.8μs | 2.5μs | 833333 |
```

**Interpretation**:
- Token comparison takes ~1.2μs
- Even with timing attacks in mind, still very fast
- Can validate ~833k tokens per second

## 🔧 Customizing Benchmarks

### Adjust Iterations
Edit the benchmark file and modify the `iterations` parameter in `measure()` calls:
```typescript
const result = await measure('Test', fn, {
  iterations: 50000,  // Lower for slower operations
  warmup: 100         // Increase for consistent JIT optimization
})
```

### Change Warmup Iterations
More warmup helps stabilize JIT compilation:
```typescript
const result = await measure('Test', fn, {
  iterations: 10000,
  warmup: 1000  // Increase if results are inconsistent
})
```

### Add Custom Benchmarks
```typescript
import { measure, generateReport, formatTime } from '../utils'

async function customBenchmark() {
  const result = await measure(
    'My Custom Test',
    () => {
      // Your test code here
    },
    { iterations: 10000, warmup: 100 }
  )

  console.log(`Result: ${formatTime(result.mean)}`)
  console.log(generateReport([result]))
}

customBenchmark().catch(console.error)
```

## 📊 Baseline Management

### Creating a Baseline
After running benchmarks, save the results:
```bash
bun perf/micro-benchmarks/router.perf.ts > perf/baselines/v1.1.0-router.txt
```

### Comparing with Baseline
```typescript
import { compareResults } from '../utils'

const baseline = { mean: 0.05 } // From previous run
const current = { mean: 0.08 }   // Current run

const diff = compareResults(baseline, current)
console.log(`Performance change: ${diff.meanDiff.toFixed(1)}%`)
```

## ⚙️ System Requirements

- **Bun 1.0+**: Required for performance testing
- **Node.js 18+**: For some utility functions
- **4GB+ RAM**: For stress tests
- **Isolated Environment**: Close other applications for accurate results

## 🎯 Performance Targets (Phase 1)

| Component | Target | Notes |
|-----------|--------|-------|
| Router Matching (static) | <0.1μs | Fast-path routing |
| Router Matching (dynamic) | <0.5μs | Parameter extraction |
| Token Validation | <2μs | Time-safe comparison |
| CBOR Encode (small) | <1μs | < 100 bytes |
| CBOR Decode (small) | <1μs | < 100 bytes |
| Middleware Chain (10 layers) | <5μs | Per-layer overhead |

## 📝 Tips for Accurate Benchmarking

1. **Warmup is Important**: Always warmup before measuring to stabilize JIT compilation
2. **Run Multiple Times**: Run benchmarks 2-3 times to ensure consistency
3. **Close Other Applications**: Background processes can affect results
4. **Avoid System Load**: Run when system is idle
5. **Monitor Consistency**: Check stdDev; high variance indicates unstable results
6. **Use Proper Iterations**: Increase iterations for micro-second operations
7. **Account for Noise**: Sub-microsecond differences may be measurement noise

## 🔍 Debugging Performance Issues

### High Standard Deviation?
- Increase warmup iterations
- Reduce other system load
- Increase benchmark iterations
- Check for GC pauses during test

### Unexpectedly Slow Results?
- Check if function is being optimized by JIT
- Verify test isolation (no side effects)
- Increase iterations to reduce overhead allocation cost
- Profile with native tools (flamegraph, etc.)

### Memory Issues?
```typescript
// Use testMemoryLeak for leak detection
import { testMemoryLeak } from '../utils'

const result = await testMemoryLeak(async () => {
  // Your code
}, 10000)

console.log(`Leaked: ${result.leaked}MB (${result.percentGrowth}%)`)
```

## 📚 Further Reading

- [Bun Performance Guide](https://bun.sh/docs/runtime/performance)
- [Hono Benchmarks](https://github.com/honojs/hono)
- [CBOR Specification](https://tools.ietf.org/html/rfc7049)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

## 📋 Phase 1 Completion Checklist

- [x] Set up perf directory structure
- [x] Implement performance utilities (utils.ts)
- [x] Create router benchmarks
- [x] Create token validation benchmarks
- [x] Create CBOR serialization benchmarks
- [x] Create middleware chain benchmarks
- [x] Generate performance report
- [ ] Document baseline values
- [ ] Set up CI integration (Phase 2)
- [ ] Create performance regression detection (Phase 2)
