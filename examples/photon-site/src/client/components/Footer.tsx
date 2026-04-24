import { StaticLink } from '@gravito/freeze-react'
import { Activity, ExternalLink, Github, MessageSquare, Zap } from 'lucide-react'
import { footerTranslations } from '../locales/footer'
import { getTranslation } from '../locales/types'

const getFooterLinks = (
  t: any,
  _lang: string
): { title: string; links: { label: string; href: string; icon?: any }[] }[] => [
  {
    title: t.ecosystem_nodes,
    links: [
      { label: 'Gravito Core', href: 'https://gravito.dev' },
      { label: 'Atlas ORM', href: 'https://atlas.gravito.dev' },
      { label: 'Zenith Plane', href: 'https://zenith.gravito.dev' },
    ],
  },
  {
    title: t.protocol_resources,
    links: [
      { label: t.privacy_policy, href: '/legal/privacy' },
      { label: t.terms_of_use, href: '/legal/terms' },
      { label: t.architecture_patterns, href: '/patterns' },
      { label: t.ecosystem_registry, href: '/ecosystem' },
      { label: t.documentation, href: '/docs/intro' },
    ],
  },
  {
    title: t.external_links,
    links: [
      { label: 'GitHub', href: 'https://github.com/gravito-framework/gravito', icon: Github },
      {
        label: 'Discussions',
        href: 'https://github.com/gravito-framework/gravito/discussions',
        icon: MessageSquare,
      },
      { label: 'NPM Registry', href: 'https://www.npmjs.com/package/@gravito/photon' },
    ],
  },
]

export function Footer({ lang = 'en' }: { lang?: 'en' | 'zh-TW' }) {
  const t = getTranslation(footerTranslations, lang)

  const links = getFooterLinks(t, lang)

  return (
    <footer className="relative bg-bg-primary border-t border-s-brd pt-24 pb-12 px-12 overflow-hidden transition-all duration-500">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 grid-texture pointer-events-none opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-24">
          {/* Brand Info */}
          <div className="max-w-sm">
            <div className="flex items-center gap-4 mb-8 group">
              <div className="w-10 h-10 border border-photon-gold/20 flex items-center justify-center bg-photon-gold/5 group-hover:border-photon-gold/40 transition-all rounded-lg backdrop-blur-md">
                <Zap
                  size={18}
                  className="text-photon-gold transition-transform group-hover:scale-110"
                />
              </div>
              <span className="text-2xl font-black text-p-txt tracking-tighter uppercase transition-colors glow-hover">
                Pho<span className="opacity-50 italic font-light">ton</span>
              </span>
            </div>
            <p className="text-s-txt text-xs font-light tracking-wide leading-relaxed mb-8 transition-colors max-w-xs">
              {t.desc_1} <br />
              {t.desc_2}
            </p>
            <div className="flex items-center gap-6 text-[9px] font-technical tracking-[0.4em] text-m-txt uppercase transition-colors">
              <span className="hover:text-photon-gold transition-colors">{t.license}</span>
              <span className="px-2 py-0.5 border border-s-brd bg-surf-bg rounded text-photon-gold">
                {t.version}
              </span>
            </div>
          </div>

          {/* Simplified Link Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-24">
            {links.map((group) => (
              <div key={group.title} className="flex flex-col gap-8">
                <h5 className="text-[10px] font-technical font-black text-p-txt opacity-20 tracking-[0.5em] uppercase whitespace-nowrap transition-colors">
                  {group.title}
                </h5>
                <ul className="flex flex-col gap-4">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <StaticLink
                          href={link.href}
                          className="text-s-txt hover:text-photon-gold text-xs font-light transition-all flex items-center gap-3 group/link"
                        >
                          <span className="w-1 h-px bg-photon-gold opacity-0 group-hover/link:opacity-100 group-hover/link:w-2 transition-all" />
                          {link.label}
                        </StaticLink>
                      ) : (
                        <a
                          href={link.href}
                          className="text-s-txt hover:text-photon-gold text-xs font-light transition-all flex items-center gap-3 group/link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="w-1 h-px bg-photon-gold opacity-0 group-hover/link:opacity-100 group-hover/link:w-2 transition-all" />
                          {link.label}
                          {link.icon && (
                            <link.icon
                              size={12}
                              className="opacity-40 group-hover/link:text-photon-gold transition-colors"
                            />
                          )}
                          {!link.icon && (
                            <ExternalLink
                              size={10}
                              className="opacity-0 group-hover/link:opacity-40 transition-opacity"
                            />
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Minimized Copyright Strip */}
        <div className="pt-12 border-t border-s-brd flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-technical tracking-[0.5em] text-m-txt uppercase transition-colors">
          <div className="flex items-center gap-10">
            <span className="flex items-center gap-3 text-photon-gold group cursor-help">
              <Activity size={10} className="animate-pulse" />
              <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                {t.protocol_stable}
              </span>
            </span>
            <span className="opacity-40 hover:opacity-100 transition-opacity duration-500">
              © 2026 Gravito_Labs
            </span>
          </div>

          <div className="flex items-center gap-10 opacity-40 hover:opacity-100 transition-opacity duration-500">
            <span>{t.ecosystem_part}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
