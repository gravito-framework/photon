import { Activity, Download, Globe, Shield } from 'lucide-react'

export interface MetricsRowProps {
  lang: 'en' | 'zh-TW'
}

export function MetricsRow({ lang }: MetricsRowProps) {
  const stats = [
    { label: lang === 'zh-TW' ? '總下載量' : 'TOTAL_PULLS', value: '4.8M+', icon: Download },
    { label: lang === 'zh-TW' ? '活動節點' : 'ACTIVE_NODES', value: '124K', icon: Activity },
    { label: lang === 'zh-TW' ? '安全審核' : 'SECURITY_SCORE', value: '99.8', icon: Shield },
    { label: lang === 'zh-TW' ? '全球延遲' : 'GLOBAL_LATENCY', value: '12ms', icon: Globe },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-m-txt opacity-60">
            <stat.icon size={12} />
            <span className="text-[9px] font-technical uppercase tracking-widest">
              {stat.label}
            </span>
          </div>
          <div className="text-3xl font-black text-p-txt tracking-tighter">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}
