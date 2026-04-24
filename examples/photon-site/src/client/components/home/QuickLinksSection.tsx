import { StaticLink } from '@gravito/freeze-react'
import { ArrowUpRight } from 'lucide-react'

export interface QuickLink {
  label: string
  href: string
  desc: string
}

export interface QuickLinksSectionProps {
  links: QuickLink[]
}

export function QuickLinksSection({ links }: QuickLinksSectionProps) {
  return (
    <section className="relative z-20 py-20 px-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {links.map((link) => (
          <StaticLink
            key={link.label}
            href={link.href}
            className="p-8 bg-surf-bg hover:bg-surf-bg transition-all group relative overflow-hidden"
            style={{ boxShadow: 'var(--card-shadow)' } as any}
          >
            <div className="absolute top-0 left-0 w-full h-full bg-photon-gold/0 group-hover:bg-photon-gold/[0.04] transition-all" />
            <span className="text-[9px] font-technical text-photon-gold block mb-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              {link.desc}
            </span>
            <span className="text-xs font-black text-p-txt tracking-[0.2em] uppercase flex items-center justify-between">
              {link.label}
              <ArrowUpRight
                size={14}
                className="text-m-txt group-hover:text-photon-gold group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"
              />
            </span>
          </StaticLink>
        ))}
      </div>
    </section>
  )
}
