import type { TranslationMap } from './types'

export interface EcosystemTranslations {
  head_title: string
  breadcrumb: string
  title: string
  subtitle: string
  intro: string
  core_engine: string
  core_desc: string
  view_docs: string
  satellite_modules: string
  satellite_desc: string
  coming_soon: string
  adapter_layer: string
  adapter_desc: string
  registry_title: string
  registry_desc: string
  registryDocs: string
  typeLabel: string
  orbitType: Record<string, string>
  copied: string
  install: string
  buildTitle: string
  buildDesc: string
  metricsHeader: string
  metrics: {
    latency: string
    queries: string
    render: string
    ttfb: string
    throughput: string
    total_pulls: string
    active_nodes: string
    security_score: string
    global_latency: string
  }
}

export const ecosystemTranslations: TranslationMap<EcosystemTranslations> = {
  en: {
    head_title: 'Orbits Ecosystem',
    breadcrumb: 'HOME',
    title: 'Ecosystem',
    subtitle:
      'Photon is an atomic core. Extend its capabilities using Orbits—plug-and-play modules designed for the Gravito framework.',
    intro: 'INTRO',
    core_engine: 'Core Engine',
    core_desc: 'The absolute core of Photon. Optimized for M3 silicon and raw dispatch speed.',
    view_docs: 'VIEW_DOCS',
    satellite_modules: 'Satellite Modules',
    satellite_desc: 'Extending Photon with database adapters, queue workers, and real-time events.',
    coming_soon: 'COMING_SOON',
    adapter_layer: 'Adapter Layer',
    adapter_desc: 'Connect Photon to serverless environments or legacy Node.js infrastructure.',
    registry_title: 'Registry',
    registry_desc: 'The official registry for Photon extensions and community modules.',
    registryDocs: 'Registry Documentation',
    typeLabel: 'Type',
    orbitType: { OFFICIAL: 'OFFICIAL', THIRD_PARTY: 'THIRD_PARTY' },
    copied: 'Copied_to_Clipboard',
    install: 'Install_Shell',
    buildTitle: 'Build Your Own',
    buildDesc:
      'Have a micro-service or utility that benefits the Gravito ecosystem? Join the registry and provide atomic power to thousands of nodes.',
    metricsHeader: 'CORE_METRICS',
    metrics: {
      latency: 'Latency',
      queries: 'Queries/s',
      render: 'Render',
      ttfb: 'TTFB',
      throughput: 'Throughput',
      total_pulls: 'TOTAL_PULLS',
      active_nodes: 'ACTIVE_NODES',
      security_score: 'SECURITY_SCORE',
      global_latency: 'GLOBAL_LATENCY',
    },
  },
  'zh-TW': {
    head_title: 'Orbits 生態系統',
    breadcrumb: '首頁',
    title: '生態系統',
    subtitle:
      'Photon 是一個原子核心。使用 Orbits 擴展其功能——專為 Gravito 框架設計的隨插即用模組。',
    intro: '介紹',
    core_engine: '核心引擎',
    core_desc: 'Photon 的絕對核心。針對 M3 晶片和原生調度速度進行了優化。',
    view_docs: '查看文件',
    satellite_modules: '衛星模組',
    satellite_desc: '使用資料庫適配器、隊列工作程序和即時事件擴展 Photon。',
    coming_soon: '即將推出',
    adapter_layer: '適配器層',
    adapter_desc: '將 Photon 連接到無伺服器環境或舊版 Node.js 基礎設施。',
    registry_title: '註冊表',
    registry_desc: 'Photon 擴展和社群模組的官方註冊表。',
    registryDocs: '註冊表文件',
    typeLabel: '類型',
    orbitType: { OFFICIAL: '官方', THIRD_PARTY: '第三方' },
    copied: '已複製到剪貼簿',
    install: '安裝 Shell',
    buildTitle: '構建您自己的',
    buildDesc:
      '擁有一個對 Gravito 生態系統有益的微服務或實用程序？加入註冊表，為數千個節點提供原子動力。',
    metricsHeader: '核心指標',
    metrics: {
      latency: '延遲',
      queries: '查詢 / 秒',
      render: '渲染',
      ttfb: '首位元組時間',
      throughput: '吞吐量',
      total_pulls: '總下載量',
      active_nodes: '活動節點',
      security_score: '安全審核',
      global_latency: '全球延遲',
    },
  },
}
