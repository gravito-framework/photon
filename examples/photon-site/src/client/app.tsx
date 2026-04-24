import { asLocale } from '@gravito/freeze'
import { defineConfig, FreezeProvider } from '@gravito/freeze-react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const config = defineConfig({
  staticDomains: ['photon.gravito.dev', 'photon-site.pages.dev'],
  locales: [asLocale('en'), asLocale('zh-TW')],
  defaultLocale: asLocale('en'),
  baseUrl: (process.env.BASE_URL || 'https://photon.gravito.dev').replace(/\/$/, ''),
  previewPort: 8000,
})

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`]
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <FreezeProvider config={config}>
        <App {...props} />
      </FreezeProvider>
    )
  },
})
