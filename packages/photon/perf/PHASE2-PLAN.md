# Phase 2: Middleware Unit Performance Tests

**Status**: 🚀 Started
**Date Started**: 2026-03-02
**Completion Target**: Week 2-3

---

## 📋 Overview

Phase 2 focuses on measuring the performance of individual middleware components in isolation and when combined. This allows us to understand the overhead of each middleware and identify optimization opportunities.

### Objectives
1. **Quantify middleware overhead** - How much does each middleware cost?
2. **Compare middleware efficiency** - Which middlewares are fast, which are slow?
3. **Identify bottlenecks** - Where are the performance hotspots?
4. **Guide optimization** - Inform design decisions for faster middleware

---

## 🎯 Phase 2 Benchmarks

### 1. Security Middleware (`security.perf.ts`)

**Middlewares Tested**:
- ✅ CORS (Origin checking, header setting)
- ✅ CSRF (Token validation)
- ✅ Security Headers (CSP, HSTS, X-Frame-Options)
- ✅ Body Size Limit (Small, at limit)
- ✅ Header Token Gate (API key validation)

**Tests**: 10 scenarios
**Expected Runtime**: ~30 seconds
**Metrics**:
- Per-middleware overhead
- Combined stack overhead
- Preflight request handling

---

### 2. Rate Limiting (`rate-limit.perf.ts`)

**Middlewares Tested**:
- ✅ Memory Rate Limiter (various limits)
- ✅ Redis Rate Limiter (simulated)
- ✅ Pass vs Reject scenarios
- ✅ Custom key generators
- ✅ Skip conditions

**Tests**: 9 scenarios
**Expected Runtime**: ~40 seconds
**Metrics**:
- Memory vs Redis overhead
- Configuration impact (loose/medium/strict)
- Custom key generation cost

---

### 3. Streaming (`streaming.perf.ts`)

**Middlewares Tested**:
- ✅ Simple Streaming (basic ReadableStream)
- ✅ Server-Sent Events (SSE)
- ✅ JSON Lines format
- ✅ CSV format
- ✅ Large body streaming
- ✅ Backpressure handling

**Tests**: 10 scenarios
**Expected Runtime**: ~60 seconds
**Metrics**:
- Stream initialization cost
- Per-chunk overhead
- Format efficiency (SSE vs JSON Lines vs CSV)
- Backpressure impact

---

### 4. Binary Data (`binary.perf.ts`)

**Middlewares Tested**:
- ✅ CBOR Encoding (small, medium, large)
- ✅ CBOR Decoding (small, medium, large)
- ✅ Content Negotiation
- ✅ Round-trip overhead
- ✅ Data type efficiency

**Tests**: 12 scenarios
**Expected Runtime**: ~50 seconds
**Metrics**:
- Encoding/decoding speed by object size
- Content negotiation overhead
- Compression efficiency (JSON vs CBOR)
- Different data types

---

## 🏃 Running Phase 2 Benchmarks

### Run All Phase 2 Tests
```bash
cd packages/photon

# Run all middleware benchmarks
bun perf/middleware-benchmarks/*.perf.ts

# Or individually
bun perf/middleware-benchmarks/security.perf.ts
bun perf/middleware-benchmarks/rate-limit.perf.ts
bun perf/middleware-benchmarks/streaming.perf.ts
bun perf/middleware-benchmarks/binary.perf.ts
```

### Expected Total Runtime
- All 4 suites: ~3-4 minutes
- Individual suite: 30-60 seconds

---

## 📊 Expected Results Summary

### Security Middleware
| Middleware | Expected Overhead | Assessment |
|-----------|------------------|-----------|
| CORS | <1μs | ✓ Excellent |
| CSRF | <2μs | ✓ Excellent |
| Security Headers | <1μs | ✓ Excellent |
| Body Size Limit | <1μs | ✓ Excellent |
| Header Token Gate | <2μs | ✓ Excellent |
| Combined (4 MW) | <5μs | ✓ Excellent |

### Rate Limiting
| Configuration | Expected Overhead | Assessment |
|--------------|------------------|-----------|
| Memory (1000 req/min) | <1μs | ✓ Excellent |
| Memory (100 req/min) | <1μs | ✓ Excellent |
| Memory (10 req/min) | <1μs | ✓ Excellent |
| Redis (simulated) | <50μs | ⚠ Good |
| Custom Key Gen | <2μs | ✓ Excellent |

