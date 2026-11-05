# Independent Photon release rehearsal

From `packages/photon`, with Bun **1.4.4** and Node/npm installed:

```sh
bun run build
bun run typecheck
bun test --timeout=10000
PHOTON_RELEASE_ARTIFACTS=/absolute/output/directory bun run verify:release
```

The output directory is optional (default: a new temporary evidence directory).
Use a fresh directory per checkpoint. It contains `results.json` with runtime and
exit codes, individual command logs, the tarball and npm's JSON file inventory.
A failed command stops the gate with a nonzero exit; its log and partial results remain.
Fix the cause and rerun into a new directory. Temporary source/consumer directories
are removed in `finally`; the original package's dist is never used by this gate.
Do not treat a partial run or a retained tarball from a failed run as accepted.

| Acceptance | Executable evidence |
| --- | --- |
| A1 | `test:source-isolation`: repo-external source install/build/typecheck/test, forbidden framework/workspace dependency check |
| A2/A3 | `test:standalone`: clean build/pack/install, dependency/link/declaration audit, all exports, strict consumer compilation with explicit TS/Bun types; expected invalid API diagnostics |
| A4/A5/A6 | `test:contracts`: same 40 contracts against an installed tarball, strict types, real socket requests and failure cleanup; standard/fast error and middleware behavior |
| A8 | `test:standalone` public fixture: retained Hono compatibility imports/types/handler checks and expected Deno rejection; platform deployments untested |
| A9 | `verify:release`: the preceding gates, extracted English/Chinese README examples (strict compile and real sockets), pinned publint 0.3.18 `--strict`, clean pack, npm dry-run inventory |
| A10 | Separate `benchmark` command and [methodology](BENCHMARK.md); timing is not a correctness assertion |

The consumer first verifies OTel is physically absent, then tests the no-op fallback.
Invalid types must fail with the expected diagnostics; a subsequent valid HTTP request
must still work after an application error. Socket servers close on failed assertions.
Dependencies are installed in isolated directories, not via monorepo node_modules.

The dedicated `photon-quality.yml` CI job runs this rehearsal without a workspace
install or cached dist and uploads evidence even on failure. The existing release
workflow also runs it before Changesets publication. This is a required command in
the workflow; repository branch-protection settings are not changed by this story.
Benchmarks run separately on one quiet machine with both revisions; hosted CI timing
is not an automatic performance approval. Review unexplained regressions before release.

Runtime qualification distinguishes three boundaries:

| Entry | Historical/current Bun import and types | Executable check | Platform status |
| --- | --- | --- | --- |
| Cloudflare | Retained Hono exports; strict consumer types | Handler construction under Bun | Cloudflare deployment untested |
| Vercel | Retained Hono exports; strict consumer types | Hono handler request under Bun | Vercel deployment untested |
| Deno | Retained Hono export; Deno ambient types required | Bun import rejects `Deno is not defined` | Deno runtime untested |

No native Photon support on those platforms is claimed. The migration table owns
export dispositions and framework compatibility. A7 remains pending; historical
framework regression tests do not establish integration package or core version support.
The current package version is not release authorization. This command never runs
`npm publish`. Roll back only the Story09 diff, preserving preceding stories and Bun pins.
