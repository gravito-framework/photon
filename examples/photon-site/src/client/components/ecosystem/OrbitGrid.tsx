import type { Orbit } from '../../data/orbits'
import { OrbitCard } from './OrbitCard'

export interface OrbitGridProps {
  orbits: Orbit[]
  lang: 'en' | 'zh-TW'
  t: any
}

export function OrbitGrid({ orbits, lang, t }: OrbitGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-32">
      {orbits.map((orbit, idx) => (
        <OrbitCard key={orbit.name} orbit={orbit} idx={idx} lang={lang} t={t} />
      ))}
    </div>
  )
}