### Streaming
| Scenario | Expected Overhead | Assessment |
|----------|------------------|-----------|
| Simple Stream | <10μs | ✓ Excellent |
| SSE (10 msgs) | <100μs | ⚠ Good |
| SSE (100 msgs) | <1ms | ⚠ Good |
| JSON Lines (100) | <200μs | ⚠ Good |
| CSV (100 rows) | <200μs | ⚠ Good |

### Binary Data
| Operation | Expected Overhead | Assessment |
|-----------|------------------|-----------|
| CBOR Encode (small) | <1μs | ✓ Excellent |
| CBOR Decode (small) | <1μs | ✓ Excellent |
| CBOR Encode (medium) | <5μs | ✓ Excellent |
| CBOR Decode (medium) | <2μs | ✓ Excellent |
| Content Negotiation | <1μs | ✓ Excellent |
| Compression ratio | 20-35% | ✓ Excellent |

---

## 🔄 Comparison with Phase 1

### Phase 1 (Micro-benchmarks)
- Focus: Basic operations (routing, tokens, serialization)
- Scale: Single operations, no middleware
- Results: Baseline performance

### Phase 2 (Unit middleware performance)
- Focus: Middleware components in request processing
- Scale: With request context, multiple middleware scenarios
- Results: Real-world overhead measurement

### Phase 3 (Integration performance) - Coming
- Focus: Complete request flows with all middleware
- Scale: End-to-end HTTP transactions
- Results: Total system performance

---

## 📈 Key Metrics to Track

### Per Middleware
- **Initialization overhead**: How much does middleware setup cost?
- **Per-request overhead**: Cost added to each request
- **Configuration impact**: How do options affect performance?
- **Failure cases**: How slow are rejections/errors?

### System Wide
- **Linear scaling**: Does overhead scale linearly with middleware count?
- **Combined effect**: Do middlewares interact negatively?
- **Memory usage**: What's the memory footprint?

---

## 🎯 Success Criteria for Phase 2

- [ ] All 4 middleware benchmark suites created
- [ ] All 41 individual tests pass without errors
- [ ] Average middleware overhead < 5μs
- [ ] No middleware takes > 100μs (except streaming)
- [ ] Establish baseline for each middleware type
- [ ] Generate comprehensive report with recommendations

---

## 💡 Optimization Insights from Phase 2

### Expected Findings
1. **Security middleware is lightweight** (~1-2μs per middleware)
2. **Rate limiting has variable cost** (memory: 1μs, Redis: 50μs)
3. **Streaming overhead depends on format** (10-200μs per chunk)
4. **CBOR is efficient** (sub-microsecond encode/decode)

### Optimization Opportunities
1. **Batch rate limit checks** - Reduce per-request overhead
2. **Cache CORS decisions** - Pre-compute origin checks
3. **Lazy-load large objects** - Stream instead of buffering
4. **Optimize CBOR handling** - Consider native extensions

---

## 📋 File Structure

```
packages/photon/perf/middleware-benchmarks/
├── security.perf.ts           # CORS, CSRF, Headers, Body Size, Token Gate (10 tests)
├── rate-limit.perf.ts         # Memory/Redis rate limiting (9 tests)
├── streaming.perf.ts          # SSE, JSON Lines, CSV streaming (10 tests)
└── binary.perf.ts             # CBOR encoding/decoding (12 tests)
```

---

## 🚀 Next Steps After Phase 2

### Immediate (upon completion)
1. Analyze results and identify bottlenecks
2. Compare against Phase 1 baselines
3. Identify optimization candidates

### Phase 3 Planning
1. Integration performance tests
2. Complete request flow measurement
3. Concurrent request handling
4. Memory leak detection

---

## 📞 Notes for Implementation

### Testing Patterns
- **Baseline comparison**: Always compare to no-middleware baseline
- **Overhead calculation**: `actual_time - baseline_time`
- **Multiple scenarios**: Test pass/fail, light/heavy configs
- **Real-world configs**: Use common configuration patterns

### Measurement Considerations
- Each test has 10k+ iterations for statistical significance
- Warmup iterations minimize JIT compilation variance
- Results in microseconds (μs) for consistency
- Use percentiles (p99) to catch outliers

---

## 🎓 Learning from Phase 2

Phase 2 results will reveal:
1. **Which middlewares are cheap** - Safe to use freely
2. **Which middlewares are expensive** - Require optimization
3. **How middleware stacks scale** - Linear vs exponential
4. **Real-world overhead** - What users will actually see

This knowledge informs:
- Architecture decisions
- Performance tuning
- Documentation
- Future optimizations

---

**Phase 2 Status**: 🚀 In Progress
**Tests Ready**: 4/4 ✅
**Expected Completion**: End of Week 2
