import { cp, readdir } from 'node:fs/promises'
import path from 'node:path'
import { StaticSiteGenerator } from '@gravito/prism'
import { app } from './src/server/index'

/**
 * Photon Static Site Builder
 * Uses the Prism SSG engine to crawl and export routes.
 */
async function build() {
  console.log('🚀 Starting Photon Static Build (SSG)...')

  const outputDir = path.join(process.cwd(), 'dist/static')

  // Initialize SSG with the app instance
  // The app instance (Gravito) is compatible with PlanetCore interface expected by SSG
  const appInstance = app as any

  // Ensure logger exists (it might not be initialized if not booted)
  if (!appInstance.logger) {
    appInstance.logger = {
      info: (msg: string) => console.log('\x1b[36m%s\x1b[0m', msg), // Cyan
      warn: (msg: string) => console.warn('\x1b[33m%s\x1b[0m', msg), // Yellow
      error: (msg: string, err: any) => console.error('\x1b[31m%s\x1b[0m', msg, err), // Red
      debug: () => {},
    }
  }

  // Ensure adapter exists for fetch calls
  if (!appInstance.adapter && appInstance.fetch) {
    // Gravito binds fetch, but SSG uses core.adapter.fetch
    // We can proxy it
    appInstance.adapter = {
      fetch: appInstance.fetch.bind(appInstance),
    }
  }

  // Ensure config exists for IncrementalBuilder
  if (!appInstance.config) {
    appInstance.config = {
      get: (key: string, defaultValue: any) => {
        if (key === 'VIEW_DIR') {
          return 'src/views'
        }
        return defaultValue
      },
      has: (key: string) => key === 'VIEW_DIR',
    }
  }

  const ssg = new StaticSiteGenerator(appInstance)

  // 1. Dynamic Docs Routes
  // Scan the docs directory recursively to support multiple languages
  console.log('🔍 Scanning for documentation files...')
  const docsRoot = path.join(process.cwd(), 'src/server/data/docs')

  // Get all language directories (e.g., 'en', 'zh-TW')
  const dirents = await readdir(docsRoot, { withFileTypes: true })
  const langDirs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)

  const docRoutes: string[] = []

  for (const lang of langDirs) {
    const langDir = path.join(docsRoot, lang)
    const files = await readdir(langDir)

    // Filter for JSON files
    const validFiles = files.filter((f) => f.endsWith('.json'))

    // Add localized root for docs (redirects to intro)
    docRoutes.push(`/${lang}/docs`)

    validFiles.forEach((file) => {
      const slug = file.replace('.json', '')

      // If language is English, we support the root /docs/:slug path
      if (lang === 'en') {
        docRoutes.push(`/docs/${slug}`)
      }

      // We always support the explicit localized path /:lang/docs/:slug
      docRoutes.push(`/${lang}/docs/${slug}`)
    })
  }

  console.log(
    `📄 Discovered ${docRoutes.length} documentation routes across ${langDirs.length} languages.`
  )

  // 2. Legal Routes (Static)
  const legalRoutes = ['privacy', 'terms'].map((p) => `/legal/${p}`)

  // 3. Core Pages
  const coreRoutes = ['/', '/ecosystem', '/patterns']

  // 4. Localized Variants
  // We want to generate /zh-TW, /zh-TW/ecosystem, /zh-TW/legal/privacy etc.
  // We exclude 'en' because it's the default locale mapped to root paths.
  const localizedRoutes: string[] = []
  const nonDefaultLangs = langDirs.filter((l) => l !== 'en')

  nonDefaultLangs.forEach((lang) => {
    // Root
    localizedRoutes.push(`/${lang}`)

    // Core pages (excluding root)
    ;['ecosystem', 'patterns'].forEach((page) => {
      localizedRoutes.push(`/${lang}/${page}`)
    })

    // Legal pages
    ;['privacy', 'terms'].forEach((page) => {
      localizedRoutes.push(`/${lang}/legal/${page}`)
    })
  })

  // Combine manual dynamic routes
  const extraPaths = [...coreRoutes, ...docRoutes, ...legalRoutes, ...localizedRoutes]

  // Export content
  // This will crawl all GET routes, render them to HTML, and generate Sitemap + Robots.txt
  // The 'extraPaths' are merged into the crawlers queue and will be present in the sitemap.
  const baseUrl = (
    process.env.BASE_URL ||
    process.env.CF_PAGES_URL ||
    'https://photon.gravito.dev'
  ).replace(/\/$/, '')

  try {
    await ssg.exportIncremental(outputDir, {
      baseUrl,
      incremental: true,
      extraPaths,
    })
  } catch (err) {
    console.error('❌ CRITICAL SSG ERROR:', err)
  }

  // Manual fallback for sitemap.xml and robots.txt if SSG failed to generate them
  const { existsSync } = await import('node:fs')
  const { writeFile } = await import('node:fs/promises')

  if (!existsSync(path.join(outputDir, 'sitemap.xml'))) {
    console.warn('⚠️ SSG failed to generate sitemap.xml. Generating manually...')
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${extraPaths
  .map((route) => {
    const loc = `${baseUrl}${route === '/' ? '' : route}`
    return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  })
  .join('\n')}
</urlset>`.trim()
    await writeFile(path.join(outputDir, 'sitemap.xml'), sitemap, 'utf-8')
    console.log('✅ Manual sitemap.xml generated.')
  }

  if (!existsSync(path.join(outputDir, 'robots.txt'))) {
    console.warn('⚠️ SSG failed to generate robots.txt. Generating manually...')
    const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`.trim()
    await writeFile(path.join(outputDir, 'robots.txt'), robots, 'utf-8')
    console.log('✅ Manual robots.txt generated.')
  }

  console.log('✅ Build complete.') // 3. Copy Public Assets
  console.log('📦 Copying public assets...')
  const publicDir = path.join(process.cwd(), 'public')
  try {
    // SSG might have created a directory named 'favicon.svg' if it crawled it as a route
    // We need to remove it so we can copy the actual file
    const faviconDir = path.join(outputDir, 'favicon.svg')
    const { rm } = await import('node:fs/promises')
    try {
      await rm(faviconDir, { recursive: true, force: true })
    } catch (_e) {
      // Ignore if it doesn't exist
    }

    // Using fs cp is safer recursive
    await cp(publicDir, outputDir, { recursive: true })
    console.log('✅ Public assets copied.')
  } catch (e) {
    console.warn('⚠️ Could not copy public assets (directory might be empty or missing):', e)
  }
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
