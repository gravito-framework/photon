import { StaticLink } from '@gravito/freeze-react'
import { BookOpen, Cpu, Workflow } from 'lucide-react'

export interface DocsAccessSectionProps {
  t: any
}

export function DocsAccessSection({ t }: DocsAccessSectionProps) {
  return (
    <section className="py-40 px-12 border-t border-s-brd bg-s-bg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-24 items-center">
        <div className="flex-1">
          <h3 className="text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 italic opacity-20">
            {t.docs_intro}
          </h3>
          <h4 className="text-3xl font-black text-p-txt uppercase tracking-tighter mb-8">
            {t.master}
          </h4>
          <p className="text-s-txt mb-12 font-light leading-loose text-lg">{t.docs_desc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StaticLink
              href="/docs/routing"
              className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm"
            >
              <Cpu
                size={20}
                className="text-photon-gold mb-4 group-hover:scale-110 transition-transform"
              />
              <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">
                AOT_Routing
              </span>
              <span className="text-[8px] text-m-txt uppercase tracking-widest">
                Compiler Logic
              </span>
            </StaticLink>
            <StaticLink
              href="/docs/context"
              className="p-6 border border-s-brd bg-surf-bg hover:border-photon-gold/30 transition-all group shadow-sm"
            >
              <Workflow
                size={20}
                className="text-photon-gold mb-4 group-hover:scale-110 transition-transform"
              />
              <span className="text-[10px] font-technical uppercase block mb-1 text-p-txt">
                Fast_Context
              </span>
              <span className="text-[8px] text-m-txt uppercase tracking-widest">
                Memory Pooling
              </span>
            </StaticLink>
          </div>
        </div>
        <div className="flex-1 w-full glass-card p-12 bg-surf-bg border border-s-brd relative group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BookOpen size={120} strokeWidth={0.5} className="text-p-txt" />
          </div>
          <h5 className="text-technical text-photon-gold mb-8 uppercase tracking-[0.4em]">
            {t.ready}
          </h5>
          <StaticLink
            href="/docs/intro"
            className="inline-block px-12 py-6 bg-p-txt text-p-bg font-black text-[10px] tracking-[0.4em] uppercase hover:bg-photon-gold hover:text-black transition-all relative z-10 shadow-xl"
          >
            {t.start_reading}
          </StaticLink>
        </div>
      </div>
    </section>
  )
}
