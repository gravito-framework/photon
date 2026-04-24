import type { TranslationMap } from './types'

export interface LegalTranslations {
  head_title: string
  breadcrumb: string
  compliance: string
  mod_id: string
  last_update: string
  disclaimer_title: string
  disclaimer_text: string
}

export const legalTranslations: TranslationMap<LegalTranslations> = {
  en: {
    head_title: 'LEGAL_PROTOCOL',
    breadcrumb: 'HOME',
    compliance: 'LEGAL_COMPLIANCE_v1.0',
    mod_id: 'MOD_ID',
    last_update: 'LAST_UPDATE',
    disclaimer_title: 'Legal Disclaimer',
    disclaimer_text:
      'This document is part of the Gravito Research Labs legal framework. Photon Engine is provided "as is" without warranty. For specific commercial licensing, please contact our enterprise relations module.',
  },
  'zh-TW': {
    head_title: '法律協議協定',
    breadcrumb: '首頁',
    compliance: '法律合規性_v1.0',
    mod_id: '模組編號',
    last_update: '最後更新',
    disclaimer_title: '法律免責聲明',
    disclaimer_text:
      '本文件屬 Gravito 研究實驗室法律框架之一部分。Photon Engine 按「原樣」提供，不提供任何保證。如需特定的商業授權，請聯繫我們的企業關係模組。',
  },
}
