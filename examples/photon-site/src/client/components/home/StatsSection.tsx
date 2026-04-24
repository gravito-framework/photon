export interface StatItem {
  id: string
  icon: any
  label: string
  value: string
  unit: string
  status: 'optimal' | 'minimal' | string
}

export interface StatsSectionProps {
  stats: StatItem[]
  translations?: { label?: string; unit?: string }[]
}

export function StatsSection({ stats, translations = [] }: StatsSectionProps) {
  return (
    <section className="relative z-20 py-40 px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((item, idx) => {
          const trans = translations[idx] || {}
          return (
            <div
              key={item.id}
              className="glass-card group p-10 bg-surf-bg border border-s-brd hover:border-photon-gold/40 transition-all rounded-xl"
              style={{ boxShadow: 'var(--card-shadow)' } as any}
            >
              <div className="flex justify-between items-start mb-12">
                <div className="icon-container text-photon-gold/40 group-hover:text-photon-gold transition-colors">
                  <item.icon size={18} strokeWidth={1.5} />
                </div>
                <span className="text-[8px] font-technical tracking-[0.4em] text-m-txt uppercase">
                  [{item.id}]
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-p-txt tracking-tighter transition-colors">
                  {item.value}
                </span>
                <span className="text-[10px] font-technical text-m-txt uppercase">
                  {trans.unit || item.unit}
                </span>
              </div>
              <div className="text-technical text-[8px] flex items-center gap-2">
                <span
                  className={`w-1 h-1 rounded-full ${item.status === 'optimal' ? 'bg-photon-gold' : 'bg-gray-600'}`}
                />
                {trans.label || item.label}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
