import { Head } from '@inertiajs/react'
import { DocsLayout } from '../components/DocsLayout'
import { ContributorSection } from '../components/ecosystem/ContributorSection'
import { MetricsRow } from '../components/ecosystem/MetricsRow'
import { OrbitGrid } from '../components/ecosystem/OrbitGrid'
import { getOrbits } from '../data/orbits'
import { ecosystemTranslations } from '../locales/ecosystem'
import { getTranslation } from '../locales/types'

export default function Ecosystem({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const currentLang = (lang === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW'
  const t = getTranslation(ecosystemTranslations, currentLang)
  const orbits = getOrbits(currentLang, t)

  return (
    <DocsLayout currentId="ecosystem">
      <Head title={`${t.head_title} | Photon Engine`} />

      <div className="mb-24 relative">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-photon-gold/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3 mb-8">
          <div className="px-3 py-1 bg-photon-gold/10 border border-photon-gold/20 rounded-full text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(255,184,0,0.1)]">
            Registry_v1.0.0_GALAXY
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] text-green-500 font-technical tracking-[0.1em] uppercase">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Nodes_Global_Sync
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-p-txt uppercase tracking-tighter mb-10 leading-[0.9] drop-shadow-sm">
          {t.title}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-photon-gold to-orange-500">
            Orbits
          </span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-3xl leading-relaxed opacity-80 border-l-2 border-photon-gold/20 pl-8 ml-1">
          {t.subtitle}
        </p>
      </div>

      <OrbitGrid orbits={orbits} lang={currentLang} t={t} />

      <ContributorSection t={t} />

      <MetricsRow lang={currentLang} />
    </DocsLayout>
  )
}
