import { readFile, rm, writeFile } from 'node:fs/promises'
import { build } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist only if not DTS-only to avoid race conditions with parallel builds
if (!isDtsOnly) {
  await rm('dist', { recursive: true, force: true })
}

/**
 * Workaround for Bun bundler bug in v1.3.10:
 * When using splitting: true with multiple entrypoints, bun build may emit
 * dist/index.js that exports symbols (e.g. Photon) without importing them
 * from their corresponding chunk files.
 *
 * This post-build patch detects missing imports in dist/index.js and adds them.
 * Specifically: Photon is defined in dist/photon.js but missing from dist/index.js imports.
 */
async function patchPhotonIndexImport() {
  const indexPath = 'dist/index.js'
  const content = await readFile(indexPath, 'utf-8')

  // Check if Photon is exported but not imported
  const hasPhotonExport = content.includes('  Photon,') || content.includes('  Photon\n')
  const hasPhotonImport =
    content.includes('import { Photon }') || content.includes('import{Photon}')

  if (hasPhotonExport && !hasPhotonImport) {
    // Insert import after the last chunk import line
    const patched = content.replace(
      'import"./chunk-v0bahtg2.js";',
      'import"./chunk-v0bahtg2.js";\nimport { Photon } from "./photon.js";'
    )
    await writeFile(indexPath, patched, 'utf-8')
    console.log('  ✓ Patched dist/index.js: added missing Photon import from photon.js')
  }
}

// Parallel build: JS/TS and type declarations can run simultaneously
// since they output to different directories
async function buildInParallel() {
  if (isDtsOnly) {
    console.log('📝 Generating type declarations only...')
  } else {
    console.log('🔨 Building JS and type declarations in parallel...')
  }

  const tempDir = 'dist'

  // Start both processes in parallel
  const tasks: Promise<number>[] = []

  // Task 1: bun build (JS/TS)
  if (!isDtsOnly) {
    const buildPromise = (async () => {
      const buildResult = await build({
        entrypoints: [
          'src/index.ts',
          'src/photon.ts',
          'src/native.ts',
          'src/client.ts',
          'src/logger.ts',
          'src/jwt.ts',
          'src/http-exception.ts',
          'src/middleware/binary.ts',
          'src/middleware/circuit-breaker.ts',
          'src/middleware/htmx.ts',
          'src/middleware/otel.ts',
          'src/middleware/ratelimit-redis.ts',
          'src/middleware/ratelimit.ts',
          'src/middleware/security/index.ts',
          'src/middleware/security/body-size-limit.ts',
          'src/middleware/security/cors.ts',
          'src/middleware/sse.ts',
          'src/middleware/streaming.ts',
          'src/middleware/websocket.ts',
          'src/adapter/cloudflare.ts',
          'src/adapter/deno.ts',
          'src/adapter/index.ts',
          'src/adapter/vercel.ts',
          'src/router/reg-exp-router.ts',
          'src/router/trie-router.ts',
        ],
        outdir: 'dist',
        root: 'src',
        format: 'esm',
        target: 'node',
        splitting: true,
        minify: process.env.NODE_ENV === 'production',
        sourcemap: 'external',
        external: ['@gravito/core', '@gravito/photon', 'hono', 'zod', 'cborg'],
      })

      if (!buildResult.success) {
        console.error('❌ JS/TS build failed:', buildResult.logs)
        return 1
      }
      return 0
    })()
    tasks.push(buildPromise)
  }

  // Task 2: tsc (type declarations)
  const tscPromise = (async () => {
    const tsc = Bun.spawn(['bunx', 'tsc', '-p', 'tsconfig.build.json', '--outDir', tempDir], {
      stdout: 'inherit',
      stderr: 'inherit',
      cwd: import.meta.dirname,
    })
    return await tsc.exited
  })()
  tasks.push(tscPromise)

  // Wait for all tasks to complete
  const results = await Promise.all(tasks)

  // Check if any task failed
  for (const result of results) {
    if (result !== 0) {
      process.exit(1)
    }
  }
}
// Execute parallel build
await buildInParallel()

// Apply post-build patch for Bun v1.3.10 bundler bug (missing Photon import in index.js)
if (!isDtsOnly) {
  await patchPhotonIndexImport()
}

console.log('✅ Photon build completed')
