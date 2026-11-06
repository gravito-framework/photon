# Photon source benchmark (A10)

Run from `packages/photon` with Bun **1.4.4**, Git, tar, and the engine package's installed dependencies:

```sh
bun scripts/benchmark.ts
# Optional new output directory (must not already exist):
bun scripts/benchmark.ts /tmp/photon-benchmark-results
# Diagnostic experiments in temporary copies; never modifies product source:
bun scripts/benchmark-investigate.ts /tmp/photon-benchmark-investigation
```

The runner compares the independent engine at extraction commit
`89f81ea04d4447f5ce64b44219b34dc6bb8c1c17` with the current checkout. Set
`PHOTON_BENCHMARK_BASELINE` to another independent-engine commit in this repository
when needed. It extracts `packages/photon` using `git archive`, copies the identical
worker into that archive, and shares the installed package-local dependencies through
a temporary symlink. No Gravito checkout, root workspace or historical framework
source is required. Default output is `artifacts/benchmark-<timestamp>`.
This is a source-engine comparison, not an isolated installation or tarball benchmark;
release fixtures cover those separately. Temporary files are removed on failure.

Each of standard text route, one async global middleware (with a response header), and
raw fast GET returns status 200/body `OK`. Every request asserts status/body; middleware
also checks its header and its first invocation count before timing. Assertions and full
body consumption are included in measured latency. Failure during warmup aborts; measured
errors are counted and cause nonzero exit. Speed is never a test assertion.

The two transports are reported separately:

- **In-process:** `app.fetch(new Request(...))`; 20,000 warmup requests followed by
  100,000 measured requests per process.
- **Socket:** `Bun.serve(app.serveConfig({ hostname: '127.0.0.1', port: 0 }))` and Bun fetch
  over loopback; 2,000 warmup and 10,000 measured requests per process. The server and
  client run in the same process. Fast GET uses Bun's native routes map. Servers stop in
  `finally`.

Both use concurrency **1**, five rounds, and `NODE_ENV=production`. Every workload starts
in a fresh process; baseline/current order alternates by round. These are sequential
request latency measurements, not saturation/load capacity tests. Output includes all
rounds, throughput, nearest-rank p50/p95/p99 in milliseconds, errors, source implementation
fingerprints, OS/CPU/Bun, SHA, worktree diff/status, dependency-lock hash, exact commands and
exit codes, and copies of the executed scripts. Retain results from repeated runs instead
of selecting the best round. Default output directories have a timestamp.

## 2026-11-05 measurement

Historical Gravito SHA `ae0db3aa40ff91435065a8e739d6a027339eb8fa` vs `7539ff8` plus recorded working-tree changes, Bun 1.4.4 on the same
Apple Silicon macOS machine. Full evidence lives in
`.scratch/photon-independence/evidence/story09/benchmark-quiet/` outside the monorepo root;
`benchmark-report.md` beside it contains **every** measured round and latency percentile.
The earlier `benchmark/` run is also retained, including its lower 2,000/10,000 in-process
load and substantial background contention; its numbers are not mixed into this table.

| Transport | Workload | Old median req/s | Current median req/s | Change |
| --- | --- | ---: | ---: | ---: |
| In-process | Standard | 751,803 | 522,533 | -30.5% |
| In-process | Middleware | 627,716 | 433,968 | -30.9% |
| In-process | Fast | 1,832,107 | 1,693,481 | -7.6% |
| Socket | Standard | 29,373 | 26,768 | -8.9% |
| Socket | Middleware | 29,045 | 25,466 | -12.3% |
| Socket | Fast | 29,752 | 29,743 | -0.03% |

All 60 comparison rounds had zero errors. In-process regression is real in this workload;
independence does not imply a speed improvement. Socket ranges overlap broadly, including
one current standard round at 10,530 req/s, so this run does not establish a precise
network-throughput penalty. Shared-machine scheduling, GC and loopback client cost remain
part of this measurement; the median is not a confidence interval.

## Regression investigation and correctness tradeoff

`benchmark-investigate.ts` makes temporary copies and measures three individual ablations
against the unmodified current implementation, with the same five-round in-process load.
These variants are diagnostic only: they intentionally remove correctness behavior and
must never be shipped. All source variants and 60 results are saved under
`benchmark-investigation/`.

- **Response header merge:** the new `BunContext.res` setter constructs/merges Headers so
  middleware headers survive raw or mounted responses, including immutable response
  headers. Replacing it with a plain assignment raised median standard throughput by
  about 23% and middleware by 16%. This is the largest measured contributor.
- **Pending middleware completion:** `executeChain` tracks and settles downstream calls
  before returning a pooled Context. Omitting settlement raised standard throughput by
  about 3% and middleware by 7%. Removing it risks response/context reuse before downstream
  work finishes (including unawaited `next()`); the correctness contract takes priority.
- **Fast error boundary:** fast fetch now awaits the handler inside an error boundary to
  turn synchronous and asynchronous failures into HTTP 500. Bypassing that boundary raised
  fast throughput by about 11%. Socket fast routes additionally check literal path/method
  before dispatch, preserving the defined fast-route semantics.

These isolated effects are not additive and do not identify every nanosecond of the
old/new difference. They give direct experimental support for the principal new hot-path
costs, alongside the source changes and correctness tests. This release retains the
correctness behavior and reports the slowdown. Future optimization needs the same
contracts and repeat measurements; there is no unexplained claim of speedup or arbitrary
RPS release gate.
