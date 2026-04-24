import type { TranslationMap } from './types'

export interface HomeTranslations {
  head_title: string
  switch_lang_tip: string
  switch_theme_tip: string
  navbar: {
    docs: string
    ecosystem: string
    patterns: string
    benchmarks: string
  }
  docs: string
  scroll: string
  intro: string
  quickstart: string
  usage: string
  launch: string
  aot: string
  aot_desc: string
  middleware: string
  middleware_desc: string
  near_zero: string
  overhead: string
  desc_p1: string
  desc_p2: string
  desc_p3: string
  view_metrics: string
  master: string
  docs_intro: string
  docs_desc: string
  ready: string
  start_reading: string
  stats: { label: string; unit: string }[]
  telemetry: {
    title: string
    initializing: string
    warmup: string
    targeting: string
    result: string
  }
}

export const homeTranslations: TranslationMap<HomeTranslations> = {
  en: {
    head_title: 'PHOTON // THE ABSOLUTE ENGINE',
    switch_lang_tip: 'Switch to Traditional Chinese',
    switch_theme_tip: 'Toggle Theme',
    navbar: {
      docs: 'Docs',
      ecosystem: 'Ecosystem',
      patterns: 'Patterns',
      benchmarks: 'Benchmarks',
    },
    docs: 'Documentation_',
    scroll: 'Scroll_to_explore',
    intro: 'Introduction',
    quickstart: 'Quickstart',
    usage: 'Why Photon?',
    launch: '60s to launch',
    aot: 'AOT Routing',
    aot_desc: 'O(1) Dispatch',
    middleware: 'Middleware',
    middleware_desc: 'Async Chains',
    near_zero: 'Near-Zero',
    overhead: 'Overhead.',
    desc_p1: 'Generic shims cost 15-20%, while dynamic proxies can add massive overhead.',
    desc_p2:
      'Photon is engineered to be invisible. By eliminating Proxy-based interception, we achieved',
    desc_p3: "of Bun's native throughput baseline.",
    view_metrics: 'View Detailed Metrics',
    master: 'Master the Engine.',
    docs_intro: 'Docs_',
    docs_desc:
      'Our documentation is more than just a reference. It is a technical deep-dive into zero-copy memory management, AOT compilation, and non-blocking I/O.',
    ready: '// READY_FOR_DEEP_LEARNING',
    start_reading: 'Start Reading Documentation',
    stats: [
      { label: 'THROUGHPUT', unit: 'req/s' },
      { label: 'LATENCY_P50', unit: 'ms' },
      { label: 'OVERHEAD_VS_NATIVE', unit: '%' },
    ],
    telemetry: {
      title: 'Internal_Telemetry_Log',
      initializing: 'INITIALIZING BASELINE_RUNNER...',
      warmup: 'JIT_FTL_WARMUP: COMPLETED (320ms)',
      targeting: 'TARGETING: APPLE_M3_SILICON',
      result: 'RESULT: 99.2%_OF_NATIVE_BUN_THROUGHPUT',
    },
  },
  'zh-TW': {
    head_title: 'PHOTON // 絕對引擎',
    switch_lang_tip: '切換至繁體中文',
    switch_theme_tip: '切換主題模式',
    navbar: {
      docs: '文件',
      ecosystem: '生態系統',
      patterns: '設計模式',
      benchmarks: '基準測試',
    },
    docs: '技術文件_',
    scroll: '滑動探索',
    intro: '介紹',
    quickstart: '快速開始',
    usage: '為什麼選擇 Photon?',
    launch: '60秒啟動',
    aot: 'AOT 路由',
    aot_desc: 'O(1) 調度',
    middleware: '中介軟體',
    middleware_desc: '非同步鏈',
    near_zero: '幾近零',
    overhead: '開銷。',
    desc_p1: '通用墊片 (Shims) 與動態代理 (Proxy) 通常會造成顯著的效能損耗。',
    desc_p2: 'Photon 專為隱形而生。透過消除 Proxy 代理攔截技術，我們達到了',
    desc_p3: 'Bun 原生吞吐量基準的 99.2%。',
    view_metrics: '查看詳細指標',
    master: '精通引擎。',
    docs_intro: '文件_',
    docs_desc:
      '我們的文件不僅僅是參考手冊。它是關於零拷貝記憶體管理、AOT 編編譯和非阻塞 I/O 的技術深度探討。',
    ready: '// 深度學習就緒',
    start_reading: '開始閱讀文件',
    stats: [
      { label: '吞吐量', unit: '次 / 秒' },
      { label: '延遲 (P50)', unit: '毫秒' },
      { label: '核心開銷', unit: '%' },
    ],
    telemetry: {
      title: '內部遙測日誌',
      initializing: '正在初始化基準測試器...',
      warmup: 'JIT_FTL 預熱：已完成 (320ms)',
      targeting: '目標架構：APPLE_M3_SILICON',
      result: '結果：達到了 99.2% 的原生 Bun 吞吐量',
    },
  },
}
