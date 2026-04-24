import { StaticLink, useFreeze } from '@gravito/freeze-react'
import { router, usePage } from '@inertiajs/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Command, Menu, Search, Terminal, X, Zap } from 'lucide-react'
import type React from 'react'
import { useEffect, useState } from 'react'
import { navGroups } from '../constants/navigation'
import { navTranslations } from '../locales/layout'
import { getTranslation } from '../locales/types'
import { Footer } from './Footer'
import { LangToggle } from './LangToggle'
import { ThemeToggle } from './ThemeToggle'

export const DocsLayout = ({
  children,
  currentId,
}: {
  children: React.ReactNode
  currentId?: string
}) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [_progress, _setProgress] = useState(0)
  const { isStatic, switchLocale } = useFreeze()
  const { props } = usePage()
  const currentLang = (props.lang as string) || 'en'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('photon-theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })

  const t = (key: string) => {
    const localeTranslations = getTranslation(navTranslations, currentLang)
    return localeTranslations[key] || key
  }

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'zh-TW' : 'en'

    if (isStatic) {
      window.location.href = switchLocale(newLang)
    } else {
      router.visit(switchLocale(newLang), {
        preserveScroll: true,
      })
    }
  }

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    localStorage.setItem('photon-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-p-bg text-s-txt transition-colors duration-500">
      <div className="crt-overlay pointer-events-none" />

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-s-bg border-b border-s-brd px-4 h-16 flex items-center justify-between transition-colors duration-500">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 text-s-txt hover:text-photon-gold transition-colors"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2">
          <Zap size={14} className="text-photon-gold" />
          <span className="font-black tracking-tighter uppercase text-p-txt">Photon</span>
        </div>

        <div className="w-8" />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-s-bg w-80 border-r border-s-brd flex flex-col transition-all duration-300 ease-in-out
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-40 lg:shadow-none
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 lg:hidden p-2 text-s-txt hover:text-p-txt z-50"
        >
          <X size={20} />
        </button>

        <div className="p-12 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-12 gap-4">
            <StaticLink
              href="/"
              className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 group text-p-txt"
            >
              <div className="w-8 h-8 border border-photon-gold/30 flex items-center justify-center relative overflow-hidden group-hover:border-photon-gold transition-colors">
                <Zap
                  size={14}
                  className="text-photon-gold group-hover:scale-125 transition-transform"
                />
                <div className="absolute inset-0 bg-photon-gold/5 group-hover:bg-photon-gold/20 transition-colors" />
              </div>
              <span className="hidden xl:inline group-hover:translate-x-1 transition-transform duration-500">
                Pho<span className="opacity-50 italic">ton</span>
              </span>
            </StaticLink>

            <div className="flex items-center gap-3">
              <LangToggle
                currentLang={currentLang as 'en' | 'zh-TW'}
                toggleLanguage={toggleLanguage}
                title={currentLang === 'en' ? 'Switch to Traditional Chinese' : 'Switch to English'}
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg text-s-txt hover:text-photon-gold transition-all shadow-sm group"
              />

              <ThemeToggle
                theme={theme}
                toggleTheme={toggleTheme}
                title={t('toggle_theme')}
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-s-brd bg-surf-bg text-s-txt hover:text-photon-gold transition-all shadow-sm group"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between border border-s-brd bg-surf-bg text-s-txt rounded-sm py-3 px-4 text-[10px] uppercase font-bold tracking-widest hover:border-photon-gold/30 transition-all mb-12 group text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Search size={14} className="opacity-40 group-hover:text-photon-gold" />
              <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                COMMAND_PALETTE
              </span>
            </div>
            <kbd className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded text-[8px] opacity-40">
              <Command size={8} /> K
            </kbd>
          </button>

          <nav className="space-y-10">
            {navGroups.map((group) => (
              <div key={group.category} className="space-y-4">
                <div className="text-[9px] font-bold text-m-txt tracking-[0.4em] uppercase px-4 opacity-70">
                  {t(group.category)}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const localizedHref =
                      currentLang === 'en' ? item.href : `/${currentLang}${item.href}`
                    return (
                      <StaticLink
                        key={item.id}
                        href={localizedHref}
                        className={`flex items-center gap-4 px-4 py-2.5 rounded-sm group transition-all ${currentId === item.id ? 'bg-surf-bg border border-s-brd text-p-txt shadow-sm' : 'text-s-txt hover:text-p-txt'}`}
                      >
                        <item.icon
                          size={11}
                          className={
                            currentId === item.id
                              ? 'text-photon-gold'
                              : 'opacity-40 group-hover:opacity-100'
                          }
                        />
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase">
                          {t(item.label)}
                        </span>
                      </StaticLink>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="p-10 border-t border-s-brd bg-surf-bg transition-colors duration-500">
          <div className="flex items-center gap-4">
            <Activity size={14} className="text-photon-gold/40" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-p-txt opacity-40 uppercase">
                Engine_Status
              </span>
              <span className="text-[10px] text-s-txt font-bold tracking-widest uppercase">
                Optimized_V2
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative overflow-y-auto h-screen custom-scrollbar transition-colors duration-500 grid-texture bg-p-bg pt-16 lg:pt-0">
        <div className="max-w-5xl py-24 px-12 md:px-24 mx-auto pb-4">
          <div className="mb-12 flex items-center gap-2 text-[10px] font-bold text-m-txt opacity-70 tracking-widest uppercase">
            <StaticLink href="/" className="hover:text-photon-gold transition-colors text-p-txt">
              HOME
            </StaticLink>
            <span>/</span>
            <span className="text-p-txt">{currentId || 'DOCS'}</span>
          </div>
          {children}
        </div>
        <Footer lang={currentLang as 'en' | 'zh-TW'} />
      </main>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-40 px-4 backdrop-blur-sm bg-black/60"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl p-8 border border-b-brd bg-surf-bg shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6 text-[10px] text-p-txt opacity-40 tracking-[0.4em]">
                <Terminal size={12} /> SEARCH_EXECUTE_COMMAND
              </div>
              <div className="flex items-center gap-4">
                <span className="text-photon-gold font-black text-xl">{'>'}</span>
                <input
                  type="text"
                  placeholder="QUERY_THE_ENGINE..."
                  className="bg-transparent border-none outline-none font-mono text-xl w-full text-p-txt placeholder:opacity-20"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,184,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-photon-gold); }
      `}</style>
    </div>
  )
}
