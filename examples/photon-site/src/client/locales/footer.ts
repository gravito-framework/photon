import type { TranslationMap } from './types'

export interface FooterTranslations {
  tagline: string
  version: string
  license: string
  ecosystem_nodes: string
  protocol_resources: string
  external_links: string
  privacy_policy: string
  terms_of_use: string
  architecture_patterns: string
  ecosystem_registry: string
  documentation: string
  protocol_stable: string
  desc_1: string
  desc_2: string
  ecosystem_part: string
}

export const footerTranslations: TranslationMap<FooterTranslations> = {
  en: {
    tagline: 'PHOTON_ENGINE',
    desc_1: 'The high-performance, zero-copy orchestration engine.',
    desc_2: 'Invisible. Atomic. Absolute.',
    license: 'Licensed_MIT',
    version: 'v1.0.0_GALAXY',
    protocol_stable: 'Protocol_Stable',
    ecosystem_part: 'Part_of_the_Ecosystem',
    ecosystem_nodes: 'ECOSYSTEM_NODES',
    protocol_resources: 'PROTOCOL_RESOURCES',
    external_links: 'EXTERNAL_LINKS',
    privacy_policy: 'Privacy Policy',
    terms_of_use: 'Terms of Use',
    architecture_patterns: 'Architecture Patterns',
    ecosystem_registry: 'Ecosystem Registry',
    documentation: 'Documentation',
  },
  'zh-TW': {
    tagline: 'PHOTON_核心引擎',
    desc_1: '高性能、零拷貝的協調引擎。',
    desc_2: '隱形。原子。絕對。',
    license: 'MIT_授權',
    version: 'v1.0.0_銀河',
    protocol_stable: '協議_穩定',
    ecosystem_part: '生態系統的一部份',
    ecosystem_nodes: '生態系統_節點',
    protocol_resources: '協議_資源',
    external_links: '外部_連結',
    privacy_policy: '隱私政策',
    terms_of_use: '使用條款',
    architecture_patterns: '架構模式',
    ecosystem_registry: '生態系統註冊表',
    documentation: '技術文件',
  },
}
