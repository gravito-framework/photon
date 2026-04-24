import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.join(process.cwd(), 'dist/static')

// Improved baseUrl detection
const baseUrl = (
  process.env.BASE_URL ||
  process.env.CF_PAGES_URL ||
  'https://photon.gravito.dev'
).replace(/\/$/, '')

async function generateArtifacts() {
  console.log('🗺️  Generating sitemap.xml and robots.txt manually...')

  const docsRoot = path.join(process.cwd(), 'src/server/data/docs')
  const dirents = await readdir(docsRoot, { withFileTypes: true })
  const langDirs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)

  const docRoutes: string[] = []

  for (const lang of langDirs) {
    const langDir = path.join(docsRoot, lang)
    const files = await readdir(langDir)
    const validFiles = files.filter((f) => f.endsWith('.json'))

    validFiles.forEach((file) => {
      const slug = file.replace('.json', '')
      if (lang === 'en') {
        docRoutes.push(`/docs/${slug}`)
      }
      docRoutes.push(`/${lang}/docs/${slug}`)
    })
  }

  const legalRoutes = ['privacy', 'terms'].map((p) => `/legal/${p}`)
  const coreRoutes = ['/', '/ecosystem', '/patterns']
  const localizedRoutes: string[] = []
  const nonDefaultLangs = langDirs.filter((l) => l !== 'en')

  nonDefaultLangs.forEach((lang) => {
    localizedRoutes.push(`/${lang}`)
    ;['ecosystem', 'patterns'].forEach((page) => {
      localizedRoutes.push(`/${lang}/${page}`)
    })
    ;['privacy', 'terms'].forEach((page) => {
      localizedRoutes.push(`/${lang}/legal/${page}`)
    })
  })

  const extraPaths = [...coreRoutes, ...docRoutes, ...legalRoutes, ...localizedRoutes]

  // Sitemap
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
  console.log(`✅ Generated sitemap.xml with ${extraPaths.length} URLs`)

  // Robots
  const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`

  await writeFile(path.join(outputDir, 'robots.txt'), robots, 'utf-8')
  console.log('✅ Generated robots.txt')
}

generateArtifacts().catch(console.error)
