import { StaticLink } from '@gravito/freeze-react'
import { ArrowUpRight, BarChart3, Zap } from 'lucide-react'

export interface EngineeringSectionProps {
  t: any
}

export function EngineeringSection({ t }: EngineeringSectionProps) {
  return (
    <section className="py-20 px-12 max-w-7xl mx-auto relative">
      <div className="absolute top-0 right-0 p-24 opacity-5 pointer-events-none text-p-txt">
        <BarChart3 size={600} strokeWidth={0.5} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-32 items-start text-left">
        <div>
          <div className="text-technical text-photon-gold mb-8">
            {/* ARCHITECTURAL_EFFICIENCY */}
          </div>
          <h2 className="text-7xl font-black text-p-txt uppercase tracking-tighter leading-[0.9] mb-12">
            {t.near_zero} <br />{' '}
            <span className="text-photon-gold italic font-light opacity-80">{t.overhead}</span>
          </h2>
          <p className="text-xl text-s-txt leading-relaxed mb-16 font-light">
            {t.desc_p1} <br />
            {t.desc_p2}
            <strong> 98.8% </strong>
            {t.desc_p3}
          </p>

          <StaticLink
            href="/docs/performance"
            className="inline-flex items-center gap-6 text-[10px] font-black tracking-[0.5em] text-p-txt uppercase group py-5 px-10 bg-surf-bg border border-s-brd hover:border-photon-gold hover:text-photon-gold transition-all shadow-xl"
          >
            {t.view_metrics}
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
            />
          </StaticLink>
        </div>

        <div className="glass-card p-12 mt-20 bg-surf-bg border border-s-brd shadow-2xl relative overflow-hidden rounded-2xl group">
          <div className="absolute inset-0 bg-photon-gold/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
          <h4 className="text-xs font-technical text-p-txt mb-10 tracking-widest uppercase italic border-b border-s-brd pb-4">
            {t.telemetry.title} {/* Jan_2026 */}
          </h4>

          <div className="space-y-6 font-technical text-[11px] leading-relaxed relative z-10">
            <p className="text-m-txt flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-m-txt/20" />
              [00:01] {t.telemetry.initializing}
            </p>
            <p className="text-m-txt flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-m-txt/20" />
              [00:03] {t.telemetry.warmup}
            </p>
            <p className="text-m-txt flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-m-txt/20" />
              [00:05] {t.telemetry.targeting}
            </p>
            <div className="my-8 h-px bg-s-brd opacity-50" />
            <p className="text-p-txt flex justify-between font-bold">
              <span className="flex items-center gap-3">
                <Zap size={10} className="text-photon-gold" />
                PHOTON_CORE_DISPATCH
              </span>
              <span className="text-photon-gold">0.84ms (P50)</span>
            </p>
            <p className="text-s-txt flex justify-between opacity-60">
              <span>&gt; HONO_DISPATCH_SHIM</span>
              <span className="text-red-600/60">1.12ms (P50)</span>
            </p>
            <p className="text-s-txt flex justify-between opacity-60">
              <span>&gt; ELYSIA_DISPATCH_STATIC</span>
              <span className="text-blue-600/60">1.02ms (P50)</span>
            </p>
            <div className="h-px bg-photon-gold/20 my-8" />
            <p className="text-photon-gold font-black tracking-widest text-[12px]">
              {t.telemetry.result}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
