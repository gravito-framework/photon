import {
  Database,
  HardDrive,
  Layers,
  Layout,
  Mail,
  Network,
  Radio,
  Search,
  Shield,
  Snowflake,
  Workflow,
  Zap,
} from 'lucide-react'

export interface Orbit {
  name: string
  package: string
  description: string
  icon: any
  type: 'OFFICIAL' | 'THIRD_PARTY'
  link?: string
  features: string[]
  metrics?: { label: string; value: string }
}

export const getOrbits = (lang: 'en' | 'zh-TW', t: any): Orbit[] => {
  const isZh = lang === 'zh-TW'
  return [
    {
      name: 'Sentinel',
      package: '@gravito/sentinel',
      description: isZh
        ? '先進的身份驗證與授權核心。支援 JWT、OAuth2 和 RBAC。'
        : 'Advanced authentication and authorization kernel. JWT, OAuth2, and RBAC support.',
      icon: Shield,
      type: 'OFFICIAL',
      features: isZh
        ? ['JWE 支援', '會話防護', '角色管理']
        : ['JWE Support', 'Session Shield', 'Role Management'],
      metrics: { label: t.metrics.latency, value: '< 0.05ms' },
    },
    {
      name: 'Atlas',
      package: '@gravito/atlas',
      description: isZh
        ? 'Active Record ORM。支援 PostgreSQL、MySQL、SQLite、MongoDB 和 Redis。'
        : 'Active Record ORM. Supports PostgreSQL, MySQL, SQLite, MongoDB, and Redis.',
      icon: Database,
      type: 'OFFICIAL',
      features: isZh
        ? ['Eloquent 風格', '多資料庫支援', '遷移與 Seed']
        : ['Eloquent-style', 'Multi-DB Support', 'Migrations & Seeders'],
      metrics: { label: t.metrics.queries, value: '1.2M+' },
    },
    {
      name: 'Prism',
      package: '@gravito/prism',
      description: isZh
        ? '具有 Blade 風格語法和預編譯渲染的原生模板引擎。'
        : 'Native template engine with Blade-inspired syntax and pre-compiled rendering.',
      icon: Layout,
      type: 'OFFICIAL',
      features: isZh
        ? ['邏輯區塊', '佈局 Yields', '高速 JIT']
        : ['Logic Blocks', 'Layout Yields', 'High-Speed JIT'],
      metrics: { label: t.metrics.render, value: '0.01ms' },
    },
    {
      name: 'Ion',
      package: '@gravito/ion',
      description: isZh
        ? 'Inertia.js 的內部 SPA 橋樑。輕鬆構建現代單體應用。'
        : 'Internal SPA Bridge for Inertia.js. Build modern monoliths easily.',
      icon: Zap,
      type: 'OFFICIAL',
      features: isZh
        ? ['共享狀態', '握手協議', '資產版本控制']
        : ['Shared State', 'Handshake Protocol', 'Asset Versioning'],
      metrics: { label: t.metrics.ttfb, value: '8ms (Edge)' },
    },
    {
      name: 'Stasis',
      package: '@gravito/stasis',
      description: isZh
        ? '智慧型多級快取系統。支援記憶體、檔案和 Redis 驅動。'
        : 'Smart multi-level cache system. Supports memory, file, and Redis drivers.',
      icon: HardDrive,
      type: 'OFFICIAL',
      features: isZh
        ? ['多級快取', '標籤支援', '分散式鎖']
        : ['Multi-Level Cache', 'Tags', 'Distributed Locks'],
      metrics: { label: t.metrics.throughput, value: '2.4M/s' },
    },
    {
      name: 'Signal',
      package: '@gravito/signal',
      description: isZh
        ? '專業級郵件發送系統。支援 SMTP、AWS SES 和多種渲染器。'
        : 'Professional-grade mail delivery system. Supports SMTP, AWS SES, and multiple renderers.',
      icon: Mail,
      type: 'OFFICIAL',
      features: isZh
        ? ['多驅動支援', 'React/Vue 渲染', '開發模式 UI']
        : ['Multi-Driver', 'React/Vue Renderers', 'Dev UI'],
    },
    {
      name: 'Ripple',
      package: '@gravito/ripple',
      description: isZh
        ? '基於 WebSockets 的實時通訊模組。實現瞬時數據同步。'
        : 'WebSocket-based real-time communication module. Instant data synchronization.',
      icon: Radio,
      type: 'OFFICIAL',
      features: isZh
        ? ['即時廣播', '頻道管理', '事件驅動']
        : ['Real-time Broadcast', 'Channel Management', 'Event-Driven'],
    },
    {
      name: 'Freeze',
      package: '@gravito/freeze',
      description: isZh
        ? '靜態網站生成器。為您的應用提供極致的載入性能與 SEO。'
        : 'Static Site Generator. Ultimate loading speed and SEO for your applications.',
      icon: Snowflake,
      type: 'OFFICIAL',
      features: isZh
        ? ['預渲染', 'i18n 支援', '自動 Sitemap']
        : ['Pre-rendering', 'i18n Support', 'Auto Sitemap'],
    },
    {
      name: 'Beam',
      package: '@gravito/beam',
      description: isZh
        ? '輕量級客戶端通訊工具。為前端提供類型安全的 API 調用介面。'
        : 'Lightweight client communication tool. Type-safe API call interfaces for frontend.',
      icon: Network,
      type: 'OFFICIAL',
      features: isZh
        ? ['類型安全', 'RPC 風格', '自動生成']
        : ['Type-Safe', 'RPC-Style', 'Auto-Generated'],
    },
    {
      name: 'Stream',
      package: '@gravito/stream',
      description: isZh
        ? '高效能工作佇列。支援多驅動與內嵌或獨立 worker。'
        : 'High-performance job queues. Multi-driver support with embedded or standalone workers.',
      icon: Workflow,
      type: 'OFFICIAL',
      features: isZh
        ? ['多驅動支援', '重試機制', '優先級佇列']
        : ['Multi-Driver', 'Retry Logic', 'Priority Queues'],
    },
    {
      name: 'Chromatic',
      package: '@gravito/chromatic',
      description: isZh
        ? '專為 Bun 打造的原生色彩管理引擎。提供自動色彩深度檢測與 WCAG 驗證。'
        : 'Native Bun color management engine. Automatic depth detection and WCAG validation.',
      icon: Layers,
      type: 'OFFICIAL',
      features: isZh
        ? ['Truecolor 支援', '語義化主題', '無依賴設計']
        : ['Truecolor Support', 'Semantic Themes', 'Zero-Deps'],
      metrics: { label: t.metrics.latency, value: '< 0.01ms' },
    },
    {
      name: 'Resilience',
      package: '@gravito/resilience',
      description: isZh
        ? '企業級韌性模式套件。提供斷路器、背壓控制與重試策略。'
        : 'Enterprise resilience patterns. Circuit breakers, backpressure, and retry strategies.',
      icon: Shield,
      type: 'OFFICIAL',
      features: isZh
        ? ['斷路器 V2', '背壓管理', '自動負載捨棄']
        : ['Circuit Breaker V2', 'Backpressure', 'Load Shedding'],
      metrics: { label: t.metrics.latency, value: '< 0.1ms' },
    },
    {
      name: 'Luminosity',
      package: '@gravito/luminosity',
      description: isZh
        ? 'SEO 智慧引擎。自動管理 Meta 數據與搜尋引擎索引優化。'
        : 'SEO smart engine. Automatically manages meta data and search engine indexing optimizations.',
      icon: Search,
      type: 'OFFICIAL',
      features: isZh
        ? ['自動 Meta', 'Sitemap 生成', 'Open Graph']
        : ['Auto Meta', 'Sitemap Generation', 'Open Graph'],
    },
  ]
}
