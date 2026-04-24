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
- **Bun** (v1.0+)
- **Node.js** (v18+ for build tools)

### Development

```bash
# 1. Install dependencies
bun install

# 2. Start the development environment
# This launches the backend (Port 3333) and Vite HMR (Port 5173)
bun run dev
```

Visit `http://localhost:3333` to see the site.

### Building for Production

```bash
# Full build: Client + Static Generation + Sitemap
bun run build
```

---

## 📄 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
