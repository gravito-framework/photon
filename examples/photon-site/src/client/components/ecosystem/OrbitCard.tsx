import { AnimatePresence, motion } from 'framer-motion'
import { Check, Download, Layers } from 'lucide-react'
import { useState } from 'react'
import type { Orbit } from '../../data/orbits'

export interface OrbitCardProps {
  orbit: Orbit
  idx: number
  lang: 'en' | 'zh-TW'
  t: any
}

export function OrbitCard({ orbit, idx, lang, t }: OrbitCardProps) {
  const [copiedPackage, setCopiedPackage] = useState<string | null>(null)

  const handleInstall = (packageName: string) => {
    const command = `bun add ${packageName}`
    navigator.clipboard.writeText(command).then(() => {
      setCopiedPackage(packageName)
      setTimeout(() => setCopiedPackage(null), 2000)
    })
  }

  return (
    <motion.div
      key={orbit.name}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05, duration: 0.5 }}
      className="group relative p-10 bg-s-bg border border-s-brd hover:border-photon-gold/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-photon-gold/5 blur-[40px] group-hover:bg-photon-gold/10 transition-colors pointer-events-none" />

      <div className="absolute top-10 right-10 flex items-center gap-2">
        <span className="text-[9px] font-technical text-m-txt opacity-40 uppercase tracking-widest">
          {t.orbitType[orbit.type]}
        </span>
        <div
          className={`w-1.5 h-1.5 rounded-full ${orbit.type === 'OFFICIAL' ? 'bg-photon-gold shadow-[0_0_10px_rgba(255,184,0,0.6)]' : 'bg-gray-500'}`}
        />
      </div>

      <div className="flex items-start gap-8 mb-10">
        <div className="w-16 h-16 border border-s-brd flex items-center justify-center bg-surf-bg group-hover:border-photon-gold/40 transition-all duration-300 relative">
          <div className="absolute inset-0 bg-photon-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <orbit.icon
            size={28}
            strokeWidth={1.5}
            className="text-p-txt group-hover:text-photon-gold group-hover:scale-110 transition-all duration-300 relative z-10"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-black text-p-txt uppercase tracking-tight mb-2 group-hover:text-photon-gold transition-colors">
            {orbit.name}
          </h3>
          <div className="text-[10px] font-technical text-m-txt tracking-[0.2em] opacity-60">
            {orbit.package}
          </div>
        </div>
      </div>

      <p className="text-s-txt text-[15px] leading-relaxed mb-10 h-16 overflow-hidden opacity-90">
        {orbit.description}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <div className="space-y-3">
          <div className="text-[10px] font-technical text-m-txt border-b border-s-brd pb-1 mb-3 uppercase tracking-[0.2em]">
            {lang === 'zh-TW' ? '特徵' : 'FEATURES'}
          </div>
          {orbit.features.map((feat) => (
            <div
              key={feat}
              className="flex items-center gap-3 text-[10px] font-technical text-p-txt uppercase tracking-widest leading-none"
            >
              <div className="w-1 h-1 bg-photon-gold/60 rounded-full" />
              {feat}
            </div>
          ))}
        </div>
        {orbit.metrics && (
          <div className="flex flex-col justify-end">
            <div className="p-4 bg-surf-bg border border-s-brd rounded-sm">
              <div className="text-[8px] font-technical text-m-txt uppercase tracking-widest mb-1">
                {orbit.metrics.label}
              </div>
              <div className="text-xl font-technical font-black text-photon-gold">
                {orbit.metrics.value}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-8 border-t border-s-brd/40">
        <button
          type="button"
          onClick={() => handleInstall(orbit.package)}
          className="flex-1 flex items-center justify-center gap-3 py-3 bg-surf-bg border border-s-brd text-[10px] font-technical text-p-txt hover:bg-photon-gold hover:text-black hover:border-photon-gold transition-all uppercase tracking-[0.2em] relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {copiedPackage === orbit.package ? (
              <motion.div
                key="copied"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Check size={14} /> {t.copied}
              </motion.div>
            ) : (
              <motion.div
                key="install"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Download size={14} /> {t.install}
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <button
          type="button"
          className="px-4 py-3 bg-surf-bg border border-s-brd text-p-txt hover:border-photon-gold/40 transition-all"
        >
          <Layers size={14} />
        </button>
      </div>
    </motion.div>
  )
}
