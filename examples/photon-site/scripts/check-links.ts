#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve('dist/static')
const baseUrl = new URL(process.env.BASE_URL || 'https://photon.gravito.dev')
const issues: string[] = []
let pages = 0
let links = 0

async function resolves(url: URL) {
  const pathname = decodeURIComponent(url.pathname)
  const target = path.resolve(outputDir, `.${pathname}`)
  if (target !== outputDir && !target.startsWith(`${outputDir}${path.sep}`)) return false
  for (const file of [target, `${target}.html`, path.join(target, 'index.html')]) {
    try {
      if ((await stat(file)).isFile()) return true
    } catch {
      // Try the next static route representation.
    }
  }
  return false
}

async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(file)
    else if (entry.name.endsWith('.html')) {
      pages++
      const html = await readFile(file, 'utf8')
      const relative = path.relative(outputDir, file)
      if (!/<html\b/i.test(html) || !/data-page=/.test(html)) {
        issues.push(`${relative}: missing HTML or Inertia page data`)
      }
      const route = `/${relative.replace(/index\.html$/, '').replace(/\.html$/, '')}`
      const pageUrl = new URL(route, baseUrl)
      // Check actual document links and script/style assets, excluding embedded JSON examples.
      for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
        const href = match[1].replace(/&amp;/g, '&')
        if (!href || href.startsWith('#')) continue
        const url = new URL(href, pageUrl)
        if (url.origin !== baseUrl.origin || !['http:', 'https:'].includes(url.protocol)) continue
        links++
        if (!(await resolves(url))) issues.push(`${relative}: missing ${url.pathname}`)
      }
    }
  }
}

async function main() {
  // Coverage comes from source content, so an empty or partial export cannot pass.
  const routes = ['/', '/ecosystem', '/patterns', '/legal/privacy', '/legal/terms']
  for (const lang of ['en', 'zh-TW']) {
    for (const entry of await readdir(`src/server/data/docs/${lang}`)) {
      if (!entry.endsWith('.json')) continue
      const slug = entry.slice(0, -5)
      routes.push(`/${lang}/docs/${slug}`)
      if (lang === 'en') routes.push(`/docs/${slug}`)
    }
  }
  routes.push('/zh-TW', '/zh-TW/ecosystem', '/zh-TW/patterns', '/zh-TW/legal/privacy', '/zh-TW/legal/terms')
  for (const route of routes) {
    if (!(await resolves(new URL(route, baseUrl)))) issues.push(`missing route ${route}`)
  }
  for (const file of ['assets/app.js', 'assets/app.css', 'favicon.svg', '_redirects', 'sitemap.xml', 'robots.txt']) {
    if (!existsSync(path.join(outputDir, file))) issues.push(`missing artifact ${file}`)
  }
  await walk(outputDir)
  const sitemap = await readFile(path.join(outputDir, 'sitemap.xml'), 'utf8')
  for (const route of routes) {
    const loc = `${baseUrl.origin}${route === '/' ? '' : route}`
    if (!sitemap.includes(`<loc>${loc}</loc>`)) issues.push(`missing sitemap URL ${loc}`)
  }
  if (pages === 0) issues.push('no HTML pages generated')
  if (issues.length) throw new Error(issues.join('\n'))
  console.log(`Verified ${routes.length} routes, ${pages} HTML pages and ${links} local links/assets at ${baseUrl.origin}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
