import type { TranslationMap } from './types'

export interface LabTranslations {
  title: string
  subtitle: string
  btn_active: string
  btn_start: string
  route_count: string
  middleware_layers: string
  photon_core: string
  bun_native_adapter: string
  generic_engine: string
  efficiency_prefix: string
  efficiency_suffix: string
  init: string
}

export const labTranslations: TranslationMap<LabTranslations> = {
  en: {
    title: 'The Stress Lab',
    subtitle:
      'Adjust the complexity parameters to simulate how BunNativeAdapter and Photon maintain throughput under heavy architectural loads.',
    btn_active: 'SYSTEM_STRESS_ACTIVE',
    btn_start: 'START_SIMULATION',
    route_count: 'Route_Count',
    middleware_layers: 'Middleware_Layers',
    photon_core: 'PHOTON_CORE',
    bun_native_adapter: 'BUN_NATIVE_ADAPTER',
    generic_engine: 'GENERIC_ENGINE',
    efficiency_prefix: '// PERFORMANCE_ADVANTAGE: ',
    efficiency_suffix: '% HIGHER_THROUGHPUT',
    init: '// INITIALIZING_COMPARATIVE_STRESS_TEST',
  },
  'zh-TW': {
    title: '效能壓力實驗室',
    subtitle: '調整複雜度參數，模擬 BunNativeAdapter 與 Photon 在高負載架構下的吞吐量表現。',
    btn_active: '系統壓力測試中',
    btn_start: '開始模擬測試',
    route_count: '路由數量',
    middleware_layers: '中介軟體層級',
    photon_core: 'PHOTON 核心',
    bun_native_adapter: 'BUN NATIVE 適配器',
    generic_engine: '通用引擎',
    efficiency_prefix: '// 性能優勢：領跑 ',
    efficiency_suffix: '% 的吞吐量',
    init: '// 正在初始化比較壓力測試',
  },
}
