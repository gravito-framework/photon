export interface LangToggleProps {
  currentLang: 'en' | 'zh-TW'
  toggleLanguage: () => void
  title?: string
  className?: string
}

export function LangToggle({
  currentLang,
  toggleLanguage,
  title,
  className = '',
}: LangToggleProps) {
  return (
    <button type="button" onClick={toggleLanguage} className={className} title={title}>
      <span className="text-[10px] font-bold font-technical group-hover:scale-110 transition-transform">
        {currentLang === 'en' ? '繁' : 'EN'}
      </span>
    </button>
  )
}
