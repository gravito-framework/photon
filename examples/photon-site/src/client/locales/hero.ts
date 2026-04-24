import type { TranslationMap } from './types'

export interface HeroTranslations {
  headline_1: string
  headline_2: string
  tagline: string
  sub_tagline: string
  build_target: string
  protocol: string
  cluster_mode: string
  badge: string
  status_dispatch: string
  status_aot: string
  status_mem: string
}

export const heroTranslations: TranslationMap<HeroTranslations> = {
  en: {
    headline_1: 'The Absolute',
    headline_2: 'Engine.',
    tagline: 'A high-performance web kernel for Bun.',
    sub_tagline: 'Built for raw speed, zero-copy safety, and sub-millisecond dispatch.',
    build_target: 'Build_Target',
    protocol: 'Protocol',
    cluster_mode: 'Cluster_Mode',
    badge: 'System_Beta_Initialize',
    status_dispatch: 'CORE_DISPATCH_ENABLED',
    status_aot: 'AOT_OPTIMIZATION_ACTIVE',
    status_mem: 'MEM_SAFETY_VERIFIED',
  },
  'zh-TW': {
    headline_1: 'The Absolute',
    headline_2: 'Engine.',
    tagline: '專為 Bun 打造的高性能 Web 核心。',
    sub_tagline: '專注於極速、零拷貝安全性及亞毫秒級調度。',
    build_target: '構建目標',
    protocol: '協定',
    cluster_mode: '叢集模式',
    badge: '系統核心 Beta 初始化',
    status_dispatch: '核心調度已啟用',
    status_aot: 'AOT_優化中',
    status_mem: '記憶體安全性已驗證',
  },
}
