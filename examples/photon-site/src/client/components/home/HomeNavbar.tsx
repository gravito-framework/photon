import { StaticLink } from '@gravito/freeze-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, Zap } from 'lucide-react'
import { LangToggle } from '../LangToggle'
import { ThemeToggle } from '../ThemeToggle'

export interface HomeNavbarProps {
  scrolled: boolean
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  currentLang: 'en' | 'zh-TW'
  toggleLanguage: () => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  t: any
}

export function HomeNavbar({
  scrolled,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentLang,
  toggleLanguage,
  theme,
  toggleTheme,
  t,
}: HomeNavbarProps) {
  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 px-4 md:px-12 py-4 md:py-6 flex justify-between items-center transition-all duration-700 ${
          scrolled ? 'py-3 md:py-4' : 'bg-transparent'
        }`}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute inset-0 backdrop-blur-2xl border-b border-s-brd shadow-[0_4px_30px_rgba(0,0,0,0.03)] bg-[var(--nav-bg)]" />
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden flex items-center justify-center p-2 -ml-2 text-s-txt hover:text-photon-gold transition-colors relative z-10"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <StaticLink
          href="/"
          className="relative z-10 text-2xl font-black text-p-txt tracking-tighter uppercase group flex items-center gap-3 shrink-0"
        >
          <div className="w-10 h-10 border border-photon-gold/20 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold/50 transition-all duration-500 rounded-lg bg-photon-gold/5 backdrop-blur-md">
            <Zap
              size={18}
              className="text-photon-gold group-hover:scale-125 group-hover:drop-shadow-[0_0_8px_rgba(255,184,0,0.8)] transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-photon-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="hidden sm:inline group-hover:translate-x-1 transition-transform duration-500 glow-hover">
            Pho<span className="opacity-50 italic font-light">ton</span>
          </span>
        </StaticLink>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-4 lg:gap-8 relative z-10">
          {[
            { label: t.navbar.docs, href: '/docs/intro' },
            { label: t.navbar.ecosystem, href: '/ecosystem' },
            { label: t.navbar.patterns, href: '/patterns' },
          ].map((item) => (
            <StaticLink
              key={item.label}
              href={item.href}
              className="text-[10px] font-black tracking-[0.3em] uppercase text-s-txt hover:text-photon-gold transition-colors relative group py-2"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-photon-gold transition-all duration-500 group-hover:w-full shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
            </StaticLink>
          ))}
        </div>

        <div className="flex items-center gap-3 md:gap-6 relative z-10 shrink-0">
          {/* LANG TOGGLE */}
          <LangToggle
            currentLang={currentLang as 'en' | 'zh-TW'}
            toggleLanguage={toggleLanguage}
            title={t.switch_lang_tip}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-s-brd bg-surf-bg/50 backdrop-blur-md hover:border-photon-gold/40 transition-all text-s-txt hover:text-photon-gold shadow-lg group"
          />

          {/* THEME TOGGLE */}
          <ThemeToggle
            theme={theme}
            toggleTheme={toggleTheme}
            title={t.switch_theme_tip}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-s-brd bg-surf-bg/50 backdrop-blur-md hover:border-photon-gold/40 transition-all text-s-txt hover:text-photon-gold shadow-lg group"
          />
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-s-bg border-r border-s-brd shadow-2xl z-50 md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-s-brd">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden">
                    <Zap size={14} className="text-photon-gold" />
                  </div>
                  <span className="text-xl font-black text-p-txt tracking-tighter uppercase">
                    Photon
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-s-txt hover:text-p-txt hover:bg-s-brd/10 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-6 space-y-4">
                {[
                  { label: t.navbar.docs, href: '/docs/intro' },
                  { label: t.navbar.ecosystem, href: '/ecosystem' },
                  { label: t.navbar.patterns, href: '/patterns' },
                ].map((item) => (
                  <StaticLink
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-4 px-4 text-base font-bold text-s-txt hover:text-photon-gold hover:bg-s-brd/10 rounded-lg transition-all border-l-2 border-transparent hover:border-photon-gold"
                  >
                    {item.label}
                  </StaticLink>
                ))}
              </nav>

              <div className="p-6 border-t border-s-brd bg-surf-bg">
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      toggleLanguage()
                      setMobileMenuOpen(false)
                    }}
                    className="flex-1 py-3 px-4 flex items-center justify-center gap-2 border border-s-brd bg-p-bg text-s-txt hover:text-photon-gold hover:border-photon-gold/30 rounded-lg transition-all"
                  >
                    <span className="text-xs font-bold font-technical uppercase">
                      {currentLang === 'en' ? '繁' : 'EN'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme()
                      setMobileMenuOpen(false)
                    }}
                    className="flex-1 py-3 px-4 flex items-center justify-center gap-2 border border-s-brd bg-p-bg text-s-txt hover:text-photon-gold hover:border-photon-gold/30 rounded-lg transition-all"
                  >
                    {theme === 'dark' ? (
                      <Menu size={16} />
                    ) : (
                      <Zap size={16} /* Dummy fallback icon */ />
                    )}
                    {/* Replaced Moon/Sun with the ThemeToggle. Or manually handled. Note: we will extract ThemeToggle later if needed, but for now reproducing exact structure */}
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
