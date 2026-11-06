# Photon

Independent Bun HTTP engine, prepared for `gravito-framework/photon`.
The candidate **`@gravito/photon@3.0.0-beta.1` has not been published**.
Registry `2.0.1` is the earlier Gravito wrapper, not this independent engine.

## Engine development

Use Bun **1.4.4** and Node **22** with npm for release verification.

```sh
cd packages/photon
bun install --frozen-lockfile --ignore-scripts
bun run build
bun run typecheck
bun test --timeout=10000
bun run verify:release
```

[API and example](packages/photon/README.md) ·
[繁體中文](packages/photon/README.zh-TW.md) ·
[Migration](packages/photon/doc/INDEPENDENCE_MIGRATION.md) ·
[Release verification](packages/photon/doc/RELEASE.md) ·
[Benchmarks](packages/photon/doc/BENCHMARK.md)

## Repository boundaries

- `packages/photon/` has its own manifest and lockfile; no Gravito workspace install.
- `examples/photon-site/` installs separately with registry dependencies. Its blockers
  and cutover prerequisites are recorded in [the runbook](docs/CUTOVER.md).
- Only engine workflows are active in this phase. The site workflow is deferred;
  the existing site deployment remains in Gravito. Site failures do not block engine publication.
- `@gravito/photon-gravito` remains in Gravito, which owns integration tests.

There is deliberately no root Bun workspace: website dependencies must not enter the
engine install, lockfile or release gate. Run commands from the selected package.

[Repository decision](docs/adr/0002-photon-independent-repository.md) ·
[History and cutover](docs/CUTOVER.md)
