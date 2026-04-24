import { ChevronRight, Globe, MessageSquare } from 'lucide-react'

export interface ContributorSectionProps {
  t: any
}

export function ContributorSection({ t }: ContributorSectionProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-photon-gold/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10 blur-xl" />
      <div className="p-16 md:p-24 bg-s-bg border border-s-brd relative overflow-hidden group hover:border-photon-gold/30 transition-all duration-700">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
          <Globe size={240} className="text-p-txt" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-px bg-photon-gold" />
            <div className="text-[10px] font-technical text-photon-gold uppercase tracking-[0.4em]">
              Contributor_Access
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-p-txt uppercase tracking-tighter mb-8 leading-none">
            {t.buildTitle} <br />
            <span className="text-photon-gold">Orbit_Expansion</span>
          </h2>
          <p className="text-xl text-s-txt max-w-2xl mb-12 leading-relaxed font-light opacity-80">
            {t.buildDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <a
              href="https://github.com/gravito-framework/gravito"
              className="inline-flex items-center justify-center gap-4 px-10 py-5 bg-photon-gold text-[12px] font-technical text-black uppercase tracking-widest font-black hover:bg-white transition-all shadow-xl shadow-photon-gold/10"
            >
              {t.registryDocs} <ChevronRight size={16} />
            </a>
            <a
              href="https://github.com/gravito-framework/gravito/discussions"
              className="inline-flex items-center justify-center gap-4 px-10 py-5 bg-surf-bg border border-s-brd text-[12px] font-technical text-p-txt uppercase tracking-widest hover:border-p-txt transition-all"
            >
              <MessageSquare size={16} /> Discuss_Proposal
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
