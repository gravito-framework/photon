import path from 'node:path'
import { InertiaService } from '@gravito/ion'
import { Photon } from '@gravito/photon'
import { serveStatic } from '@gravito/photon/bun'
import { TemplateEngine } from '@gravito/prism'

export const app = new Photon()

// Global middleware for all routes
app.use(async (_, next) => {
  return await next()
})

const isDev = process.env.NODE_ENV === 'development'

if (!isDev) {
  // Serve static assets in production
  app.use('/*', serveStatic({ root: './dist/static' }))
}

// Explicit static routes for known assets
app.get('/favicon.svg', () => {
  return new Response(Bun.file(path.join(process.cwd(), 'public/favicon.svg')), {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
})

// Vite proxy for development mode
if (isDev) {
  // Health check endpoint to test Vite connection
  app.get('/__vite_health', async (c) => {
    try {
      const response = await fetch('http://127.0.0.1:5173/@vite/client', {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      })
      return c.json({
        status: 'ok',
        vite: {
          available: response.ok,
          status: response.status,
          url: 'http://127.0.0.1:5173',
        },
        message: 'Vite dev server is running',
      })
    } catch (error: any) {
      return c.json(
        {
          status: 'error',
          vite: {
            available: false,
            url: 'http://127.0.0.1:5173',
          },
          error: error.message,
          message: 'Vite dev server is not available. Please run: bun run dev:vite',
        },
        503
      )
    }
  })

  const proxyToVite = async (c: any) => {
    try {
      const url = new URL(c.req.url)
      const viteUrl = `http://127.0.0.1:5173${url.pathname}${url.search}`

      const headers = new Headers(c.req.header())
      headers.delete('host') // Let fetch set the correct host

      // Simple retry logic for when Vite is just starting up
      let response: Response
      let retries = 0
      const maxRetries = 3
      let _lastError: Error | null = null

      while (true) {
        try {
          response = await fetch(viteUrl, {
            headers,
            method: c.req.method,
            body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : null,
            signal: AbortSignal.timeout(5000), // 5 second timeout
          })
          break // Success
        } catch (e: any) {
          _lastError = e
          retries++
          if (retries > maxRetries) {
            const errorMsg = e.message || 'Connection failed'
            const errorName = e.name || 'Error'

            console.error(
              `[Vite Proxy] ❌ Failed to connect to Vite dev server after ${maxRetries} retries`
            )
            console.error(`[Vite Proxy] Requested URL: ${viteUrl}`)
            console.error(`[Vite Proxy] Error: ${errorName}: ${errorMsg}`)
            console.error(
              `[Vite Proxy] 💡 Solution: Run 'bun run dev:vite' in the photon-site directory`
            )
            console.error(`[Vite Proxy] 💡 Check health: http://localhost:3333/__vite_health`)

            // Return HTML error page for better visibility in browser
            return c.html(
              `<!DOCTYPE html>
<html>
<head>
  <title>Vite Dev Server Not Available</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #e11d48; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
    pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; }
    .solution { background: #f59e0b; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>⚠️ Vite Dev Server Not Available</h1>
  <p>The backend proxy cannot connect to the Vite development server.</p>
  
  <div class="solution">
    <h3>🔧 Solution:</h3>
    <ol>
      <li>Open a terminal in the <code>photon-site</code> directory</li>
      <li>Run: <code>bun run dev:vite</code></li>
      <li>Wait for Vite to start (you should see "Local: http://localhost:5173/")</li>
      <li>Refresh this page</li>
    </ol>
  </div>
  
  <h3>📋 Details:</h3>
  <ul>
    <li><strong>Error:</strong> ${errorName}: ${errorMsg}</li>
    <li><strong>Requested URL:</strong> <code>${viteUrl}</code></li>
    <li><strong>Retries:</strong> ${maxRetries}</li>
  </ul>
  
  <h3>🔍 Diagnostic:</h3>
  <p>Check the health endpoint: <a href="/__vite_health">/__vite_health</a></p>
  
  <h3>💡 Quick Fix:</h3>
  <pre>cd examples/photon-site
pkill -f vite
bun run dev:vite</pre>
</body>
</html>`,
              503
            )
          }
          // Wait 100ms before retry
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      if (!response.ok && response.status !== 304) {
        // Only log if it's not a 404 (404s are normal for some Vite requests)
        if (response.status !== 404) {
          console.warn(`[Vite Proxy] ${response.status} for: ${url.pathname}`)
        }
        // Forward the error response from Vite
        return c.body(await response.arrayBuffer(), response.status as never)
      }

      // If 304, we don't need to read the body
      if (response.status === 304) {
        return new Response(null, {
          status: 304,
          headers: response.headers,
        })
      }

      // Forward response with proper headers
      const responseHeaders = new Headers(response.headers)
      responseHeaders.set('Access-Control-Allow-Origin', '*')
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      })
    } catch (error: any) {
      console.error('[Vite Proxy] Unexpected error:', error)
      return c.text(
        `Vite proxy error: ${error.message}\n\nPlease ensure Vite dev server is running: bun run dev:vite`,
        503
      )
    }
  }

  // Proxy Vite requests (must be before other routes)
  app.use('*', async (c, next) => {
    const url = new URL(c.req.url)
    const p = url.pathname

    // Proxy Vite special paths and client source files
    if (
      p.startsWith('/@') || // /@vite, /@react-refresh, /@fs, /@id
      p.startsWith('/src/client') ||
      p.startsWith('/node_modules') ||
      ((p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.jsx') || p.endsWith('.js')) &&
        p.startsWith('/src'))
    ) {
      return proxyToVite(c)
    }

    await next()
  })
}

const viewsDir = path.join(process.cwd(), 'src/views')
const engine = new TemplateEngine(viewsDir)

// Reusable render helper to ensure consistent Inertia headers
const renderInertia = async (c: any, component: string, props: any) => {
  const store = new Map<string, any>()
  store.set('view', engine)

  // Bridge context to support Inertia requirements
  const bridge = Object.assign(c, {
    set: (key: string, val: any) => store.set(key, val),
    get: (key: string) => store.get(key),
  })

  const inertia = new InertiaService(bridge as any, {
    version: '1.5.0',
    rootView: 'app',
  })

  // The actual fix: InertiaService.render returns a Response object.
  // We need to return this response directly.
  const response = await inertia.render(component, {
    ...props,
    isDev,
  })

  // Inject Google Analytics if configured
  const gaId = process.env.GA_PHOTON_SITE
  if (response.headers.get('content-type')?.includes('text/html')) {
    let html = await response.text()

    if (gaId) {
      const gaScript = `
        <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        </script>
      `
      html = html.replace('<!-- @google_analytics -->', gaScript)
    } else {
      html = html.replace('<!-- @google_analytics -->', '')
    }

    return new Response(html, {
      status: response.status,
      headers: response.headers,
    })
  }

  return response
}

// ----------------------------------------------------------------------------
// Documentation Handler (Dynamic)
// ----------------------------------------------------------------------------

async function getDocContent(lang: string, page: string) {
  try {
    // Dynamic import based on language and page
    // We use a relative path from this file.
    const doc = await import(`./data/docs/${lang}/${page}.json`)
    return doc.default || doc
  } catch (_e) {
    return null
  }
}

const legalContent: Record<string, Record<string, any>> = {
  privacy: {
    en: {
      id: 'L01',
      title: 'Privacy Policy',
      lastUpdated: '2026-01-14',
      content: `
        <h3>1. Data Collection Protocol</h3>
        <p>Photon Engine is designed with a "Local-First" data priority. We do not collect, store, or transmit any personal data by default. Any telemetry data collected through the <code>logger()</code> middleware session resides exclusively within your runtime environment.</p>

        <h3>2. Local Session Data</h3>
        <p>When using the documentation or experimentation labs, session state may be stored in your browser's <code>localStorage</code> purely for interface persistence. This data never leaves your terminal.</p>

        <h3>3. External Interfaces</h3>
        <p>The Photon site may link to third-party modules (e.g., GitHub, NPM). Interactions with these modules are governed by their respective privacy protocols. We advocate for the use of self-hosted alternatives where protocol security is mission-critical.</p>

        <h3>4. Security Matrix</h3>
        <p>We implement the <code>secureHeaders()</code> protocol globally. This includes strict Content Security Policy (CSP), HSTS enforcement, and XSS filtering to ensure your interaction with our infrastructure is protected at the kernel level.</p>
      `,
    },
    'zh-TW': {
      id: 'L01',
      title: '隱私政策',
      lastUpdated: '2026-01-14',
      content: `
        <h3>1. 數據收集協定</h3>
        <p>Photon Engine 遵循「在地優先 (Local-First)」的原則。我們預設不收集、存儲或傳輸任何個人數據。透過 <code>logger()</code> 中介軟體產生的任何遙測日誌僅存在於您的執行環境中。</p>

        <h3>2. 本地會話數據</h3>
        <p>當使用文件或實驗室功能時，會話狀態可能會存儲在瀏覽器的 <code>localStorage</code> 中，僅用於介面持續性。這些數據絕不會離開您的設備。</p>

        <h3>3. 外部介面</h3>
        <p>Photon 網站可能包含指向第三方模組（如 GitHub、NPM）的連結。與這些模組的互動受其各自隱私條款的約束。我們建議在涉及安全性核心的場景中使用自託管方案。</p>

        <h3>4. 安全矩陣</h3>
        <p>我們全球部署了 <code>secureHeaders()</code> 協定，包括嚴格的內容安全策略 (CSP)、HSTS 強制執行和 XSS 過濾，確保您與核心基礎設施的互動受到核心層級的保護。</p>
      `,
    },
  },
  terms: {
    en: {
      id: 'L02',
      title: 'Terms of Use',
      lastUpdated: '2026-01-14',
      content: `
        <h3>1. Protocol License</h3>
        <p>Photon Engine and its documentation are licensed under the <strong>MIT License</strong>. You are free to use, copy, modify, and distribute the software for any purpose, provided the copyright notice and license are included.</p>

        <h3>2. Acceptable Sequence</h3>
        <p>Users are expected to interact with our documentation and experimentation labs in a non-destructive manner. Automated scraping or stress-testing against our host nodes is restricted by the <code>ShieldV6</code> firewall.</p>

        <h3>3. Disclaimer of Liability</h3>
        <p>The software is provided "as is", without warranty of any kind. Gravito Research Labs and the contributors shall not be liable for any claim, damages or other liability arising from the use of the engine in production environments.</p>

        <h3>4. Ecosystem Governance</h3>
        <p>By using the Photon Engine, you acknowledge that you are operating within the Gravito Framework Ecosystem. We reserve the right to update the technical specifications of these protocols without prior broadcast.</p>
      `,
    },
    'zh-TW': {
      id: 'L02',
      title: '使用條款',
      lastUpdated: '2026-01-14',
      content: `
        <h3>1. 協定授權</h3>
        <p>Photon Engine 及其技術文件採用 <strong>MIT 授權</strong>。您可以出於任何目的自由使用、複製、修改和發布軟體，前提是包含版權聲明和授權條款。</p>

        <h3>2. 合法調度</h3>
        <p>用戶應以非破壞性的方式與我們的文檔和實驗室進行互動。嚴禁使用自動腳本進行爬蟲或壓力測試，<code>ShieldV6</code> 防火牆將攔截此類行為。</p>

        <h3>3. 免責聲明</h3>
        <p>本軟體按「原樣 (As-is)」提供，不提供任何形式的保證。Gravito 研究實驗室及貢獻者不對因在生產環境中使用本引擎而產生的任何賠償或責任負責。</p>

        <h3>4. 生態系統治理</h3>
        <p>使用 Photon Engine 即代表您承認正在 Gravito 框架生態系統中運行。我們保留隨時更新技術規範的權利，恕不另行公告。</p>
      `,
    },
  },
}

// Routes
const supportedLangs = ['en', 'zh-TW']

app.get('/', (c) => renderInertia(c, 'Home', { version: '1.0.0', lang: 'en' }))

app.get('/patterns', (c) => {
  const queryLang = c.req.query('lang')
  const lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'
  return renderInertia(c, 'Patterns', { lang })
})

app.get('/ecosystem', (c) => {
  const queryLang = c.req.query('lang')
  const lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'
  return renderInertia(c, 'Ecosystem', { lang })
})

app.get('/docs/:page', async (c) => {
  const pageParam = c.req.param('page') || 'intro'

  const queryLang = c.req.query('lang') || ''
  const pathLang = queryLang || c.req.url.split('/')[1]?.split('?')[0] || 'en'
  const lang = pathLang === 'zh-TW' ? 'zh-TW' : 'en'

  let doc = await getDocContent(lang, pageParam)

  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  if (!doc) {
    doc = await getDocContent(lang, 'intro')
    if (!doc) {
      doc = await getDocContent('en', 'intro')
    }
  }

  if (!doc && pageParam !== 'intro') {
    return c.redirect(`/docs/intro?lang=${queryLang || lang}`)
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

app.get('/docs/:lang/:page', async (c) => {
  const pageParam = c.req.param('page') || ''
  const langParam = c.req.param('lang') || ''

  const queryLang = c.req.query('lang') || ''

  let lang = langParam === 'zh-TW' ? 'zh-TW' : 'en'

  if (queryLang) {
    lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'
  }

  let doc = await getDocContent(lang, pageParam)

  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  if (!doc) {
    return c.redirect(`/docs/${lang}/intro`)
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

app.get('/legal/:page', (c) => {
  const pageParam = c.req.param('page')
  const queryLang = c.req.query('lang')
  const lang = queryLang === 'zh-TW' ? 'zh-TW' : 'en'

  const pageData = (legalContent as any)[pageParam || '']
  if (!pageData) {
    return c.redirect('/')
  }

  const content = pageData[lang] || pageData.en

  return renderInertia(c, 'Legal', { ...content, slug: pageParam, lang })
})

// --- Localized Routes (Must be after static routes) ---

// Localized Docs Root Redirect
app.get('/:lang/docs', (c) => {
  const lang = c.req.param('lang')
  if (!supportedLangs.includes(lang)) {
    return c.notFound()
  }
  return c.redirect(`/${lang}/docs/intro`)
})

// Localized Docs
app.get('/:lang/docs/:page', async (c) => {
  const langParam = c.req.param('lang') || ''
  const pageParam = c.req.param('page') || ''
  const lang = langParam === 'zh-TW' ? 'zh-TW' : 'en'

  let doc = await getDocContent(lang, pageParam)

  // Fallback to English if not found in requested language
  if (!doc && lang !== 'en') {
    doc = await getDocContent('en', pageParam)
  }

  if (!doc) {
    return c.redirect(`/${lang}/docs/intro`)
  }

  return await renderInertia(c, 'Docs', { ...doc, slug: pageParam, lang })
})

// Localized Patterns
app.get('/:lang/patterns', (c) => {
  const lang = c.req.param('lang')
  if (!supportedLangs.includes(lang)) {
    return c.notFound()
  }
  return renderInertia(c, 'Patterns', { lang })
})

// Localized Ecosystem
app.get('/:lang/ecosystem', (c) => {
  const lang = c.req.param('lang')
  if (!supportedLangs.includes(lang)) {
    return c.notFound()
  }
  return renderInertia(c, 'Ecosystem', { lang })
})

// Localized Legal
app.get('/:lang/legal/:page', (c) => {
  const lang = c.req.param('lang')
  if (!supportedLangs.includes(lang)) {
    return c.notFound()
  }

  const pageParam = c.req.param('page')
  const pageData = (legalContent as any)[pageParam || '']
  if (!pageData) {
    return c.redirect(`/${lang}`)
  }

  const content = pageData[lang] || pageData.en
  return renderInertia(c, 'Legal', { ...content, slug: pageParam, lang })
})

// Localized Root (Matches /en, /zh-TW) - Catch-all for 1 segment
app.get('/zh-TW', (c) => renderInertia(c, 'Home', { version: '1.0.0', lang: 'zh-TW' }))
app.get('/:lang', (c) => {
  const pathLang = c.req.param('lang')
  const queryLang = c.req.query('lang')

  const lang = queryLang || pathLang || 'en'

  if (!supportedLangs.includes(lang)) {
    return c.notFound()
  }

  return renderInertia(c, 'Home', { version: '1.0.0', lang })
})

// ----------------------------------------------------------------------------
// Lifecycle & Warmup
// ----------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && (app as any).warmup) {
  // Pre-warming hot paths to trigger Bun's JIT FTL compiler.
  // This reduces latency for the first few hundred requests.
  await (app as any).warmup([
    '/',
    '/patterns',
    '/ecosystem',
    '/docs/intro',
    '/docs/quickstart',
    '/docs/benchmarks',
  ])
}

export default {
  port: 3333,
  fetch: app.fetch.bind(app),
}

console.log('🚀 PHOTON_ENGINE // ACTIVE_ON: http://localhost:3333')
