export type Locale = 'en' | 'zh-TW'

export interface TranslationMap<T> {
  en: T
  'zh-TW': T
}

export function getTranslation<T>(map: TranslationMap<T>, lang: string): T {
  return map[lang as Locale] || map.en
}
