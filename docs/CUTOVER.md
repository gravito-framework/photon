# Photon repository cutover

## Prepared local source

Source: `gravito-framework/gravito` at `e045d3bf764bab212444e426bd8fc0cf375d22e3`.
Filtered tip: `89f81ea04d4447f5ce64b44219b34dc6bb8c1c17`.
This is a separate clone. The source repository and its uncommitted changes are preserved.
Migration changes remain uncommitted. No remote, publication or deployment was created.

History was extracted with `git-filter-repo` from a full non-shared local clone,
keeping these paths without renaming:

- `packages/photon/`
- `examples/photon-site/`
- `.github/workflows/photon-quality.yml`
- `.github/workflows/deploy-photon-site.yml`
- `docs/adr/0001-photon-independent-engine.md`
- `GLOSSARY.md`

All five source commits are represented in [the commit map](history/commit-map.txt).
IDs changed because unrelated trees were removed; authors, dates and messages remain.
No monorepo tags or remote refs were imported. The original repository remains the
reference for unrelated history, issues and PRs. Bun 1.4.4 settings and the accepted
ADR were applied after extraction.

## Engine publication

The candidate is `3.0.0-beta.1`; package name and current public exports are unchanged.
Registry `2.0.1` is a different, older wrapper. Never overwrite that version or use it
as evidence for this candidate.

`Photon engine` runs source isolation, build, types, tests, tarball consumer checks,
HTTP contracts, publint and npm pack dry-run. Source and release staging use the
package-local frozen lockfile. Workflow evidence records the tested source SHA.
Configure required checks without requiring the site check on engine-only PRs;
path-filtered workflows may remain pending if set as unconditional required checks.
Verify actual branch rules after remote creation.

`Publish Photon` is manual, restricted to this repository's `main`, with an `npm`
environment and `NPM_TOKEN` secret. It validates the beta/stable channel and publishes
the exact tarball that passed the gate, with provenance. It never installs the site.
Set environment protection and publication access before enabling it. Credential values
are not copied into the repository.

## Engine-first scope

The user selected engine-first delivery on 2026-11-06. Website source/history are
retained, but its workflow is parked at `docs/deferred/deploy-photon-site.yml`.
No website job or deployment runs in the new repository during this phase. The
current site deployment stays in Gravito. Site compatibility is a later work item,
not an engine repository or engine publication gate.

## Ordered cutover (external steps not executed)

1. Review and commit migration changes after authorization. Create public
   `gravito-framework/photon` and push the filtered history after authorization.
   Audit retained history before public push.
2. Verify engine CI on that remote SHA, configure permissions and release credentials,
   then authorize and dispatch publication with channel `beta`. Verify the registry
   tarball integrity, version, exports and dependency tree.
3. In a separate Gravito change, set integration's peer to the exact beta and run its
   installed-package HTTP/lifecycle fixtures against registry artifacts. Update consumers
   of removed Photon framework exports; replacing `workspace:*` alone is insufficient.
4. **Deferred website phase:** validate the site against the beta or stable engine
   and compatible published Gravito dependencies.
   Existing source imports removed `@gravito/photon/bun`; published framework peers
   target older Photon versions. Keep original site deployment until these issues and
   its registry lockfile are resolved. Do not substitute legacy Photon as beta evidence.
5. After engine and Gravito integration acceptance (independently of deferred step 4),
   prepare `3.0.0`, rerun the engine gate and authorize manual
   publication with channel `latest`. Verify a clean registry consumer before switching
   Gravito to stable.
6. Remove original `packages/photon`, its quality workflow and Photon release gate
   only after all engine consumers can use the verified registry replacement. Keep
   the original website source/deployment until its separate cutover is verified. Update
   manifests, lockfile, Changesets/release scripts, docs and affected tests. Keep
   `packages/photon-gravito` in Gravito. No mirror, submodule or second publisher.
7. Retain Cloudflare Pages project `photon-site` and domain `photon.gravito.dev`.
   In the later website phase, restore the deferred workflow and configure named
   Cloudflare secrets in the new repo; stop the old deployment workflow
   before enabling the new one. Verify preview, then live pages, locales, assets and links.

Briefly freeze Photon changes during actual handover. Local preparation does not freeze
contributors remotely.

## Failure and rollback

Before cutover, failed checks leave original source and deployment in service.
After beta publication, retain that immutable version and fix forward with another beta;
never overwrite or silently move `latest`. Registry `2.0.1` is not a rollback to the
independent local snapshot. A failed site deployment can revert to the previously
verified Pages artifact under separate authorization. Do not restore a second publisher.

## Acceptance evidence

Local engine logs/artifacts: `../.scratch/photon-repository/` outside this repository.
GitHub execution, registry beta pairing, credentials, branch rules, shared runner quota
and live website behavior remain unverified until their authorized external steps run.
