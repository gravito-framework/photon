import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'

export interface ThemeToggleProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  title?: string
  className?: string
}

export function ThemeToggle({ theme, toggleTheme, title, className = '' }: ThemeToggleProps) {
  return (
    <button type="button" onClick={toggleTheme} className={className} title={title}>
      <AnimatePresence mode="wait">
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            className="group-hover:scale-110 transition-transform"
          >
            <Sun size={16} />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            className="group-hover:scale-110 transition-transform"
          >
            <Moon size={16} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
