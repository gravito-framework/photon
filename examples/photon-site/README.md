# ⚡ Photon HTTP Engine Official Site
> **Singularity** Project Code: `photon-site`

The official documentation and showcase website for **@gravito/photon**, the high-performance HTTP engine powering the Gravito Galaxy Architecture.

This site is built using Gravito's own stack to demonstrate performance, type safety, and the "Absolute Zero" overhead philosophy.

---

## 🚀 Features & Architecture

This website is a live benchmark and documentation hub for the Photon engine:

### 1. **Core Engine** (`@gravito/photon`)
- **AOT Routing**: Demonstrates the pre-compiled Radix Tree router with sub-millisecond dispatch.
- **Proxy-less Context**: Pure class instance pooling eliminates Proxy overhead, resulting in 25x faster property access (`ctx.json`, `ctx.req`, etc.).
- **Zero-Copy Performance**: Built to leverage Bun's native HTTP capabilities for maximum throughput.
- **Web Standards**: Native usage of `Request` and `Response` objects.

### 2. **Modern Stack**
- **React + Inertia.js**: Powers the documentation interface for a smooth, single-page application feel without the complexity of a separate API layer.
- **Vite**: Handles the frontend build and HMR (Hot Module Replacement).
- **TailwindCSS**: Utilitarian styling for the "Golden Photon" aesthetic.
- **Three.js / React Three Fiber**: Interactive 3D constellation backgrounds on the home page.

### 3. **Documentation System**
- **JSON-Driven**: Documentation content is stored in structured JSON format for instant, type-safe rendering.
- **I18n Support**: Full support for English (`/en`) and Traditional Chinese (`/zh-TW`) locales.
- **Code Highlighting**: Integrated syntax highlighting for technical examples.

### 4. **Orchestration**
- **PlanetCore Integration**: Manages the application lifecycle and dependency injection.
- **Orbit Modules**: Uses `@gravito/ion` for frontend bridging and `@gravito/prism` for edge-optimized rendering.

---

## 🛠️ Project Structure

```bash
examples/photon-site/
├── src/
│   ├── server/            # Backend (Photon + PlanetCore)
│   │   ├── data/docs/     # Documentation content (JSON)
│   │   └── index.ts       # Entry point & Routes
│   └── client/            # Frontend (React + Inertia)
│       ├── components/    # Reusable UI (Hero, Layout, Canvas)
│       ├── locales/       # Client-side translations
│       └── pages/         # Documentation & Marketing pages
├── public/                # Static assets (Favicon, Redirects)
├── scripts/               # Build and verification scripts
├── vite.config.ts         # Build configuration
└── build-static.ts        # SSG Export script
```

---

## ⚡ Quick Start

### Prerequisites
- **Bun 1.4.4** (also pinned in the repository `.bun-version`)
- **Node.js** (v18+ for build tools)

### Development

```bash
# 1. Enter this independently installed site (no root workspace)
cd examples/photon-site

# 2. Install dependencies after the registry blockers below are resolved
bun install --frozen-lockfile

# 3. Start the development environment
# This launches the backend (Port 3333) and Vite HMR (Port 5173)
bun run dev
```

Visit `http://localhost:3333` to see the site.

### Building for Production

```bash
# Typecheck, then build and verify every documented static route and local asset/link
bun run typecheck
bun run build:check
```

---

## 📄 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)


## Independent repository cutover status

The production origin remains `https://photon.gravito.dev`. The website installs
separately from `packages/photon`; it does not use local workspaces or engine source.
Gravito dependencies are pinned to registry versions in this site's manifest.

**Blocked before cutover (registry checked 2026-11-06 with Bun 1.4.4):**

- `@gravito/photon@3.0.0-beta.1` has not been published. `bun install` fails with
  `No version matching "3.0.0-beta.1" found for specifier "@gravito/photon"`.
- The currently published Prism 4.0.0 peers on Photon `^2.0.0`; Ion 4.0.3 peers
  on Photon `^1.1.0` and Core `^2.0.0`. These ranges do not include the independent
  beta. Compatible Gravito releases and an actual integration check are required.
- This site's existing server imports `serveStatic` from `@gravito/photon/bun`.
  The independent engine does not currently export that path. This must be resolved
  at the integration boundary before a successful site build can be claimed.
- An isolated fixture using the locally packed `gravito-photon-3.0.0-beta.1.tgz`
  installed 208 packages successfully, but `bun run build` failed with
  `Failed to resolve entry for package "@gravito/freeze"` for published Freeze 2.0.0.
  `bun run typecheck` also failed on missing Freeze declarations, the missing Photon
  `/bun` export, and existing optional route parameter/index handling. This is a
  failed integration rehearsal, not proof of registry installation or site compatibility.
- The registry's Photon 2.0.1 is a legacy compatibility wrapper with an unresolved
  `@gravito/resilience@workspace:*` dependency. It cannot validate the new engine.

A diagnostic probe of published Photon 1.1.4 installed, but build and typecheck
failed because it also lacks `@gravito/photon/bun`. Older Photon 1.0.1 advertised
missing dist entry/types and the older Freeze set lacked `asLocale`. These are
failed diagnostics, not the delivered dependency choice or beta validation.

No valid registry lockfile can be generated for an unpublished version. After
publishing the beta and compatible integration packages, run `bun install` here,
review and add this site's own `bun.lock`, then run `bun install --frozen-lockfile`,
`bun run typecheck`, and `bun run build:check`. CI fails explicitly until that
lockfile exists; do not copy an engine or legacy site's lockfile into this directory.

The user selected engine-first delivery. The **Photon Site** workflow is stored at
`docs/deferred/deploy-photon-site.yml`, outside GitHub's active workflow directory.
It runs no checks or deployment in this phase. The existing production deployment
remains in Gravito until site compatibility and registry installation are verified.
When that later cutover is authorized, restore the workflow to `.github/workflows/`;
its checks are site-only and deployment requires a manual run on `main` with `deploy`.
Cloudflare Pages retains project `photon-site` and the existing
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `GA_PHOTON_SITE` secret names.
No deployment or remote configuration has been performed during extraction.
