import { StaticLink } from '@gravito/freeze-react'
import { Head } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { ChevronRight, Code, Sparkles, Workflow } from 'lucide-react'
import { DocsLayout } from '../components/DocsLayout'
import { patternsTranslations } from '../locales/patterns'
import { getTranslation } from '../locales/types'

export default function Patterns({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const currentLang = (lang === 'zh-TW' ? 'zh-TW' : 'en') as 'en' | 'zh-TW'
  const isZh = currentLang === 'zh-TW'
  const t = getTranslation(patternsTranslations, currentLang)
  const items = t.patterns

  return (
    <DocsLayout currentId="patterns">
      <Head title={`${isZh ? '架構模式' : 'Architecture Patterns'} | Photon Engine`} />

      <div className="mb-24 relative">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-photon-gold/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3 mb-8">
          <div className="px-3 py-1 bg-photon-gold/10 border border-photon-gold/20 rounded-full text-[10px] text-photon-gold font-technical tracking-[0.2em] uppercase">
            Architect_Blueprint_v2.0
          </div>
          <div className="w-1.5 h-1.5 bg-photon-gold rounded-full animate-pulse" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-p-txt uppercase tracking-tighter mb-10 leading-[0.9] drop-shadow-sm">
          {t.hero_title}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-photon-gold to-yellow-600">
            {t.hero_subtitle}
          </span>
        </h1>
        <p className="text-xl text-s-txt font-light max-w-3xl leading-relaxed opacity-80 border-l-2 border-photon-gold/20 pl-8 ml-1">
          {t.hero_desc}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-32">
        {items.map((item: any, idx: number) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="group relative p-10 bg-s-bg border border-s-brd hover:border-photon-gold/40 hover:shadow-[0_25px_60px_rgba(0,0,0,0.3)] transition-all duration-500 overflow-hidden"
          >
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-photon-gold/5 blur-[60px] group-hover:bg-photon-gold/10 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="w-16 h-16 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/40 group-hover:bg-photon-gold/5 transition-all duration-300">
                <item.icon
                  size={28}
                  strokeWidth={1.5}
                  className="text-photon-gold/80 group-hover:text-photon-gold group-hover:scale-110 transition-all duration-300"
                />
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <span className="text-[10px] font-technical text-m-txt uppercase tracking-[0.3em] opacity-40 group-hover:opacity-100 transition-opacity">
                  {item.id}
                </span>
                <span className="text-[10px] font-technical text-photon-gold border border-photon-gold/20 bg-photon-gold/5 px-3 py-1 rounded-sm uppercase tracking-widest">
                  {item.category}
                </span>
              </div>
            </div>

            <h3 className="text-3xl font-black text-p-txt uppercase tracking-tight mb-4 group-hover:text-photon-gold transition-colors duration-300 relative z-10">
              {item.title}
            </h3>
            <p className="text-s-txt text-base leading-relaxed mb-8 opacity-80 group-hover:opacity-100 transition-opacity h-12 overflow-hidden">
              {item.desc}
            </p>

            <div className="relative z-10">
              <div className="flex flex-wrap gap-2.5 mb-8">
                {item.tags.map((benefit: string, bIdx: number) => (
                  <span
                    key={bIdx}
                    className="text-[10px] font-technical text-photon-gold/80 uppercase px-3 py-1.5 bg-surf-bg border border-s-brd rounded-xs group-hover:border-photon-gold/20 transition-colors"
                  >
                    {benefit}
                  </span>
                ))}
              </div>

              <div className="relative group/code">
                <div className="absolute -top-6 right-2 text-[9px] font-technical text-m-txt opacity-40 uppercase tracking-widest">
                  {t.example_code}
                </div>
                <div className="p-6 bg-[#0F0F10] border border-s-brd group-hover:border-photon-gold/30 transition-all duration-300 rounded-sm font-technical text-xs leading-relaxed text-blue-400 overflow-x-auto shadow-inner">
                  <div className="flex items-center gap-3 mb-2 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-orange-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <code className="block whitespace-pre text-indigo-300">{item.code}</code>
                </div>
              </div>

              {item.metrics && (
                <div className="mt-8 flex items-center justify-between p-4 bg-surf-bg border border-s-brd rounded-sm">
                  <div className="text-[10px] font-technical text-m-txt uppercase tracking-[0.2em]">
                    {item.metrics.label}
                  </div>
                  <div className="text-lg font-technical font-black text-photon-gold">
                    {item.metrics.value}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 md:p-16 border border-s-brd bg-s-bg relative overflow-hidden group hover:border-photon-gold/40 transition-all duration-700 shadow-xl"
        >
          <div className="absolute -top-10 -right-10 p-10 opacity-5 pointer-events-none text-p-txt rotate-12 transition-transform duration-1000 group-hover:rotate-0">
            <Code size={250} strokeWidth={0.5} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-1 px-4 bg-photon-gold mb-10" />
            <h2 className="text-4xl md:text-5xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-[0.9]">
              {t.composable_title}{' '}
              <span className="text-photon-gold block mt-2">{t.composable_subtitle}</span>
            </h2>
            <p className="text-lg text-s-txt leading-relaxed mb-12 opacity-80 font-light">
              {t.composable_desc}
            </p>
            <div className="mt-auto">
              <StaticLink
                href={`/docs/routing?lang=${lang}`}
                className="inline-flex items-center gap-4 px-8 py-4 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-[0.3em] font-black hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all"
              >
                {t.explore_routing} <ChevronRight size={14} />
              </StaticLink>
              ...
              <StaticLink
                href={`/docs/performance?lang=${lang}`}
                className="inline-flex items-center gap-4 px-8 py-4 bg-surf-bg border border-s-brd text-[11px] font-technical text-p-txt uppercase tracking-[0.3em] font-black hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all"
              >
                {t.review_metrics} <ChevronRight size={14} />
              </StaticLink>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-10 py-16 border-y border-s-brd mt-20 mb-32 group">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-photon-gold/5 flex items-center justify-center rounded-sm">
            <Workflow size={40} className="text-photon-gold opacity-60" />
          </div>
          <div>
            <div className="text-[10px] font-technical text-m-txt uppercase tracking-widest mb-1">
              {t.reliability_label}
            </div>
            <div className="text-2xl font-black text-p-txt uppercase tracking-tight">
              {t.reliability_title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-2 bg-surf-bg border border-s-brd rounded-full text-[10px] font-technical text-photon-gold uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={10} />
            {t.production_ready}
          </div>
          <div className="px-6 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-technical text-green-500 uppercase tracking-widest">
            v2.0_STABLE
          </div>
        </div>
      </div>
    </DocsLayout>
  )
}
