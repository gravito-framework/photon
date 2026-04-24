import { useFreeze } from '@gravito/freeze-react'
import { Head, router } from '@inertiajs/react'
import { Activity, Gauge, Workflow } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Footer } from '../components/Footer'
import { DocsAccessSection } from '../components/home/DocsAccessSection'
import { EngineeringSection } from '../components/home/EngineeringSection'
import { HomeNavbar } from '../components/home/HomeNavbar'
import { QuickLinksSection } from '../components/home/QuickLinksSection'
import { type StatItem, StatsSection } from '../components/home/StatsSection'
import { PhotonHero } from '../components/PhotonHero'
import { homeTranslations } from '../locales/home'
import { getTranslation } from '../locales/types'

const stats: StatItem[] = [
  {
    id: 'LAB_DATA_01',
    icon: Activity,
    label: 'THROUGHPUT',
    value: '124,582',
    unit: 'req/s',
    status: 'optimal',
  },
  {
    id: 'LAB_DATA_02',
    icon: Gauge,
    label: 'LATENCY_P50',
    value: '0.84',
    unit: 'ms',
    status: 'optimal',
  },
  {
    id: 'LAB_DATA_03',
    icon: Workflow,
    label: 'OVERHEAD_VS_NATIVE',
    value: '< 1.2',
    unit: '%',
    status: 'minimal',
  },
]

interface HomeProps {
  version?: string
  isDev?: boolean
  lang?: string
}

export default function Home({ lang = 'en', ...props }: HomeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('photon-theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })
  const { isStatic, switchLocale } = useFreeze()
  const currentLang = (lang === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)

    // Sync document class
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    localStorage.setItem('photon-theme', newTheme)
  }

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'zh-TW' : 'en'

    if (isStatic) {
      window.location.href = switchLocale(newLang)
    } else {
      router.visit(switchLocale(newLang), {
        preserveScroll: true,
      })
    }
  }

  // Translations
  const t = getTranslation(homeTranslations, currentLang)

  // Dynamic content arrays
  const quickLinksDynamic = [
    { label: t.intro, href: '/docs/intro', desc: t.usage },
    { label: t.quickstart, href: '/docs/quickstart', desc: t.launch },
    { label: t.aot, href: '/docs/routing', desc: t.aot_desc },
    { label: t.middleware, href: '/docs/middleware', desc: t.middleware_desc },
  ]

  return (
    <div className="min-h-screen font-sans selection:bg-photon-gold/20 transition-colors duration-500 bg-p-bg text-s-txt">
      <Head title={t.head_title} />

      <HomeNavbar
        scrolled={scrolled}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        currentLang={currentLang}
        toggleLanguage={toggleLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        t={t}
      />

      <PhotonHero lang={currentLang} />

      <QuickLinksSection links={quickLinksDynamic} />

      <StatsSection stats={stats} translations={t.stats} />

      <EngineeringSection t={t} />

      <DocsAccessSection t={t} />

      <Footer lang={currentLang} />
    </div>
  )
}
