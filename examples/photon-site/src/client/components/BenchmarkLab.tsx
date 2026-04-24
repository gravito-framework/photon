import { motion } from 'framer-motion'
import { Activity, BarChart3, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { labTranslations } from '../locales/lab'
import { getTranslation } from '../locales/types'

export const BenchmarkLab = ({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) => {
  const [routes, setRoutes] = useState(100)
  const [middleware, setMiddleware] = useState(5)
  const [active, setActive] = useState(false)

  const t = getTranslation(labTranslations, lang)

  // Simulation Algorithm: BunNativeAdapter (optimized) > Photon > Generic frameworks
  const calculateRPS = (base: number, r: number, m: number, factor: number) => {
    const routePenalty = (r / 1000) * factor
    const middlewarePenalty = m * 0.02 * factor
    return Math.floor(base * (1 - routePenalty - middlewarePenalty))
  }

  const bunNativeRPS = active ? calculateRPS(145000, routes, middleware, 0.25) : 145000
  const photonRPS = active ? calculateRPS(91428, routes, middleware, 0.4) : 91428
  const honoRPS = active ? calculateRPS(80485, routes, middleware, 1.0) : 80485

  return (
    <div className="lab-grid p-12 my-32 rounded-sm border border-white/10 group">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
        <div className="flex-1">
          <div className="text-technical text-photon-gold mb-4 flex items-center gap-4 uppercase">
            <Activity size={14} /> {/* LIVE_PERFORMANCE_SIMULATOR */}
          </div>
          <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{t.title}</h3>
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`px-8 py-4 text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-4 ${
            active ? 'bg-photon-gold text-black' : 'bg-white/5 text-white border border-white/10'
          }`}
        >
          {active ? t.btn_active : t.btn_start}
          <RotateCcw size={12} className={active ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Controls */}
        <div className="space-y-12">
          <div>
            <div className="flex justify-between text-[10px] font-technical text-gray-400 mb-4 uppercase">
              <span>{t.route_count}</span>
              <span className="text-white">{routes}</span>
            </div>
            <input
              type="range"
              min="1"
              max="2000"
              value={routes}
              onChange={(e) => setRoutes(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-photon-gold"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-technical text-gray-400 mb-4 uppercase">
              <span>{t.middleware_layers}</span>
              <span className="text-white">{middleware}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={middleware}
              onChange={(e) => setMiddleware(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-photon-gold"
            />
          </div>
        </div>

        {/* Real-time Visualization */}
        <div className="space-y-8 bg-black/40 p-8 border border-white/5 relative">
          <div className="absolute top-4 right-4 opacity-10">
            <BarChart3 size={80} />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[9px] font-technical uppercase">
              <span className="text-singularity font-bold">{t.bun_native_adapter}</span>
              <span className="text-white">{bunNativeRPS.toLocaleString()} RPS</span>
            </div>
            <div className="h-1.5 bg-white/5 w-full">
              <motion.div
                animate={{ width: `${(bunNativeRPS / 145000) * 100}%` }}
                className="h-full bg-singularity shadow-[0_0_15px_#6366f1]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[9px] font-technical uppercase">
              <span className="text-photon-gold font-bold">{t.photon_core}</span>
              <span className="text-white">{photonRPS.toLocaleString()} RPS</span>
            </div>
            <div className="h-1.5 bg-white/5 w-full">
              <motion.div
                animate={{ width: `${(photonRPS / 145000) * 100}%` }}
                className="h-full bg-photon-gold shadow-[0_0_15px_#FFB800]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-[9px] font-technical uppercase">
              <span className="text-gray-600">{t.generic_engine}</span>
              <span className="text-gray-400">{honoRPS.toLocaleString()} RPS</span>
            </div>
            <div className="h-1.5 bg-white/5 w-full">
              <motion.div
                animate={{ width: `${(honoRPS / 145000) * 100}%` }}
                className="h-full bg-white/20"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-white/5">
            <p className="text-[10px] font-technical text-singularity leading-relaxed uppercase">
              {bunNativeRPS > photonRPS
                ? `${t.efficiency_prefix}${((bunNativeRPS / photonRPS - 1) * 100).toFixed(1)}${t.efficiency_suffix}`
                : t.init}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
